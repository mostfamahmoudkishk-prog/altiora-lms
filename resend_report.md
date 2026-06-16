# Resend Transactional Email Service Integration Report

This report outlines the design, API methods, and beautiful black-and-gold styled templates implemented for transactional email dispatching in Altiora.

---

## 1. Environment Configurations

Resend integration is powered entirely by the environment variables:
*   `RESEND_API_KEY`: API access key used to authenticate headers via Bearer token (`Authorization: Bearer <apiKey>`).
*   **Sender Address**: All emails are dispatched from `Altiora Academy <noreply@altiora.academy>` which is configured inside `sendEmail`.

---

## 2. API Design & Lightweight Client

The [resend.ts](file:///d:/%D9%85%D8%B5%D8%B7%D9%81%D9%89/altiora-path-forward-main/altiora-path-forward-main/src/lib/resend.ts) module provides a lightweight REST abstraction over native `fetch`:
*   **Zero Dependencies**: Bypasses the need for heavy Node.js SMTP/SDK modules, which keeps server bundler size tiny and avoids ESM resolution issues.
*   **API Payload**: Performs POST requests targeting `https://api.resend.com/emails`. Handles recipient lists, custom HTML bodies, subjects, and text fallbacks.

---

## 3. Beautiful Brand-Aligned HTML Templates

Altiora emails utilize a premium, customized HTML wrapper that aligns with the application's signature **Luxury Black & Gold theme**:
*   **Primary Background**: Dark aesthetic (`#0b0f19` and `#111827`).
*   **Typography**: Clean sans-serif, system-ui fallback stack.
*   **Brand Highlight**: Premium Gold accents (`#f59e0b`).
*   **Directionality**: RTL (`direction: rtl`) structure for complete Arabic language layout support.

---

## 4. Operational Methods

The library exposes dedicated helper methods:
*   `sendWelcomeEmail(email, name)`: Dispatched upon successful sign-up. Greets the student and guides them to browse courses.
*   `sendVerificationEmail(email, code)`: Dispatched for dual-factor verification or sign-up activation. Displays a highlighted 6-digit monospace verification code valid for 15 minutes.
*   `sendPasswordResetEmail(email, token)`: Dispatched when password recovery is requested. Delivers a secure link containing the session token to set a new password.
*   `sendSystemNotificationEmail(email, title, message)`: Dispatched for critical admin alerts, course announcements, or grading releases.
