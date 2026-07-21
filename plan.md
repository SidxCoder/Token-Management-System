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
  customer_name, phone (string),
  status, token_number (nullable), token_date (nullable),
  uploaded_at, updated_at, number_of_items
  -- number_of_items is STORED, set once at import (lines are never added/removed
     after upload); bagged/packed counts stay DERIVED from Order_Lines, never stored

Order_Lines
  id (uuid pk), order_ref_id → Orders, product_name, sku_code, sku_description,
  bag_number (int, nullable)
  -- bag numbers are PER LINE: each product can ship in its own bag
  -- there is NO separate packed flag: a line WITH a bag number IS packed

Tokens
  id (autoincrement pk) — this IS the token number, globally sequential,
  order_ref_id → Orders (MANY rows per order allowed; only ONE with status
  ACTIVE at a time — enforced in code, not by a DB constraint),
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
                    └──────────────▶ token_issued       (requires every line's bag
                                                         number set = every line packed)
handed_over_to_runner ──▶ ready_for_pickup ──▶ delivered
```

Canonical statuses (`Status` enum in Prisma): `PACKAGING_PENDING`, `PACKAGED` (= packed), `TOKEN_ISSUED`, `HANDOVER` (= handed over to runner), `READY_FOR_PICKUP`, `DELIVERED`.

Resolved BRD ambiguities (decisions):
- **Customer Arrived + Token Issued** = one Greeter click → status `token_issued`; audit log records both events.
- **Handed Over to Cashier + Ready for Pickup** = one Runner click → status `ready_for_pickup` (order appears on display immediately, per BRD step 10); audit records "Handed Over to Cashier".
- **Uploaded** = transient; upload immediately lands on `packaging_pending` (any line without a bag number) or `packed` (every line bagged).
- **Packager "Handed Over to Runner" vs Runner "Collected from Packager"** = same transition (`token_issued → handed_over_to_runner`); either role's button performs it, audit records who.

### Guardrails (enforced server-side)
- Token can be issued from `packaging_pending` **or** `packed` (customer may arrive early). Only one ACTIVE token per order at a time (checked in the issue transaction).
- `→ handed_over_to_runner` is **blocked** unless every line has a bag number.
- Bag numbers (HARD LOCK): Packager (or Admin) may **assign** a line's bag number only while it is empty. Once assigned, **only Admin** can edit or remove it — regardless of order stage (enforced server-side). Clearing a bag number is how a line is "un-packed".
- Order status is recomputed from the lines after every bag change: all lines bagged → `packed`, else `packaging_pending` — but only while the order is in one of those two statuses (a bag change never regresses `token_issued` or later stages).
- `→ delivered` only from `ready_for_pickup` (cashier verifies token first).
- Admin bypasses all of the above (skip workflow, override any stage, direct-to-cashier).

---

## 4. Token Rules

- Generated only on customer arrival (Greeter/Admin action), never at upload.
- **Globally sequential, no daily reset** (decision changed from the BRD's "recommended" daily reset): the token number is the `Tokens.id` autoincrement PK — the database hands out the next number atomically, no MAX+1 transaction needed. Numbers grow forever ("Token 4832" after months) — accepted trade-off.
- **Tokens are regenerative** (changed from the earlier one-token-per-order design): an order may receive multiple tokens over its life, but only **one ACTIVE at a time** — the issue transaction rejects if an ACTIVE row exists.
- Admin can cancel a token: the ACTIVE row → `CANCELLED` (+ `cancelled_by`/`cancelled_at`), order reverts to `PACKAGED`/`PACKAGING_PENDING`, token number cleared from the order. A cancelled row is closed **permanently** — if the customer returns, the greeter issues a **fresh token with a new number**. Cancelled rows remain as history, so numbers are never reused anywhere (autoincrement guarantees it).

---

## 5. Excel Upload (two-sheet workbook, FK style)

**Sheet "Orders"** — one row per order: `Order ID | Customer Name | Phone Number`
**Sheet "Items"** — one row per product: `Order ID | Product Name | SKU Code | SKU Description | Bag Number (optional — a row WITH a bag number imports as already packed)`

Derived on import: number of items = count of item rows; status = every line has a bag number → `packed`, else `packaging_pending`.

### Validation (all-or-nothing import)
1. Both sheets present (matched by name), headers correct.
2. Order ID unique within Orders sheet **and** not already in DB.
3. Every Items row references an existing Orders row (no orphans).
4. Every order has ≥ 1 item row (no childless orders).
5. Mandatory cells non-empty; phone numeric (7–15 digits, validated as a string).
6. No duplicate SKU Code within the same order; Bag Number, if present, numeric.

Any failure → nothing is imported; response lists every error with sheet + row number + reason (rendered in the UI, downloadable). Success → import summary (X orders, Y items, Z fully-bagged/pre-packed).

A **downloadable template** (`.xlsx` with both sheets, headers, 2 example rows) is generated server-side.

Post-upload, **the app is the source of truth**: packing ticks and bag numbers change via the Packager dashboard, not re-upload (bag numbers already assigned — via upload or dashboard — are Admin-only to change, per §3).

---

## 6. Auth & Permissions

- Login page → `POST /api/auth/login` → verify password (stored as **plaintext** — deliberate internal-project decision, see §11) → create session row → httpOnly cookie.
- Every API route + page resolves the session server-side; pages redirect to `/login`, APIs return 401/403.
- Central permission map (single source of truth):

| Action | Packager | Greeter | Runner | Cashier | Admin |
|---|:-:|:-:|:-:|:-:|:-:|
| Upload Excel | ✅ | | | | ✅ |
| Assign bag number (line, while empty — this IS packing) | ✅ | | | | ✅ |
| Edit/remove an assigned bag number | | | | | ✅ |
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

GET    /api/orders                ?q= (name/phone/orderId) &status= &page= (100/page,
                                  returns total + totalPages)
GET    /api/orders/:orderId       full detail incl. lines + audit slice
POST   /api/orders/upload         multipart .xlsx → all-or-nothing import
GET    /api/orders/template       downloadable two-sheet template

POST   /api/orders/:orderId/action    body: {action, ...payload}
       actions: issue_token · set_bag_number ·
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
                              (token alert banner) — per-line bag assignment
                              with progress (3/5 bagged), Hand Over to Runner
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
  auth.ts        session create/verify (getSessionUser); plaintext passwords by decision
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
- **Global token numbers; tokens are regenerative** (changed twice: daily-reset dropped, then one-token-per-order dropped) — multiple token rows per order over time, one ACTIVE at a time, numbers never reused; see §4.
- **No separate `packed` flag** — a line with a bag number IS packed; un-packing = clearing the bag number, which falls under the hard lock (Admin-only once assigned).
- **Plaintext passwords** (internal LAN app, deliberate) — the `password_hash` column stores plaintext; revisit (hash + rename column) if the app ever leaves the store LAN.
- **Bags are per-line** (changed from one-bag-per-order) — `bag_number` lives on `Order_Lines`; each product can ship in its own bag. Assigned bag numbers are locked for everyone except Admin.
- **Order lines keep `product_name` alongside `sku_code`/`sku_description`** — client's Items sheet carries all three.
- **No-show orders** simply remain at their stage; admin reports show them. Carry-over/purge policy = open stakeholder question.
- **Partial delivery** (item unavailable) not modeled — handled via Admin edit/override, flagged as open question.
