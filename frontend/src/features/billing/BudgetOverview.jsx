// Used by the Billing page to compare projected spend against the budget.
import { CalendarClock, CreditCard, IndianRupee } from "lucide-react";

export default function BudgetOverview({ netProjectedBill, budgetLimit, isOverBudget, canPay, nextPaymentDate }) {
  const adjustedBill = netProjectedBill ?? 0;
  const budgetPercentage = budgetLimit > 0 ? Math.min((adjustedBill / budgetLimit) * 100, 100) : 0;
  const remainingBudget = Math.max(budgetLimit - adjustedBill, 0);

  return (
    <div data-tour="billing-payable-card" className="h-full bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-800 flex flex-col">
      <div data-tour="billing-payable-amount" className="mb-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[var(--volt-yellow-soft)] text-[var(--volt-yellow)] rounded-full flex items-center justify-center">
            <IndianRupee size={20} />
          </div>
          <h3 className="text-xl font-semibold text-white">Payable Bill</h3>
        </div>
        <span className="text-5xl font-bold text-[var(--volt-yellow)]">₹{adjustedBill}</span>
        <p className="text-zinc-400 mt-2 text-sm font-medium">Amount to pay after solar savings</p>
      </div>

      <div className="mt-auto">
        <div data-tour="billing-budget-section" className="group/budget relative">
        <div className="flex justify-between text-sm font-medium mb-2">
          <span className="text-zinc-400">Monthly Budget Used</span>
          <span className={isOverBudget ? "text-red-500 font-bold" : "text-white"}>{budgetPercentage.toFixed(0)}%</span>
        </div>
        <div className="relative h-3 w-full rounded-full bg-zinc-800">
          <div
            className="pointer-events-none absolute bottom-full z-[90] mb-2 -translate-x-1/2 rounded-lg border border-[var(--volt-yellow-border)] bg-zinc-950 px-3 py-2 text-xs font-bold text-[var(--volt-yellow)] opacity-0 shadow-xl shadow-black/70 transition-opacity duration-150 group-hover/budget:opacity-100 group-focus-within/budget:opacity-100"
            style={{ left: `${Math.max(18, Math.min(budgetPercentage, 82))}%` }}
          >
            Used Rs.{adjustedBill}
          </div>
          <div
            className={`h-full rounded-full transition-all duration-1000 ${isOverBudget ? 'bg-red-500' : 'bg-[var(--volt-yellow)]'}`}
            style={{ width: `${budgetPercentage}%` }}
          />
        </div>
        <div className="flex justify-between text-xs font-semibold text-zinc-500 uppercase mt-2">
          <span>₹0</span>
          <span>Limit: ₹{budgetLimit}</span>
        </div>
        <p className={`mt-3 text-sm font-semibold ${isOverBudget ? "text-red-300" : "text-emerald-300"}`}>
          {isOverBudget
            ? `Over budget by ₹${adjustedBill - budgetLimit}.`
            : `₹${remainingBudget} left in this month's budget.`}
        </p>
        </div>
        <div data-tour="billing-payment-section" className="mt-5 rounded-xl border border-zinc-800 bg-black/25 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-300">
            <CalendarClock size={17} className="text-[var(--volt-yellow)]" />
            <span>{canPay ? "Payment is open today" : `Pay on ${nextPaymentDate}`}</span>
          </div>
          <button
            type="button"
            disabled={!canPay}
            className={`flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-bold transition-colors ${
              canPay
                ? "bg-[var(--volt-yellow)] text-black hover:brightness-110"
                : "cursor-not-allowed border border-zinc-700 bg-zinc-900 text-zinc-500"
            }`}
          >
            <CreditCard size={17} />
            {canPay ? `Pay ₹${adjustedBill}` : "Pay button unlocks on the 1st"}
          </button>
        </div>
      </div>
    </div>
  );
}
