# ADA Platform Agent Plan

This file is the authoritative execution queue for turning this project into a fully featured ADA platform for FASTSIGNS franchisees.

## Continue Protocol (Required)
1. Execute the lowest-ID step in `TODO` state from `/Users/jacob/Projects/FS-braille/docs/agent-status.md`.
2. If the user says `continue`, run exactly one step end-to-end unless blocked.
3. If the user says `do ADA-0XX`, run only that step.
4. After each step, update `/Users/jacob/Projects/FS-braille/docs/agent-status.md` and `/Users/jacob/Projects/FS-braille/docs/decision-log.md`.
5. Response format after each step:
   - `Completed: ADA-0XX`
   - `Validation run: ...`
   - `Files changed: ...`
   - `Next ID: ADA-0YY`
6. If blocked, stop and report:
   - `Blocked ID: ADA-0XX`
   - `Reason: ...`
   - `Unblock options: ...`

## Global Done Criteria
1. Step output exists and is committed/documented.
2. Relevant tests/checks for that step were run.
3. Status tracker is updated.
4. Decision log entry exists (or `No decision` noted).

## Queue

### Phase 0: Agent Operating System
- ADA-001: Create `/Users/jacob/Projects/FS-braille/docs/agent-plan.md` with all IDs.
- ADA-002: Create `/Users/jacob/Projects/FS-braille/docs/agent-status.md` with status legend (`TODO/DOING/DONE/BLOCKED`).
- ADA-003: Create `/Users/jacob/Projects/FS-braille/docs/decision-log.md` template.
- ADA-004: Add session handoff template to `agent-status.md`.
- ADA-005: Add commit naming convention: `ADA-XXX: short description`.
- ADA-006: Add ADR index file at `/Users/jacob/Projects/FS-braille/docs/adr/README.md`.
- ADA-007: Write ADR-001 current architecture baseline.
- ADA-008: Write ADR-002 target architecture (multi-tenant ADA platform).
- ADA-009: Add environment variable matrix doc.
- ADA-010: Add CI baseline job for build and tests.

### Phase 1: Standards + Product Definition
- ADA-011: Create standards source registry doc with canonical URLs.
- ADA-012: Add ADA scoping requirement list with requirement IDs.
- ADA-013: Add ADA technical signage/braille requirement list with IDs.
- ADA-014: Add BANA signage guidance requirement list with IDs.
- ADA-015: Add WCAG 2.2 AA requirements for the app UI.
- ADA-016: Create requirement schema (`REQ-ID`, source, severity, citation, test).
- ADA-017: Build requirement-to-rule mapping table.
- ADA-018: Create FASTSIGNS sign taxonomy (types, contexts, exclusions).
- ADA-019: Create jurisdiction overlay model (federal/state/local/AHJ).
- ADA-020: Create role matrix (CSR, Designer, Proofreader, Production, Installer, Manager, Admin).
- ADA-021: Create workflow stage definitions and gate rules.
- ADA-022: Create exception/waiver policy model and approval matrix.
- ADA-023: Create audit/retention policy doc for job artifacts.
- ADA-024: Freeze v1 requirements baseline in `decision-log.md`.

### Phase 2: Data, Auth, Tenancy Foundation
- ADA-025: Add PostgreSQL local/dev setup.
- ADA-026: Add ORM/migration tooling setup.
- ADA-027: Create migration: `organizations`.
- ADA-028: Create migration: `franchises` and `locations`.
- ADA-029: Create migration: `users`.
- ADA-030: Create migration: `memberships`.
- ADA-031: Create migration: `roles` and `permissions`.
- ADA-032: Seed default roles and permissions.
- ADA-033: Integrate authentication provider.
- ADA-034: Build session-to-user resolver middleware.
- ADA-035: Build tenant context resolver middleware.
- ADA-036: Build RBAC authorization guard utility.
- ADA-037: Create migration: `audit_events` (append-only).
- ADA-038: Implement centralized audit writer service.
- ADA-039: Create migration: `projects`.
- ADA-040: Create migration: `jobs`.
- ADA-041: Create migration: `signs`.
- ADA-042: Create migration: `sign_revisions`.
- ADA-043: Create migration: `artifacts`.
- ADA-044: Create migration: `workflow_events`.
- ADA-045: Create migration: `notifications`.
- ADA-046: Implement repository/data-access layer for core entities.
- ADA-047: Implement API error envelope and validation helpers.
- ADA-048: Add health/readiness endpoints.
- ADA-049: Add auth + tenancy boundary integration tests.
- ADA-050: Add seed script for demo org/franchise/users.

