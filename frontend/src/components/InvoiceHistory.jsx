import { CheckCircle2, Receipt } from "lucide-react";

export default function InvoiceHistory({ invoices }) {
  return (
    <div className="h-full bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-800">
      <h3 className="text-xl font-semibold text-white mb-6">Recent Invoices</h3>
      <div className="space-y-4">
        {invoices.map((invoice, idx) => (
          <div key={idx} className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 hover:bg-zinc-800/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-zinc-800 text-zinc-400 rounded-lg flex items-center justify-center">
                <Receipt size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-white">{invoice.month}</h4>
                <p className="text-sm text-zinc-500 font-medium">Invoice #INV-{1042 - idx}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-white">₹{invoice.amount}</p>
              <p className="text-xs font-medium text-green-400 flex items-center gap-1 justify-end mt-1">
                <CheckCircle2 size={12} /> {invoice.status}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
