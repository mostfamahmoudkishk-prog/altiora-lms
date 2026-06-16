# Exams System Audit Report - Altiora Platform

This report logs the audit and verification of the exams system, auto-grading engines, manual essay review dashboards, and anti-cheat logger utilities.

---

## 1. Core Models Audited

All exam components are managed in the database schema:
- **Exams**: `Exam`, `ExamSection`, `ExamVersion`.
- **Questions**: `Question` (supporting MCQ, TRUE_FALSE, SHORT_ANSWER, ESSAY types), `Choice`.
- **Attempts**: `ExamAttempt` (tracks scores, time parameters, and manual grade reviews), `ExamAttemptAnswer`, `EssayAnswer`.
- **Anti-Cheat**: `ExamViolation` (tracks tab switches, fullscreen escapes, window minimizes) and `AntiCheatEvent`.
- **Grading workflow**: `EssayReviewLog` and `ExamPublishLog`.

---

## 2. Integration Features Checklist

| Component / Flow | Status | Details |
| :--- | :---: | :--- |
| **MCQ Auto-Grading** | ✅ **VERIFIED** | Automatically cross-checks student submitted choices against correct options, calculates totals, and logs scores on attempt completion. |
| **Essay Manual Review** | ✅ **VERIFIED** | Provides teacher interface to view student essay answers, enter manual scores, add detailed feedback, and sign off grading. |
| **Grade Publishing** | ✅ **VERIFIED** | Tracks publish status (`isPublished`); results are released to student view and log entries are created in `ExamPublishLog`. |
| **Anti-Cheat Violations** | ✅ **VERIFIED** | Catches tab switches, minimizes, and window boundary crossings. Automatically persists violation events to `ExamViolation`. |
| **PDF Certificate Export** | ✅ **VERIFIED** | Generates exportable PDF files for completed exams and certificates using styled printable layouts. |

---

## 3. Findings & Auto-Repairs
- Reviewed auto-grading math inside `db.functions.ts` to ensure score calculations correspond to total points.
