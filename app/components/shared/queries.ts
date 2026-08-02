import { statusFirst, UNDELIVERED_STATUSES, type LineStage, type OrderStatus, type SortKey } from "./api";

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
  lines?: LineStage[];
  hasToken?: boolean;
  sort: SortKey;
  mine?: boolean;
};

export const QUERIES = {
  orders: { sort: statusFirst("PACKAGING_PENDING") },
  // Packing is defined purely by "has items not yet shipped" — deliberately no
  // status filter. A partially handed-over order sits at HANDOVER or
  // READY_FOR_PICKUP for its in-flight batch while its remaining lines are
  // still in packing; filtering by status hid it for that whole window.
  // Fully delivered orders drop out on their own, since every line of one is
  // handed over.
  packing: {
    lines: ["PACKING"],
    sort: statusFirst("PACKAGING_PENDING"),
  },
  tokenSearch: { sort: statusFirst("PACKAGED") },
  tokenIssued: { hasToken: true, sort: "token_desc" },
  cancel: { statuses: UNDELIVERED_STATUSES, hasToken: true, sort: "token" },
  delivery: { statuses: ["READY_FOR_PICKUP"], sort: "token", mine: true },
  runner: {
    statuses: RUNNER_STATUSES,
    // Only the batch actually in flight. A partially handed-over order appears
    // here and in packing at the same time — different lines, different stages.
    lines: ["RELEASED", "WITH_RUNNER"],
    sort: statusFirst("TOKEN_ISSUED"),
    mine: true,
  },
  overrides: { statuses: UNDELIVERED_STATUSES, sort: statusFirst("PACKAGING_PENDING") },
} satisfies Record<string, ScreenQuery>;
