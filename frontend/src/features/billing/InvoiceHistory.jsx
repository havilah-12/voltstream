// Used by the Billing page to show recent invoice records.
import { CheckCircle2, Download, Receipt } from "lucide-react";

export default function InvoiceHistory({ invoices, onDownload }) {
  return (
    <div data-tour="billing-invoices-card" className="h-full rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white">Recent Invoices</h3>
      </div>
      <div className="space-y-4">
        {invoices.map((invoice, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between rounded-xl border border-zinc-800 p-4 transition-colors hover:bg-zinc-800/50"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
                <Receipt size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-white">{invoice.month}</h4>
                <p className="text-sm font-medium text-zinc-500">{invoice.invoiceNumber ?? `INV-${1042 - idx}`}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-white">INR {invoice.amount}</p>
              <p className="mt-1 flex items-center justify-end gap-1 text-xs font-medium text-green-400">
                <CheckCircle2 size={12} /> {invoice.status}
              </p>
              <button
                type="button"
                onClick={() => onDownload?.(invoice)}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-300 transition-colors hover:border-[var(--volt-yellow-border)] hover:text-[var(--volt-yellow)]"
              >
                <Download size={12} />
                PDF
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
