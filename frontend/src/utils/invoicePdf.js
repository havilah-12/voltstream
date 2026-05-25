function escapePdfText(text) {
  return String(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function formatCurrency(value) {
  return `INR ${Number(value || 0).toFixed(0)}`;
}

function formatUnits(value) {
  return `${Number(value || 0).toFixed(0)} kWh`;
}

function formatInvoiceDate(date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getBillingPeriodStart(month) {
  const currentDate = new Date();
  if (!month || month === "Current Month") {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  }

  const parsedDate = new Date(`${month} 1`);
  if (Number.isNaN(parsedDate.getTime())) {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  }

  return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1);
}

function buildInvoiceDetails(invoice) {
  const generatedBill = Number(invoice.generatedBill || 0);
  const payableBill = Number(invoice.payableBill || 0);
  const solarSavings = Number(invoice.solarSavings || 0);
  const gridUsage = Number(invoice.gridUsage || 0);
  const solarUsage = Number(invoice.solarUsage || 0);
  const serviceCharge = Math.max(Math.round(generatedBill * 0.06), 120);
  const energyCharge = Math.max(generatedBill - serviceCharge, 0);
  const issueDate = getBillingPeriodStart(invoice.month);
  const dueDate = new Date(issueDate.getFullYear(), issueDate.getMonth() + 1, 1);

  return {
    accountName: "Prosumer Household",
    serviceAddress: "VoltStream Smart Home Demo Address",
    dueDate: formatInvoiceDate(dueDate),
    issueDate: formatInvoiceDate(issueDate),
    lineItems: [
      { label: "Grid energy charge", detail: `${formatUnits(gridUsage)} @ monitored rate`, amount: energyCharge },
      { label: "Smart meter and service", detail: "Monitoring, alerts, and billing support", amount: serviceCharge },
      { label: "Solar savings credit", detail: `${formatUnits(solarUsage)} offset from solar generation`, amount: -solarSavings },
    ],
    generatedBill,
    payableBill,
  };
}

function buildContentLines(invoice) {
  const details = buildInvoiceDetails(invoice);
  const lines = [
    { size: 24, text: "VoltStream Energy Invoice", gap: 24 },
    { size: 12, text: "Provider: VoltStream Smart Energy Monitoring", gap: 14 },
    { size: 12, text: `Invoice number: ${invoice.invoiceNumber}`, gap: 14 },
    { size: 12, text: `Billing period: ${invoice.month}`, gap: 14 },
    { size: 12, text: `Issue date: ${details.issueDate}`, gap: 14 },
    { size: 12, text: `Due date: ${details.dueDate}`, gap: 24 },
    { size: 14, text: "Customer details", gap: 18 },
    { size: 12, text: `Account name: ${details.accountName}`, gap: 14 },
    { size: 12, text: `Service address: ${details.serviceAddress}`, gap: 24 },
    { size: 14, text: "Energy summary", gap: 18 },
    { size: 12, text: `Grid usage: ${formatUnits(invoice.gridUsage)}`, gap: 14 },
    { size: 12, text: `Solar contribution: ${formatUnits(invoice.solarUsage)}`, gap: 14 },
    { size: 12, text: `Generated bill: ${formatCurrency(details.generatedBill)}`, gap: 14 },
    { size: 12, text: `Solar savings applied: ${formatCurrency(invoice.solarSavings)}`, gap: 14 },
    { size: 12, text: `Budget limit: ${formatCurrency(invoice.budgetLimit)}`, gap: 24 },
    { size: 14, text: "Charges and credits", gap: 18 },
  ];

  details.lineItems.forEach((item) => {
    lines.push({
      size: 12,
      text: `${item.label}: ${formatCurrency(item.amount)} - ${item.detail}`,
      gap: 14,
    });
  });

  lines.push(
    { size: 14, text: `Total payable now: ${formatCurrency(details.payableBill)}`, gap: 18 },
    { size: 12, text: `Payment status: ${invoice.status}`, gap: 14 },
    {
      size: 11,
      text: "This is a generated demo invoice for VoltStream platform billing previews and downloads.",
      gap: 14,
    },
  );

  return lines;
}

function buildPdfDocument(lines) {
  let cursorY = 790;
  const content = ["BT"];

  lines.forEach((line) => {
    content.push(`/F1 ${line.size} Tf`);
    content.push(`1 0 0 1 50 ${cursorY} Tm`);
    content.push(`(${escapePdfText(line.text)}) Tj`);
    cursorY -= line.gap ?? line.size + 16;
  });

  content.push("ET");
  return content.join("\n");
}

function createPdfBlob(content) {
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${content.length} >> stream\n${content}\nendstream\nendobj`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

export function downloadInvoicePdf(invoice) {
  const content = buildPdfDocument(buildContentLines(invoice));
  const blob = createPdfBlob(content);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const normalizedMonth = String(invoice.month || "invoice")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  link.download = `${normalizedMonth}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
