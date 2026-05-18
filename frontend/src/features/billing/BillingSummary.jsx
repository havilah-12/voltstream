// Used by the Billing page to summarize current bill and source split.
import { Download, IndianRupee } from "lucide-react";
import { THEME_COLORS } from "../../constants/theme";

export default function BillingSummary({
  balance,
  gridUsage,
  solarUsage,
  gridBill,
  solarSavings,
  onDownloadCurrentInvoice,
}) {
  return (
    <div data-tour="billing-generated-card" className="flex h-full flex-col rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--volt-yellow-soft)] text-[var(--volt-yellow)]">
            <IndianRupee size={20} />
          </div>
          <h3 className="text-xl font-semibold text-white">Generated Bill</h3>
        </div>
        <button
          type="button"
          onClick={onDownloadCurrentInvoice}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-300 transition-colors hover:border-[var(--volt-yellow-border)] hover:text-[var(--volt-yellow)]"
        >
          <Download size={14} />
          PDF
        </button>
      </div>
      <div data-tour="billing-generated-amount" className="mb-5">
        <span className="text-5xl font-bold text-[var(--volt-yellow)]">₹{balance}</span>
        <p className="mt-2 text-sm font-medium text-zinc-400">Bill generated this month so far</p>
      </div>
      <div data-tour="billing-split" className="mt-auto border-t border-zinc-800 pt-4">
        <h4 className="mb-3 text-sm font-semibold text-white">Grid And Solar Bill Split</h4>
        <div className="mb-3 flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-black/20 px-4 py-3">
          <span className="flex items-center gap-2 text-sm text-zinc-400">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: THEME_COLORS.grid }}></div>
            Grid
          </span>
          <div className="text-right">
            <p className="text-sm font-bold text-white">{gridUsage} kWh</p>
            <p className="text-xs font-semibold text-zinc-500">Grid Bill: ₹{gridBill}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
          <span className="flex items-center gap-2 text-sm text-zinc-400">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: THEME_COLORS.solar }}></div>
            Solar
          </span>
          <div className="text-right">
            <p className="text-sm font-bold text-white">{solarUsage} kWh</p>
            <p className="text-xs font-semibold text-emerald-300">Solar Bill: ₹{solarSavings}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
