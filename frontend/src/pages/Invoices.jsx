import { useEffect, useState } from "react";
import { fetchBillingSummary } from "../api/billingApi";
import { AlertTriangle, Sun } from "lucide-react";
import PageHeader from "../components/PageHeader";
import BillingSummary from "../features/billing/BillingSummary";
import BudgetOverview from "../features/billing/BudgetOverview";
import InvoiceHistory from "../features/billing/InvoiceHistory";
import { downloadInvoicePdf } from "../utils/invoicePdf";

const defaultBillingSnapshot = {
  current_balance: 1850,
  projected_bill: 3200,
  budget_limit: 2500,
  current_grid_data_usage: 320,
  solar_energy_usage: 210,
};

function getSolarAdjustedBilling(summary) {
  const gridUsage = Number(summary.current_grid_data_usage) || 0;
  const solarUsage = Number(summary.solar_energy_usage) || 0;
  const projectedBill = Number(summary.projected_bill) || 0;
  const gridUnitRate = gridUsage > 0 ? projectedBill / gridUsage : 0;
  const solarCredit = Math.round(solarUsage * gridUnitRate);
  const netProjectedBill = Math.max(projectedBill - solarCredit, 0);

  return {
    netProjectedBill,
    solarCredit,
    solarSurplusKwh: Math.max(solarUsage - gridUsage, 0),
  };
}

function getPaymentWindow(today = new Date()) {
  const isPaymentDay = today.getDate() === 1;
  const nextPaymentDate = isPaymentDay
    ? today
    : new Date(today.getFullYear(), today.getMonth() + 1, 1);

  return {
    isPaymentDay,
    nextPaymentDate: nextPaymentDate.toLocaleDateString([], {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  };
}

export default function Invoices() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetchBillingSummary()
      .then((result) => {
        if (!cancelled) setData(result ?? defaultBillingSnapshot);
      })
      .catch((err) => {
        if (!cancelled) {
          setData(defaultBillingSnapshot);
          setWarning("Showing a billing snapshot right now.");
          setError(err.message || "Unable to load billing summary.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Billing & Invoices"
          subtitle="Manage your energy spend while tracking solar savings and budget alerts."
        />
        <div className="flex h-64 items-center justify-center rounded-3xl border border-zinc-900 bg-black/20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--volt-yellow)]"></div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Billing & Invoices"
          subtitle="Manage your energy spend while tracking solar savings and budget alerts."
        />
        <div className="rounded-3xl border border-red-600/40 bg-red-950/50 p-8 text-center text-red-200">
          <h2 className="text-2xl font-semibold mb-3">Billing data unavailable</h2>
          <p className="text-sm text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  const safeData = data ?? {
    current_balance: 0,
    projected_bill: 0,
    budget_limit: 0,
    current_grid_data_usage: 0,
    solar_energy_usage: 0,
  };

  const { netProjectedBill, solarCredit, solarSurplusKwh } = getSolarAdjustedBilling(safeData);
  const { isPaymentDay, nextPaymentDate } = getPaymentWindow();
  const isOverBudget = netProjectedBill > safeData.budget_limit;
  const budgetHelper = solarCredit > 0
    ? {
        title: "Solar Is Keeping You In Budget",
        message: `Your payable bill is Rs.${netProjectedBill}, within the Rs.${safeData.budget_limit} budget.`,
      }
    : {
        title: "Grid Usage Is Keeping You In Budget",
        message: `Your payable bill is Rs.${netProjectedBill}, within the Rs.${safeData.budget_limit} budget because grid usage is controlled.`,
      };
  const invoices = [
    { month: "April 2026", amount: 2450, status: "Paid", invoiceNumber: "INV-1042" },
    { month: "March 2026", amount: 2600, status: "Paid", invoiceNumber: "INV-1041" },
    { month: "February 2026", amount: 2320, status: "Paid", invoiceNumber: "INV-1040" },
  ];

  const buildInvoicePayload = (invoice) => ({
    invoiceNumber: invoice.invoiceNumber,
    month: invoice.month,
    status: invoice.status,
    generatedBill: safeData.current_balance,
    payableBill: netProjectedBill,
    budgetLimit: safeData.budget_limit,
    gridUsage: safeData.current_grid_data_usage,
    solarUsage: safeData.solar_energy_usage,
    solarSavings: solarCredit,
  });

  const handleDownloadCurrentInvoice = () => {
    downloadInvoicePdf({
      ...buildInvoicePayload({
        invoiceNumber: "INV-CURRENT",
        month: "Current Month",
        status: isOverBudget ? "Attention" : "In Budget",
      }),
    });
  };

  const handleDownloadHistoryInvoice = (invoice) => {
    downloadInvoicePdf({
      ...buildInvoicePayload(invoice),
      generatedBill: invoice.amount,
      payableBill: invoice.amount,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Invoices"
        subtitle="Manage your energy spend while tracking solar savings and budget alerts."
      />

      {isOverBudget ? (
        <div data-tour="billing-alert" className="bg-red-950/30 border-l-4 border-red-500 p-4 rounded-r-xl flex items-start gap-3 shadow-sm">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-400">Bill Is Still Over Budget</h3>
            <p className="text-red-300 text-sm mt-1">
              Your payable bill is INR {netProjectedBill}, which is above the INR {safeData.budget_limit} budget.
            </p>
          </div>
        </div>
      ) : (
        <div data-tour="billing-alert" className="bg-emerald-950/25 border-l-4 border-emerald-500 p-4 rounded-r-xl flex items-start gap-3 shadow-sm">
          <Sun className="text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-emerald-300">{budgetHelper.title}</h3>
            <p className="text-emerald-100/80 text-sm mt-1">
              {budgetHelper.message}
              {solarSurplusKwh > 0 ? ` Solar is ahead by ${solarSurplusKwh} kWh.` : ""}
            </p>
          </div>
        </div>
      )}

      {warning && (
        <div className="rounded-3xl border border-[var(--volt-yellow-border)] bg-[var(--volt-yellow-soft)] p-4 text-sm text-[var(--volt-yellow)]">
          {warning}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:col-span-2">
          <BillingSummary
            balance={safeData.current_balance}
            gridUsage={safeData.current_grid_data_usage}
            solarUsage={safeData.solar_energy_usage}
            gridBill={safeData.projected_bill}
            solarSavings={solarCredit}
            onDownloadCurrentInvoice={handleDownloadCurrentInvoice}
          />
          <BudgetOverview
            projectedBill={safeData.projected_bill}
            netProjectedBill={netProjectedBill}
            solarCredit={solarCredit}
            budgetLimit={safeData.budget_limit}
            isOverBudget={isOverBudget}
            canPay={isPaymentDay}
            nextPaymentDate={nextPaymentDate}
          />
        </div>
        <InvoiceHistory invoices={invoices} onDownload={handleDownloadHistoryInvoice} />
      </div>
    </div>
  );
}