### Phase 3: Core Job Workspace
- ADA-051: Add app shell for multi-page workflow.
- ADA-052: Add organization/location switcher UI.
- ADA-053: Build projects list + create page.
- ADA-054: Build jobs list + create page.
- ADA-055: Build job detail page with sign table.
- ADA-056: Build sign create/edit form.
- ADA-057: Extract current braille translation logic into service module.
- ADA-058: Add translation API endpoint backed by service module.
- ADA-059: Persist translation output + metadata hash per revision.
- ADA-060: Add autosave for sign editing.
- ADA-061: Add optimistic concurrency conflict handling.
- ADA-062: Add revision timeline API.
- ADA-063: Add revision diff UI.
- ADA-064: Add intake completeness checklist model/API.
- ADA-065: Add intake checklist UI with gating hints.
- ADA-066: Create template library tables and CRUD API.
- ADA-067: Build template library UI and apply-to-sign flow.
- ADA-068: Add search/filter/sort across projects/jobs/signs.
- ADA-069: Add in-app notification center.
- ADA-070: Add end-to-end test: create job -> add sign -> translate -> save revision.

### Phase 4: Rules Engine + Compliance Workflow
- ADA-071: Define rule engine interface (input/output/trace contract).
- ADA-072: Implement evaluator runtime with deterministic ordering.
- ADA-073: Implement rule-pack loader (versioned packs).
- ADA-074: Encode ADA scoping rules pack v1.
- ADA-075: Encode ADA technical signage/braille rules pack v1.
- ADA-076: Encode BANA advisory rules pack v1.
- ADA-077: Implement jurisdiction overlay loading and merge rules.
- ADA-078: Implement finding citation schema and storage.
- ADA-079: Implement deterministic trace payload persistence.
- ADA-080: Add compliance evaluation API.
- ADA-081: Run evaluation automatically on sign save and translation.
- ADA-082: Enforce BLOCK findings as workflow gate.
- ADA-083: Add remediation hint generator service.
- ADA-084: Create override request table/API.
- ADA-085: Create override approval table/API.
- ADA-086: Build findings + remediation + override UI.
- ADA-087: Add regression fixtures for rule outcomes.
- ADA-088: Add snapshot tests for deterministic traces.
- ADA-089: Pin and tag rule pack version `v1.0.0`.
- ADA-090: Compliance module signoff checkpoint.

### Phase 5: Proofing + Approvals
- ADA-091: Create proof packet domain model and storage.
- ADA-092: Add packet generation worker queue.
- ADA-093: Implement SVG packet template v2 with embedded metadata.
- ADA-094: Implement PDF proof packet template.
- ADA-095: Implement JSON machine-readable proof artifact.
- ADA-096: Add packet generation API endpoint.
- ADA-097: Add dual-proofread assignment model.
- ADA-098: Build proofread/signoff UI.
- ADA-099: Implement workflow state machine transitions.
- ADA-100: Implement SLA timers + escalation notifications.
- ADA-101: Enforce unresolved finding gate before production-ready.
- ADA-102: Build audit/exception export (CSV/PDF/JSON).
- ADA-103: Run end-to-end approval UAT script.

### Phase 6: Fabrication + Installation
- ADA-104: Create fabrication preset model/API.
- ADA-105: Build fabrication preset management UI.
- ADA-106: Implement production traveler generator.
- ADA-107: Implement vendor batch export adapters.
- ADA-108: Create install checklist model/API.
- ADA-109: Build mobile-friendly install checklist UI.
- ADA-110: Implement photo evidence upload/storage.
- ADA-111: Run post-install compliance verification.
- ADA-112: Implement reopen/rework loop.
- ADA-113: Generate installation closeout report artifact.

### Phase 7: Analytics, Hardening, Rollout
- ADA-114: Instrument lifecycle events (intake, fail/pass, overrides, rework, install).
- ADA-115: Build analytics ETL/job aggregation.
- ADA-116: Build KPI API (first-pass, rework, SLA, override rate).
- ADA-117: Build franchise dashboard UI.
- ADA-118: Build corporate/region dashboard UI.
- ADA-119: Build root-cause analytics for defects/rework.
- ADA-120: Run security threat model and remediate critical/high items.
- ADA-121: Implement backup/restore automation and run drill.
- ADA-122: Run load/performance tests on critical workflows.
- ADA-123: Run app accessibility audit and remediate P1/P2 issues.
- ADA-124: Prepare pilot tenant onboarding package.
- ADA-125: Launch pilot wave 1 (3-5 franchises).
- ADA-126: Collect pilot findings and triage defects.
- ADA-127: Execute remediation sprint.
- ADA-128: Launch pilot wave 2.
- ADA-129: Execute GA checklist and production cutover.
- ADA-130: Run 30-day stabilization review and publish v1 closeout report.
