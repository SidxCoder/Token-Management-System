export default function TabHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-7 shrink-0">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {description ? (
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      ) : null}
    </div>
  );
}
