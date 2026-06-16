# Socket.IO WebSocket Server Configuration Report

This report summarizes the design and implementation of the production-ready Socket.IO server enhancements in Altiora, specifically focused on authentication, room structuring, and reconnection durability.

---

## 1. Connection Authentication Middleware

To prevent unauthorized socket connections, we implemented an asynchronous Socket.IO connection middleware:
*   **Token Extraction**: The middleware extracts `altiora_session_id` from two potential sources:
    1.  The HTTP handshake `Cookie` header (`socket.handshake.headers.cookie`).
    2.  Handshake `auth` payload (`socket.handshake.auth?.sessionId` or `socket.handshake.query?.sessionId`).
*   **Prisma Session Verification**: The session token is validated against the `UserSession` table in the PostgreSQL database.
*   **Active Check**: The session status must be `ACTIVE` to authorize connection.
*   **Dev/Fallback Mode**: For development and testing environments, a fallback query/auth `userId` check is supported to query user details directly if cookies are unavailable.

```typescript
io.use(async (socket: Socket, next) => {
  // Authentication & Session Loading logic...
});
```

---

## 2. Dynamic Room Mapping

Once connection authentication succeeds, the socket automatically subscribes to distinct rooms. This allows surgical targeting of notifications and streaming signals:

| Room Pattern | Description | Trigger / Source |
| :--- | :--- | :--- |
| `user-${userId}` | Unique channel for individual student/teacher notifications | Handshake database query |
| `course-${courseId}` | Multi-cast channel for course-wide updates/broadcasts | Fetch enrolled courses from Prisma |
| `teacher-${teacherId}` | Target channel for notifications to specific instructors | Fetch instructor course mappings |
| `role-${role}` | Role-wide broadcasts (e.g. `role-TEACHER`, `role-STUDENT`) | User model role field |

---

## 3. Reconnection Logic & Resubscription

*   **State Integrity**: When a client loses connection (e.g., cell tower switch, network blip) and reconnects, Socket.IO triggers a new connection cycle.
*   **Automatic Handshake Re-run**: The connection goes back through the `io.use` authentication middleware to re-verify session status.
*   **Automatic Room Reconstruction**: In the `connection` listener, room memberships are dynamically rebuilt from the database. This guarantees that client sockets never lose their rooms after reconnection.
*   **Event Logging**: Explicit logs are written for both connection and disconnection events to track network status:
    *   *Connection Log*: `Socket connected: <socketId> (User: <userId>, Role: <role>)`
    *   *Disconnection Log*: `Socket disconnected: <socketId> (User: <userId>, Session: <sessionId>, Name: <name>)`
