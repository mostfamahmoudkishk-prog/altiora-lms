# Altiora Disaster Recovery & Security Recovery Report

This document outlines the disaster recovery procedures, database backup and restore commands, emergency access procedures, and credential management tools for Altiora.

---

## 1. System Health Verification
To check the current health status of the application components, query the dedicated `/health` route. It performs local query executions and file system write operations to determine state:

*   **Endpoint**: `GET /health`
*   **Response Format**: JSON
    ```json
    {
      "database": "healthy",
      "storage": "healthy",
      "uptime": 1234.56,
      "timestamp": "2026-06-16T04:30:00.000Z"
    }
    ```

If any status returns `"unhealthy"`, review the logs immediately.

---

## 2. Database Backups & Recovery Runbook

All database backups are stored in the local file system under `./private/backups/`.

### Manual Backup Creation
Run the backup script to compile a JSON file representation of the store:
```bash
# Execute local database backup
bun run prisma db seed
# Or if utilizing local store service
bun run src/lib/api/simulation.functions.ts
```

### Database Restore Procedure
To restore the database to a clean, seeded state:
```bash
# 1. Clear database models
npx prisma db push --force-reset

# 2. Re-apply seeds and core settings
npx prisma db seed
```

---

## 3. Emergency Super-Admin Bypass
In the event that the authentication provider is down or administrative access is locked, use the emergency credentials seed script:

1.  Open `.env` in the root folder.
2.  Locate the admin seed credentials:
    *   `ADMIN_EMAIL=admin@altiora.edu`
    *   `ADMIN_PASSWORD=AltioraAdminSecure2026!`
3.  Execute seed to restore default administrative role to this account:
    ```bash
    npx prisma db seed
    ```

---

## 4. Emergency Simulation Session Termination
If a simulation session is hijacked or remains active indefinitely, execute simulation termination:

*   **Via UI**: Click **إنهاء المحاكاة (Exit Simulation)** on the top-right banner.
*   **Via Database**: Delete active simulation sessions:
    ```sql
    UPDATE "SimulationSession" SET "isActive" = false WHERE "isActive" = true;
    ```
*   **Via Session Storage**: Clear the browser storage inside the active student session:
    ```javascript
    sessionStorage.clear();
    localStorage.removeItem("altiora_simulation_session");
    ```

---

## 5. Security Recovery Checklist
In case of a security breach:
1.  **Revoke Active Sessions**: Run the SQL query to revoke all user sessions:
    ```sql
    UPDATE "UserSession" SET "status" = 'REVOKED', "revoked_at" = NOW() WHERE "status" = 'ACTIVE';
    ```
2.  **Reset CSRF Tokens**: Clear client cookies:
    ```javascript
    document.cookie = "altiora_csrf_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    ```
3.  **Inspect Audit Logs**: Check logs under `./private/logs/security_audit.log` or check the database table `AuditLog` for anomalous actions.
