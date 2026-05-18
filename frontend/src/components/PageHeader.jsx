// Used by Dashboard, Usage History, Smart Control, and Billing pages.
export default function PageHeader({ title, subtitle, className = "" }) {
  return (
    // Shared header anchor so the guided tour can start from a stable page title target.
    <div data-tour="page-heading" className={`flex flex-col gap-2 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {subtitle ? (
            <p className="text-base font-medium text-zinc-400 mt-1 max-w-2xl">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
