import assert from "node:assert/strict";
import { classifyDay, evaluateCycle } from "../lib/erp/rules";
import { cycleFor, parseClock, parseRosterCell } from "../lib/erp/time";
import type { ApprovedRegularisation, RosterDay } from "../lib/erp/types";

const t = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const shift = (date: string, start: string, end: string, isOpening = false): RosterDay => ({
  date,
  kind: "SHIFT",
  startMin: t(start),
  endMin: t(end),
  isOpening,
});

// 1. Namrata: late on the opening shift is a major late, half day immediately.
{
  const f = classifyDay(shift("2026-09-28", "10:45", "19:45", true), { inMin: t("11:05"), outMin: t("20:15") }, []);
  const r = evaluateCycle([f], "2026-09-28").days[0];
  assert.equal(r.outcome, "HALF_DAY");
  assert.equal(r.severity, "MAJOR");
}

// 2. Three minor lates: only the 3rd is a half day, and it brings WARNING_1.
{
  const days = ["2026-09-20", "2026-09-21", "2026-09-22"].map((d) =>
    classifyDay(shift(d, "13:00", "22:00"), { inMin: t("13:15"), outMin: t("22:00") }, []),
  );
  const c = evaluateCycle(days, "2026-09-22");
  assert.deepEqual(c.days.map((d) => d.outcome), ["LATE", "LATE", "HALF_DAY"]);
  assert.deepEqual(c.disciplinary, [{ kind: "WARNING_1", date: "2026-09-22" }]);
}

// 3. Late + short hours on the same day: half day for hours, late not counted.
{
  const f = classifyDay(shift("2026-09-20", "13:00", "22:00"), { inMin: t("13:20"), outMin: t("19:30") }, []);
  const c = evaluateCycle([f], "2026-09-20");
  assert.equal(c.days[0].outcome, "HALF_DAY");
  assert.equal(c.countedLates, 0);
}

// 4. A manager excuse covers a minor late but never the opening shift.
{
  const ex: ApprovedRegularisation[] = [{ type: "TIME_EXCEPTION", inMin: null, outMin: null }];
  const minor = classifyDay(shift("2026-09-20", "13:00", "22:00"), { inMin: t("13:10"), outMin: t("22:00") }, ex);
  const opening = classifyDay(shift("2026-09-21", "10:45", "19:45", true), { inMin: t("10:50"), outMin: t("19:45") }, ex);
  const c = evaluateCycle([minor, opening], "2026-09-21");
  assert.deepEqual(c.days.map((d) => d.outcome), ["EXCUSED", "HALF_DAY"]);
}

// 5. Missed punch: pending inside 48 h, unauthorised absence after.
{
  const f = classifyDay(shift("2026-09-20", "13:00", "22:00"), { inMin: t("13:00"), outMin: null }, []);
  assert.equal(evaluateCycle([f], "2026-09-21").days[0].outcome, "MISSED_PUNCH_PENDING");
  assert.equal(evaluateCycle([f], "2026-09-25").days[0].outcome, "ABSENT");
}

// 6. Roster cells as the store writes them.
{
  const band = (v: string) => {
    const c = parseRosterCell(v);
    return c && c !== "invalid" ? [c.kind, c.startMin, c.endMin, c.isOpening] : c;
  };
  assert.deepEqual(band("10:45AM-7:45PM"), ["SHIFT", t("10:45"), t("19:45"), true]);
  assert.deepEqual(band("10:45AM - 7:45PM"), ["SHIFT", t("10:45"), t("19:45"), true]);
  assert.deepEqual(band("1-10PM"), ["SHIFT", t("13:00"), t("22:00"), false]);
  assert.deepEqual(band("12-9PM"), ["SHIFT", t("12:00"), t("21:00"), false]);
  assert.deepEqual(band("1:30-10:30PM"), ["SHIFT", t("13:30"), t("22:30"), false]);
  assert.deepEqual(band("9:45-6:45"), ["SHIFT", t("09:45"), t("18:45"), false]);
  assert.deepEqual(band("9:00AM"), ["SHIFT", t("09:00"), t("18:00"), false]);
  assert.deepEqual(band("WO"), ["WEEKLY_OFF", null, null, false]);
  assert.deepEqual(band("Leave"), ["LEAVE", null, null, false]);
  assert.equal(band(""), null);
  assert.equal(band("banana"), "invalid");
}

// 7. Punch times and the 19th-18th cycle.
{
  assert.equal(parseClock("10:40 AM"), t("10:40"));
  assert.equal(parseClock("07:45 PM"), t("19:45"));
  assert.equal(parseClock("19:45"), t("19:45"));
  assert.equal(parseClock(0.4444444444), t("10:40")); // Excel time cell
  assert.equal(parseClock(""), null);
  assert.equal(parseClock("25:00"), "invalid");
  assert.deepEqual(cycleFor("2026-09-28"), { start: "2026-09-19", end: "2026-10-18" });
  assert.deepEqual(cycleFor("2026-10-18"), { start: "2026-09-19", end: "2026-10-18" });
  assert.deepEqual(cycleFor("2026-01-05"), { start: "2025-12-19", end: "2026-01-18" });
}

console.log("All ERP rule checks passed.");
