import { statusFirst, UNDELIVERED_STATUSES, type OrderStatus, type SortKey } from "./api";

// Each screen's opening query, in one place. The page uses it to server-render
// the first screenful; the component uses the same values to seed its state. If
// these two ever disagreed, the list would visibly jump on the first poll.

export const PACKING_STATUSES: OrderStatus[] = [
  "PACKAGING_PENDING",
  "PACKAGED",
  "TOKEN_ISSUED",
];

export const RUNNER_STATUSES: OrderStatus[] = ["TOKEN_ISSUED", "HANDOVER"];

export type ScreenQuery = {
  statuses?: OrderStatus[];
  linesHandedOver?: boolean;
  hasToken?: boolean;
  sort: SortKey;
  mine?: boolean;
};

export const QUERIES = {
  orders: { sort: statusFirst("PACKAGING_PENDING") },
  packing: { statuses: PACKING_STATUSES, sort: statusFirst("PACKAGING_PENDING") },
  tokenSearch: { sort: statusFirst("PACKAGED") },
  tokenIssued: { hasToken: true, sort: "token_desc" },
  cancel: { statuses: UNDELIVERED_STATUSES, hasToken: true, sort: "token" },
  delivery: { statuses: ["READY_FOR_PICKUP"], sort: "token", mine: true },
  runner: {
    statuses: RUNNER_STATUSES,
    // Only orders with lines actually released to a runner. A partially handed
    // over order appears here and in packing at the same time.
    linesHandedOver: true,
    sort: statusFirst("TOKEN_ISSUED"),
    mine: true,
  },
  overrides: { statuses: UNDELIVERED_STATUSES, sort: statusFirst("PACKAGING_PENDING") },
} satisfies Record<string, ScreenQuery>;
