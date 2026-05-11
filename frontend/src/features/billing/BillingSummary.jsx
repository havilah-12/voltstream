// Used by the Billing page to summarize current bill and source split.
import { IndianRupee } from "lucide-react";
import { THEME_COLORS } from "../../constants/theme";

export default function BillingSummary({ balance, gridUsage, solarUsage, gridBill, solarSavings }) {
  return (
    <div className="h-full bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-800 flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-[var(--volt-yellow-soft)] text-[var(--volt-yellow)] rounded-full flex items-center justify-center">
          <IndianRupee size={20} />
        </div>
        <h3 className="text-xl font-semibold text-white">Generated Bill</h3>
      </div>
      <div className="mb-5">
        <span className="text-5xl font-bold text-[var(--volt-yellow)]">₹{balance}</span>
        <p className="text-zinc-400 mt-2 text-sm font-medium">Bill generated this month so far</p>
      </div>
      <div className="mt-auto border-t border-zinc-800 pt-4">
        <h4 className="text-sm font-semibold text-white mb-3">Grid And Solar Bill Split</h4>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-black/20 px-4 py-3 mb-3">
          <span className="text-sm text-zinc-400 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: THEME_COLORS.grid }}></div>
            Grid
          </span>
          <div className="text-right">
            <p className="text-sm font-bold text-white">{gridUsage} kWh</p>
            <p className="text-xs font-semibold text-zinc-500">Grid Bill: ₹{gridBill}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
          <span className="text-sm text-zinc-400 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: THEME_COLORS.solar }}></div>
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
