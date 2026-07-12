# Token Management System — Implementation Plan

Full-stack implementation in **Next.js 16 (App Router)** — the existing app in `client/` serves both the frontend (React dashboards) and the backend (Route Handlers as the API layer). No separate server.

---

## 1. Tech Stack

| Concern | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16.2 (App Router, Turbopack) | Already scaffolded in `client/`; frontend + backend in one app |
| Language | TypeScript | Already configured |
| Styling | Tailwind CSS 4 | Already configured |
| Database | PostgreSQL via Prisma ORM | **Decision changed from SQLite/`node:sqlite`.** Typed schema + migrations; schema in `prisma/schema.prisma`, client generated to `lib/generated/prisma`, connection via `DATABASE_URL` |
| Excel parsing | `xlsx` (SheetJS 0.20.3) | Already installed; parses/generates `.xlsx`, pure JS |
| Auth | Session cookie + server-side sessions table | Simple, role-based; no external auth provider needed |
| Real-time updates | Client polling (2–4 s interval) on dashboards & display | Simplest reliable option for a single-store LAN app; can upgrade to SSE later |

---

## 2. Data Model (PostgreSQL via Prisma)

Mirrors the two-sheet Excel design (Orders ↔ Items as FK relationship). Source of truth is `prisma/schema.prisma`; summary:

```
User
  id (uuid pk), username (unique), password_hash, display_name, role, active
  role ∈ {ADMIN, PACKAGER, GREETER, RUNNER, CASHIER}

Sessions
  token (uuid pk), userId → User (cascade delete), created_at, expires_at

Orders
  id (uuid pk), order_id (unique, from Excel — the business key),
  customer_name, phone (string), bag_number (int, nullable),
  status, token_number (nullable), token_date (nullable),
  uploaded_at, updated_at, number_of_items
  -- number_of_items is STORED, set once at import (lines are never added/removed
     after upload); packed_count stays DERIVED from Order_Lines, never stored

Order_Lines
  id (uuid pk), order_ref_id → Orders, product_name, packed (boolean)

Tokens
  id (autoincrement pk) — this IS the token number, globally sequential,
  order_ref_id → Orders (UNIQUE — one token per order, ever),
  status ∈ {ACTIVE, CANCELLED}, issued_by → User, issued_date,
  cancelled_by (nullable) → User, cancelled_at (nullable)

Audit_Log
  id (uuid pk), at, user_id → User, username + role (snapshots at time of action),
  order_ref_id (nullable) → Orders, action, details (Json)
```

Connection via `DATABASE_URL` (`.env`, gitignored). Schema applied with `prisma migrate dev`; seeding via `prisma/seed.ts`.

**Seed data:** one user per role (`admin`, `packager`, `greeter`, `runner`, `cashier`) with default passwords, shown on the login page for demo purposes. Admin can add/deactivate users later.

---

## 3. Order Status Machine

Single status column, but conceptually two tracks (packing track + customer track) that merge at handover:

```
uploaded ──▶ packaging_pending ──▶ packed ─────────────┐
                    │                                  │
                    │  (customer may arrive            ▼
                    │   before packing done)    token_issued ──▶ handed_over_to_runner
                    └──────────────▶ token_issued       (requires ALL lines packed
                                                         + bag number set)
handed_over_to_runner ──▶ ready_for_pickup ──▶ delivered
```

Canonical statuses (`Status` enum in Prisma): `PACKAGING_PENDING`, `PACKAGED` (= packed), `TOKEN_ISSUED`, `HANDOVER` (= handed over to runner), `READY_FOR_PICKUP`, `DELIVERED`.

Resolved BRD ambiguities (decisions):
- **Customer Arrived + Token Issued** = one Greeter click → status `token_issued`; audit log records both events.
- **Handed Over to Cashier + Ready for Pickup** = one Runner click → status `ready_for_pickup` (order appears on display immediately, per BRD step 10); audit records "Handed Over to Cashier".
- **Uploaded** = transient; upload immediately lands on `packaging_pending` (any line unpacked) or `packed` (all lines packed).
- **Packager "Handed Over to Runner" vs Runner "Collected from Packager"** = same transition (`token_issued → handed_over_to_runner`); either role's button performs it, audit records who.

