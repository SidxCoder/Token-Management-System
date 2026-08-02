# Fix tracker

Status legend: ⬜ not started · 🟡 in progress · ✅ done · ⛔ blocked / needs decision

Last updated: 2026-08-01

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | Partial order can be handed over to runner | ✅ | See item 13 — the first attempt was a trap and has been completed properly. |
| 13 | Partial handover stranded the leftover items | ✅ | The first cut released bagged lines but never let them come back: once the batch moved on, the order left the packing queue, `set_bag_number` refused ("packing is closed"), and `deliver` refused ("1 of 3 items have no bag number") — the order could never be completed. Now per-line `delivered`, packing filtered by line state instead of order status, `assign_runner` allows a second batch once the first is delivered, and `deliver` completes only the batch at the counter. Verified: full A,B → deliver → bag C → C → deliver → `DELIVERED` on one token. |
| 2 | Customer display shows which cashier to collect from | ✅ | `/api/display` returns `counter`; display shows it in large green type. Verified: after handover, counter = "Counter 91". |
| 3 | Order handed to Runner 1 also showed on Runner 2 | ✅ | Removed the `runner_id: null` clause from the `mine` filter in `lib/orderQuery.ts`. Verified: visible to R91=1, R92=0. |
| 4 | "Collect bag" errored with "pick which runner…" | ✅ | `handToRunner` now falls back to the order's existing `runner_id`. Verified: admin collect succeeded and kept the R91 assignment. |
| 5 | Assign bag → handover → bounced back to the list | ✅ | Cause found via item 11: the pane's copy only refreshed if the order was still in the refetched window. Actions now take the updated order from their own response. |
| 10 | Repeat handover errored "cannot hand to cashier while order is READY_FOR_PICKUP" | ✅ | Caused by my own item-5 mitigation — the kept-on-screen copy never updated its status, so the button stayed live. Actions now refresh it, and a `moved` guard disables every action once the order leaves the queue. |
| 11 | Bag number not visible after assigning (until refresh) | ✅ | Same cause. `set_bag_number` now updates the pane from the response and clears the typed draft. |
| 12 | Order lines reshuffled after every edit | ✅ | `Order_Lines` had no `orderBy`, so Postgres returned the edited row last. Added `LINE_ORDER` everywhere lines are fetched. Verified identical order across three consecutive actions. |
| 6 | Return option in cashier dashboard | ✅ | New `return_order` action + `return_order` permission (CASHIER, ADMIN) + confirm UI with optional reason. Verified: status → PACKAGING_PENDING, token CANCELLED, routing cleared, lines reset. |
| 7 | Account creation by role, auto station number | ✅ | Role picker only; server assigns the lowest free number per role and derives display name + username. `?next=1` previews it in the form. |

## Workflow after these changes

```
packager   assign_runner   -> runner_id set, status stays TOKEN_ISSUED,
                              bagged lines marked handed_over
runner     hand_to_runner  -> status HANDOVER            (only their own orders)
runner     hand_to_cashier -> status READY_FOR_PICKUP    (picks the counter)
cashier    deliver         -> status DELIVERED
cashier    return_order    -> back to packing, token cancelled
```

## Notes / follow-ups

- **Item 5 is the one I could not reproduce.** The likely trigger is the selected order
  falling outside the loaded 100-row window after a re-sort. The sticky-selection change should
  cover that, but confirm on the real UI before I close it.
- **Station numbers reuse freed numbers.** Deleting Runner 2 means the next runner created
  becomes Runner 2 again. Say if you would rather numbers never be reused.
- **Existing accounts have no station number** (all null), so pickers show plain names until
  each is edited or recreated.
- **Returned orders lose their token.** The customer would be issued a new token if they come
  back. That follows from cancelling the token so the display clears.

## Verification status

Type-check, lint and production build are clean. Items 1, 2, 3, 4, 6 were exercised end to end
against the live database through the real workflow functions. **Nothing is browser-verified.**
