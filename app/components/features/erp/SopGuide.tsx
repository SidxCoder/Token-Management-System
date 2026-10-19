"use client";

export default function SopGuide() {
  const policies = [
    {
      title: "1. Punctuality & Grace Late Rule (3-Day Limit)",
      tag: "Mandatory Policy",
      tagColor: "bg-blue-100 text-blue-800",
      content: (
        <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
          <li>
            <strong>On Time / Before Shift:</strong> Marked as <span className="text-emerald-600 font-semibold">PRESENT</span>.
          </li>
          <li>
            <strong>Late within 30 Minutes:</strong> Allowed up to <strong>3 days in a month</strong> as a grace pardon. Marked as <span className="text-amber-600 font-semibold">PRESENT (Grace Late)</span>.
          </li>
          <li>
            <strong>4th Late Occurrence:</strong> The 4th time an employee arrives late in the monthly cycle, they are automatically penalized with a <span className="text-rose-600 font-semibold">HALF DAY</span>.
          </li>
          <li>
            <strong>Late by &gt; 30 Minutes:</strong> Exceeds the grace tolerance window and is marked as <span className="text-rose-600 font-semibold">HALF DAY</span> unless regularised with executive approval.
          </li>
        </ul>
      ),
    },
    {
      title: "2. Dedicated Shift & Mandatory 9-Hour Completion",
      tag: "Store Requirement",
      tagColor: "bg-purple-100 text-purple-800",
      content: (
        <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
          <li>
            Every rostered employee has a dedicated shift band (e.g., <code>10:45 AM – 7:45 PM</code>, <code>1:00 PM – 10:00 PM</code>, <code>9:00 AM – 6:00 PM</code>).
          </li>
          <li>
            <strong>Full 9-Hour Requirement:</strong> Employees must complete the full <strong>9 hours</strong> of their shift. Leaving early or failing to complete 9 hours will automatically mark the record as a <span className="text-rose-600 font-semibold">HALF DAY</span>.
          </li>
          <li>
            The 10:45 AM opening shift opens the store and rotates fairly across the team.
          </li>
        </ul>
      ),
    },
    {
      title: "3. Women Employee Shift Timing & Safety Compliance (SOP-11-02 Rule 5)",
      tag: "Statutory / Safety",
      tagColor: "bg-pink-100 text-pink-800",
      content: (
        <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
          <li>
            Regular shift bands for female employees must end by <strong>21:30 (9:30 PM)</strong> (latest standard band: 12:30 PM to 21:30 PM).
          </li>
          <li>
            <strong>Exception Protocol:</strong> If scheduled or retained past 21:30, written employee consent must be filed by Store Admin, and the store must arrange secure transport/cab.
          </li>
          <li>
            The ERP dashboard automatically flags shifts ending after 21:30 with a safety compliance badge.
          </li>
        </ul>
      ),
    },
    {
      title: "4. Monthly Attendance Cycle & Freeze (SOP-11-02 Rule 1)",
      tag: "Cycle Rules",
      tagColor: "bg-slate-100 text-slate-800",
      content: (
        <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
          <li>
            The monthly attendance cycle runs strictly from the <strong>19th of one month to the 18th of the next month</strong>.
          </li>
          <li>
            All corrections, regularisations, and leave approvals close on the <strong>18th</strong>.
          </li>
          <li>
            The cycle is processed and locked on the <strong>19th</strong>. No waivers or changes are permitted after the freeze.
          </li>
        </ul>
      ),
    },
    {
      title: "5. Weekly Offs & The 3-Day Gap Rule",
      tag: "SOP-11-02 Controls",
      tagColor: "bg-amber-100 text-amber-800",
      content: (
        <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
          <li>
            Every employee receives <strong>two Weekly Offs (WO)</strong> per week.
          </li>
          <li>
            There must be a minimum gap of <strong>3 days</strong> between weekly offs within any two-week period.
          </li>
          <li>
            A 2-day gap is strictly exceptional and requires advance Business Head approval.
          </li>
        </ul>
      ),
    },
    {
      title: "6. Biometric Failure & Regularisation (SOP-11-03)",
      tag: "Escalation & Approval",
      tagColor: "bg-emerald-100 text-emerald-800",
      content: (
        <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
          <li>
            In case of biometric device failure or missed punch, the employee must email the Reporting Manager the same day with in-time and out-time.
          </li>
          <li>
            Store Admin verifies against the roster and obtains Business Head approval within 24 hours.
          </li>
          <li>
            Admins and managers can use the <strong>Regularise</strong> action button in the ERP dashboard to log approved overrides.
          </li>
        </ul>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {policies.map((p, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-sm transition"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h4 className="text-sm font-bold text-slate-900">{p.title}</h4>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.tagColor}`}>
              {p.tag}
            </span>
          </div>
          <div className="mt-3.5">{p.content}</div>
        </div>
      ))}
    </div>
  );
}
