"use client";

// Plain-language summary of the rules lib/erp/rules.ts applies. Keep the two in
// step: this tab is what admins read when an outcome surprises them.
export default function SopGuide() {
  const policies = [
    {
      title: "1. Late arrival and early exit",
      tag: "POL-11-01 (store rule)",
      tagColor: "bg-blue-100 text-blue-800",
      points: [
        "Arriving after shift start or leaving before shift end counts as a late. Both on the same day count once.",
        "Minor late (30 min or less outside the shift): every 3rd counted late in the cycle is a half day; the ones in between are recorded with no deduction.",
        "Major late (more than 30 min, or any late on the 10:45 opening shift): half day immediately. It still adds to the late count.",
        "Excused: up to 3 times a cycle, a manager may approve a minor late the employee warned them about before the shift. It isn't counted. The opening shift can never be excused.",
      ],
    },
    {
      title: "2. Short hours",
      tag: "POL-11-01",
      tagColor: "bg-purple-100 text-purple-800",
      points: [
        "Hours are measured from in-punch to out-punch, break included.",
        "Under 7 h: half-day leave. Under 4.5 h: one day's leave.",
        "On a short-hours day the late/early is not counted as a late — the hours rule takes over.",
        "Leave is taken from comp off first, then CL/SL. Only with no balance is pay deducted, and only for the time not worked.",
      ],
    },
    {
      title: "3. Warnings and incentive",
      tag: "Escalation",
      tagColor: "bg-rose-100 text-rose-800",
      points: [
        "3rd counted late in a cycle: Warning 1.",
        "6th: Warning 2, and only 50% of that month's sales incentive.",
        "9th: show-cause, and no incentive that month.",
        "The late count restarts each cycle; warnings stay on the employee's cumulative record.",
      ],
    },
    {
      title: "4. Missed punches and regularisation",
      tag: "SOP-11-03",
      tagColor: "bg-emerald-100 text-emerald-800",
      points: [
        "Missed punch: regularise within 48 h with manager confirmation, max 3 a cycle. Not regularised in time = unauthorised absence. 3 missed punches in a cycle bring a written caution.",
        "Device failure and outdoor duty: request within 24 h with the correct in/out times.",
        "A regularisation corrects the times; lateness is still judged on the corrected times.",
        "Every request must be approved by a different admin from the one who entered it.",
      ],
    },
    {
      title: "5. Attendance cycle and freeze",
      tag: "Cycle rules",
      tagColor: "bg-slate-100 text-slate-800",
      points: [
        "The cycle runs from the 19th of one month to the 18th of the next.",
        "Corrections close on the 18th. From the 19th the cycle can be frozen for payroll once no requests are pending.",
        "A frozen cycle can't be changed: no uploads, regularisations or decisions for its days.",
      ],
    },
    {
      title: "6. Roster and women's shifts",
      tag: "SOP-11-02",
      tagColor: "bg-amber-100 text-amber-800",
      points: [
        "Two weekly offs every week, with at least a 3-day gap between offs in any two-week period (2-day gap only with Business Head approval).",
        "Women's regular bands end by 21:30. Any later shift needs the employee's recorded consent and store-arranged transport — the roster and attendance views highlight these.",
        "Non-reporting on a rostered shift without approved leave is unauthorised absence.",
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {policies.map((p) => (
        <div key={p.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h4 className="text-sm font-bold text-slate-900">{p.title}</h4>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.tagColor}`}>{p.tag}</span>
          </div>
          <ul className="mt-3.5 list-disc space-y-1.5 pl-5 text-xs text-slate-600">
            {p.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