### Guardrails (enforced server-side)
- Token can be issued from `packaging_pending` **or** `packed` (customer may arrive early). One active token per order; one token per customer visit.
- `→ handed_over_to_runner` is **blocked** unless all lines packed **and** bag number present.
- Line packing toggles & bag-number edits allowed only **before** handover.
- Marking all lines packed flips `packaging_pending → packed` (and back if unticked) — only while in those two statuses.
- `→ delivered` only from `ready_for_pickup` (cashier verifies token first).
- Admin bypasses all of the above (skip workflow, override any stage, direct-to-cashier).

---

## 4. Token Rules

- Generated only on customer arrival (Greeter/Admin action), never at upload.
- **Globally sequential, no daily reset** (decision changed from the BRD's "recommended" daily reset): the token number is the `Tokens.id` autoincrement PK — the database hands out the next number atomically, no MAX+1 transaction needed. Numbers grow forever ("Token 4832" after months) — accepted trade-off.
- **One token per order, ever** (`order_ref_id` is UNIQUE on `Tokens`): the token and the order are bound 1:1 at issuance.
- Admin can cancel a token: token row → `CANCELLED`, order reverts to `PACKAGED`/`PACKAGING_PENDING`, token number cleared from order. If the customer later returns, the **same token is re-activated** (`CANCELLED` → `ACTIVE`, same number) — a second token row for the same order is impossible by design. Numbers are never reused **across orders** (autoincrement guarantees it).

---

## 5. Excel Upload (two-sheet workbook, FK style)

**Sheet "Orders"** — one row per order: `Order ID | Customer Name | Phone Number | Bag Number (optional)`
**Sheet "Items"** — one row per product: `Order ID | Product Name | Packed (Yes/No)`

Derived on import: number of items = count of item rows; status = all packed → `packed`, else `packaging_pending`.

### Validation (all-or-nothing import)
1. Both sheets present (matched by name), headers correct.
2. Order ID unique within Orders sheet **and** not already in DB.
3. Every Items row references an existing Orders row (no orphans).
4. Every order has ≥ 1 item row (no childless orders).
5. Mandatory cells non-empty; phone numeric; Packed ∈ {Yes, No}.

Any failure → nothing is imported; response lists every error with sheet + row number + reason (rendered in the UI, downloadable). Success → import summary (X orders, Y items, Z already-packed).

A **downloadable template** (`.xlsx` with both sheets, headers, 2 example rows) is generated server-side.

Post-upload, **the app is the source of truth**: packing ticks and bag numbers change via the Packager dashboard, not re-upload.

---

## 6. Auth & Permissions

- Login page → `POST /api/auth/login` → verify scrypt password hash → create session row → httpOnly cookie.
- Every API route + page resolves the session server-side; pages redirect to `/login`, APIs return 401/403.
- Central permission map (single source of truth):

| Action | Packager | Greeter | Runner | Cashier | Admin |
|---|:-:|:-:|:-:|:-:|:-:|
| Upload Excel | ✅ | | | | ✅ |
| Toggle line packed / mark all packed | ✅ | | | | ✅ |
| Edit bag number | ✅ | | | | ✅ |
| Search orders | ✅ | ✅ | | | ✅ |
| Generate token | | ✅ | | | ✅ |
| Hand over to runner / collect bag | ✅ | | ✅ | | ✅ |
| Hand over to cashier | | | ✅ | | ✅ |
| Verify token + mark delivered | | | | ✅ | ✅ |
| Cancel token / override status / edit any field | | | | | ✅ |
| User management, reports, audit log | | | | | ✅ |

Customer display (`/display`) is unauthenticated (it's a public screen).

---

## 7. API Surface (Route Handlers under `app/api/`)

```
POST   /api/auth/login            body: {username, password}
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/orders                ?q= (name/phone/orderId) &status= &view=<role-view>
GET    /api/orders/:orderId       full detail incl. lines + audit slice
POST   /api/orders/upload         multipart .xlsx → all-or-nothing import
GET    /api/orders/template       downloadable two-sheet template

POST   /api/orders/:orderId/action    body: {action, ...payload}
       actions: issue_token · toggle_line · mark_all_packed · set_bag_number ·
                hand_to_runner · hand_to_cashier · deliver ·
                cancel_token · override_status · edit_fields   (role-checked)

GET    /api/display               tokens with status ready_for_pickup (public)

GET    /api/admin/reports         counts by stage, tokens issued/cancelled today, delivered today
GET    /api/admin/audit           filterable audit trail
GET|POST|PATCH /api/admin/users   user management
```

Every mutating action runs in a transaction and writes an `audit_log` row (timestamp + user + role + action + details) — satisfying the BRD audit/business rules wholesale.

---

## 8. Pages & UI

```
app/
  login/                      Login (credentials + demo-user hints)
  display/                    Customer Display — public, full-screen, large
                              token numbers, masked Order ID, polls /api/display
  (dashboard)/                Authed layout: top nav, role badge, logout
    page.tsx                  Redirect to the user's role home
    greeter/                  Search (name/phone/Order ID) → verify → Generate
                              Token (big result: "Token 12") → issued-tokens list
    packager/                 Tabs: Pending Packaging · Packed · Awaiting Runner
                              (token alert banner) — line checklists (3/5),
                              bag-number inline edit, Hand Over to Runner
    runner/                   New tokens (with packed/not-packed indicator) ·
                              Collect Bag · Handed Over to Cashier
    cashier/                  Ready-for-pickup queue · verify by token number ·
                              order summary → Mark Delivered
    admin/                    Stats cards + live order table (all stages) ·
                              override controls · token management (cancel) ·
                              upload · reports · users · audit log
```

Shared components: `StatusBadge`, `OrderTable`, `LineChecklist`, `TokenCard`, `SearchBar`, `UploadDropzone` (+ error report), `StatCard`.

Polling hook `useLiveData(url, intervalMs)` drives all dashboards and the display; new-token rows highlight on the Packager/Runner views.

---

## 9. Project Structure (inside `client/`)

```
lib/
  db.ts          Prisma client singleton (schema: prisma/schema.prisma,
                 generated client: lib/generated/prisma, seed: prisma/seed.ts)
  auth.ts        password hashing, session create/verify, requireRole()
  orders.ts      workflow engine: transitions, guardrails, token issuance, audit
  excel.ts       two-sheet parse + validate, template generation
  permissions.ts action → roles map
  types.ts       shared types, status/label constants
app/…             pages & api routes per §7–8
```

---

## 10. Build Phases

**Phase 1 — Foundation:** `lib/` data layer (schema, seed, auth, permission map) + login/logout + authed layout shell.
**Phase 2 — Upload:** Excel template download, two-sheet parse + validation, all-or-nothing import, Packager upload UI with error report.
**Phase 3 — Core workflow:** order search, token issuance, line packing, bag numbers, handovers, delivery — Greeter/Packager/Runner/Cashier dashboards with polling.
**Phase 4 — Display & Admin:** customer display screen; admin dashboard (stats, overrides, token cancel, users, reports, audit viewer).
**Phase 5 — Verification & polish:** scripted end-to-end run of the BRD's customer journey (upload → token → pack → runner → cashier → delivered → display clears), edge cases (cancel token, early arrival, un-tick packed line, duplicate upload), empty/loading states, `npm run build` clean.

Each phase ends runnable — the app works incrementally, not only at the end.

---

## 11. Deliberate Scope Decisions

- **Polling over WebSockets/SSE** — 2–4 s freshness is ample for a store floor; trivially upgradeable later.
- **Postgres + Prisma over SQLite** (changed during build) — typed schema, real migrations, `Json` column for audit details; Prisma keeps the data layer swappable.
- **`number_of_items` stored on Orders** (changed from "always derive") — it is write-once at import since lines are never added/removed after upload; safe to store. `packed_count` remains derived. Caveat: any future admin edit that adds/removes line rows must update the count in the same transaction.
- **Global token numbers, one token per order** (changed from daily-reset + reissue) — see §4.
- **One bag per order** (BRD allows future multi-bag) — schema keeps `bag_number` on the order; multi-bag would move it to a table later.
- **No-show orders** simply remain at their stage; admin reports show them. Carry-over/purge policy = open stakeholder question.
- **Partial delivery** (item unavailable) not modeled — handled via Admin edit/override, flagged as open question.
