import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ReceiptData } from './printReceipt';

const APP_NAME = "Haji Kala Khan Son's";
const APP_SUBTITLE = 'Cement Steel Dealer';

export interface DailyRegisterRow {
  date: string;
  sales_count: number;
  sales_amount: number;
  cash_received: number;
  credit_given: number;
  payments_collected: number;
  stock_added_count: number;
  stock_added_value: number;
  net_profit: number;
}

export interface DailyRegisterTotals {
  sales_count: number;
  sales_amount: number;
  cash_received: number;
  credit_given: number;
  payments_collected: number;
  stock_added_value: number;
  net_profit: number;
}

export interface DayDetailPdfData {
  date: string;
  sales: Array<{
    id: number;
    customer_name: string;
    total_amount: number;
    paid_amount: number;
    remaining_amount: number;
    payment_type: string;
    status: string;
  }>;
  stock_movements: Array<{
    supplier: string;
    product: string;
    quantity: number;
    unit: string;
    purchase_rate: number;
    total_value: number;
  }>;
  payments_received: Array<{
    customer_name: string;
    amount: number;
    method: string;
    notes?: string;
  }>;
  summary: {
    total_sales: number;
    cash_collected: number;
    credit_given: number;
    stock_value: number;
    profit: number;
    payments_collected: number;
  };
}

const money = (n: number) => `Rs ${n.toFixed(2)}`;

export function downloadSaleReceiptPdf(receipt: ReceiptData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(26, 32, 44);
  doc.rect(0, 0, pageWidth, 34, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(APP_NAME, 14, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(245, 158, 11); // amber for tagline
  doc.text('Cement Steel Dealer', 14, 20);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Invoice #${receipt.saleId}`, pageWidth - 14, 14, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(new Date(receipt.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }), pageWidth - 14, 20, { align: 'right' });
  doc.setTextColor(33, 37, 41);

  doc.setDrawColor(220, 226, 232);
  doc.roundedRect(14, 40, pageWidth - 28, 24, 2, 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Bill To', 18, 47);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Customer: ${receipt.customerName || 'Walk-in'}`, 18, 53);
  if (receipt.customerPhone) {
    doc.text(`Phone: ${receipt.customerPhone}`, 18, 58);
  }
  if (receipt.customerAddress) {
    doc.text(`Address: ${receipt.customerAddress}`, 72, 58);
  }

  autoTable(doc, {
    startY: 72,
    head: [['Item', 'Qty', 'Rate', 'Total']],
    body: receipt.items.map((item) => [
      `${item.name}${item.brand ? ` (${item.brand})` : ''}`,
      `${item.quantity} ${item.unit}`,
      money(item.rate),
      money(item.total),
    ]),
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [38, 53, 72], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 88 },
      1: { cellWidth: 28, halign: 'center' },
      2: { cellWidth: 32, halign: 'right' },
      3: { cellWidth: 36, halign: 'right' },
    },
  });

  const endY = (doc as any).lastAutoTable?.finalY ?? 120;

  const lc = receipt.loadingCharges || 0;
  const summaryRows = lc > 0 ? 5 : 3;
  const summaryHeight = summaryRows * 7 + 9;

  doc.setDrawColor(220, 226, 232);
  doc.roundedRect(pageWidth - 86, endY + 8, 72, summaryHeight, 2, 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  let sy = endY + 16;
  if (lc > 0) {
    const itemsSubtotal = receipt.totalAmount - lc;
    doc.text('Sub Total', pageWidth - 80, sy);
    doc.text(money(itemsSubtotal), pageWidth - 20, sy, { align: 'right' });
    sy += 7;
    doc.text('Loading Charges', pageWidth - 80, sy);
    doc.text(money(lc), pageWidth - 20, sy, { align: 'right' });
    sy += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Grand Total', pageWidth - 80, sy);
    doc.text(money(receipt.totalAmount), pageWidth - 20, sy, { align: 'right' });
    sy += 7;
    doc.setFont('helvetica', 'normal');
  } else {
    doc.text('Total', pageWidth - 80, sy);
    doc.text(money(receipt.totalAmount), pageWidth - 20, sy, { align: 'right' });
    sy += 7;
  }
  doc.text('Paid', pageWidth - 80, sy);
  doc.text(money(receipt.paidAmount), pageWidth - 20, sy, { align: 'right' });
  sy += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Pending', pageWidth - 80, sy);
  doc.text(money(receipt.pendingAmount), pageWidth - 20, sy, { align: 'right' });
  sy += 7;

  if (receipt.dueDate && receipt.pendingAmount > 0) {
    const due = new Date(receipt.dueDate);
    const today = new Date(); today.setHours(0,0,0,0);
    const isOverdue = due < today;
    const dueDateStr = due.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
    if (isOverdue) {
      doc.setTextColor(200, 0, 0);
      doc.text('⚠ OVERDUE', pageWidth - 80, sy);
      doc.text(dueDateStr, pageWidth - 20, sy, { align: 'right' });
      doc.setTextColor(0, 0, 0);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.text('Due Date', pageWidth - 80, sy);
      doc.text(dueDateStr, pageWidth - 20, sy, { align: 'right' });
    }
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Payment Type: ${receipt.paymentType.toUpperCase()}`, 14, endY + 16);
  if (receipt.notes) {
    doc.text(`Notes: ${receipt.notes}`, 14, endY + 23);
  }

  const footerY = endY + summaryHeight + 20;
  doc.setDrawColor(220, 226, 232);
  doc.line(14, footerY, pageWidth - 14, footerY);
  doc.setFontSize(9);
  doc.text(APP_NAME, 14, footerY + 6);
  doc.text('Generated by POS', pageWidth - 14, footerY + 6, { align: 'right' });

  doc.save(`invoice-${receipt.saleId}.pdf`);
}

export function downloadDailyRegisterPdf(params: {
  from: string;
  to: string;
  rows: DailyRegisterRow[];
  totals: DailyRegisterTotals;
}) {
  const { from, to, rows, totals } = params;
  const doc = new jsPDF('landscape');

  doc.setFontSize(16);
  doc.text('Daily Register Report', 14, 14);
  doc.setFontSize(10);
  doc.text(`Period: ${from} to ${to}`, 14, 20);

  autoTable(doc, {
    startY: 24,
    head: [['Date', 'Sales #', 'Sales Amt', 'Cash In', 'Credit', 'Collections', 'Stock In', 'Profit']],
    body: rows.map((r) => [
      r.date,
      String(r.sales_count),
      money(r.sales_amount),
      money(r.cash_received),
      money(r.credit_given),
      money(r.payments_collected),
      money(r.stock_added_value),
      money(r.net_profit),
    ]),
    theme: 'striped',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [41, 55, 72] },
  });

  const endY = (doc as any).lastAutoTable?.finalY ?? 150;
  doc.setFontSize(11);
  doc.text(`Total Days: ${rows.length}`, 14, endY + 10);
  doc.text(`Total Sales Count: ${totals.sales_count}`, 14, endY + 16);
  doc.text(`Total Sales: ${money(totals.sales_amount)}`, 14, endY + 22);
  doc.text(`Cash Received: ${money(totals.cash_received)}`, 90, endY + 10);
  doc.text(`Collections: ${money(totals.payments_collected)}`, 90, endY + 16);
  doc.text(`Credit Given: ${money(totals.credit_given)}`, 90, endY + 22);
  doc.text(`Stock In: ${money(totals.stock_added_value)}`, 170, endY + 10);
  doc.text(`Net Profit: ${money(totals.net_profit)}`, 170, endY + 16);

  doc.save(`daily-register-${from}-to-${to}.pdf`);
}

export interface SupplierLedgerPdfData {
  supplier: { name: string; phone?: string; business_name?: string };
  totalDebit: number;
  totalCredit: number;
  balance: number;
  entries: Array<{
    date: string;
    type: 'purchase' | 'payment';
    description: string;
    qty?: number;
    rate?: number;
    debit: number;
    credit: number;
    balance: number;
    payment_status?: string;
  }>;
  productSummary: Array<{
    productName: string;
    brandName: string | null;
    totalQty: number;
    totalCost: number;
    totalPaid: number;
    balance: number;
  }>;
}

export function downloadSupplierLedgerPdf(data: SupplierLedgerPdfData) {
  const { supplier, totalDebit, totalCredit, balance, entries, productSummary } = data;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // ── Header bar ──
  doc.setFillColor(26, 32, 44);
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(APP_NAME, 14, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(245, 158, 11);
  doc.text('Cement Steel Dealer', 14, 20);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text('Dealer Account Statement', 14, 27);
  doc.text(new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }), pageWidth - 14, 18, { align: 'right' });
  doc.setTextColor(33, 37, 41);

  // ── Supplier info box ──
  doc.setDrawColor(220, 226, 232);
  doc.roundedRect(14, 38, pageWidth - 28, 22, 2, 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(supplier.name, 18, 46);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const infoLine = [supplier.phone, supplier.business_name].filter(Boolean).join('   ·   ');
  if (infoLine) doc.text(infoLine, 18, 53);

  // ── Summary boxes ──
  const boxY = 66;
  const boxes = [
    { label: 'TOTAL PURCHASED', val: totalDebit, color: [38, 53, 72] as [number, number, number] },
    { label: 'PAID', val: totalCredit, color: [22, 163, 74] as [number, number, number] },
    { label: 'BALANCE DUE', val: balance, color: balance > 0 ? ([239, 68, 68] as [number, number, number]) : ([22, 163, 74] as [number, number, number]) },
  ];
  const bw = (pageWidth - 28 - 6) / 3;
  boxes.forEach(({ label, val, color }, i) => {
    const bx = 14 + i * (bw + 3);
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(bx, boxY, bw, 20, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(label, bx + bw / 2, boxY + 6, { align: 'center' });
    doc.setFontSize(11);
    doc.text(money(val), bx + bw / 2, boxY + 14, { align: 'center' });
  });
  doc.setTextColor(33, 37, 41);

  let startY = boxY + 28;

  // ── Transaction Ledger ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Transaction Ledger', 14, startY);
  startY += 2;
  autoTable(doc, {
    startY,
    head: [['Date', 'Type', 'Description', 'Qty', 'Rate', 'Debit', 'Credit', 'Balance']],
    body: entries.map((e) => [
      new Date(e.date).toLocaleDateString('en-PK', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      e.type === 'purchase' ? 'DR' : 'CR',
      e.description + (e.payment_status && e.type === 'purchase' ? ` [${e.payment_status}]` : ''),
      e.qty != null ? String(e.qty) : '—',
      e.rate != null ? money(e.rate) : '—',
      e.debit > 0 ? money(e.debit) : '—',
      e.credit > 0 ? money(e.credit) : '—',
      money(e.balance),
    ]),
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [38, 53, 72], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 9, halign: 'center' },
      2: { cellWidth: 'auto' },
      3: { halign: 'right', cellWidth: 14 },
      4: { halign: 'right', cellWidth: 24 },
      5: { halign: 'right', cellWidth: 26 },
      6: { halign: 'right', cellWidth: 26 },
      7: { halign: 'right', cellWidth: 26, fontStyle: 'bold' },
    },
    foot: [['', '', 'TOTAL', '', '', money(totalDebit), money(totalCredit), money(balance)]],
    footStyles: { fillColor: [38, 53, 72], textColor: 255, fontStyle: 'bold', halign: 'right' },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.index === 1) {
        const val = hookData.cell.raw as string;
        hookData.cell.styles.textColor = val === 'DR' ? [220, 38, 38] : [22, 163, 74];
        hookData.cell.styles.fontStyle = 'bold';
      }
      if (hookData.section === 'body' && hookData.column.index === 5 && hookData.cell.raw !== '—') {
        hookData.cell.styles.textColor = [220, 38, 38];
      }
      if (hookData.section === 'body' && hookData.column.index === 6 && hookData.cell.raw !== '—') {
        hookData.cell.styles.textColor = [22, 163, 74];
      }
    },
  });
  startY = (doc as any).lastAutoTable?.finalY + 10;

  // ── Product Summary ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Product Summary', 14, startY);
  startY += 2;
  autoTable(doc, {
    startY,
    head: [['Product', 'Brand', 'Total Qty', 'Total Cost', 'Paid', 'Balance']],
    body: productSummary.map((r) => [
      r.productName,
      r.brandName || '—',
      r.totalQty.toLocaleString(),
      money(r.totalCost),
      money(r.totalPaid),
      money(r.balance),
    ]),
    theme: 'striped',
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [38, 53, 72], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 35 },
      2: { halign: 'right', cellWidth: 22 },
      3: { halign: 'right', cellWidth: 25 },
      4: { halign: 'right', cellWidth: 25 },
      5: { halign: 'right', cellWidth: 25, fontStyle: 'bold' },
    },
    foot: [[
      'TOTAL', '',
      productSummary.reduce((s, r) => s + r.totalQty, 0).toLocaleString(),
      money(productSummary.reduce((s, r) => s + r.totalCost, 0)),
      money(productSummary.reduce((s, r) => s + r.totalPaid, 0)),
      money(productSummary.reduce((s, r) => s + r.balance, 0)),
    ]],
    footStyles: { fillColor: [38, 53, 72], textColor: 255, fontStyle: 'bold', halign: 'right' },
  });

  // ── Footer ──
  const footerY = (doc as any).lastAutoTable?.finalY + 10;
  doc.setDrawColor(220, 226, 232);
  doc.line(14, footerY, pageWidth - 14, footerY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 130, 145);
  doc.text(APP_NAME, 14, footerY + 6);
  doc.text(`Generated on ${new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageWidth - 14, footerY + 6, { align: 'right' });

  const safeName = supplier.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  doc.save(`supplier-statement-${safeName}.pdf`);
}

export interface CustomerLedgerPdfData {
  customer: { name: string; phone?: string; address?: string };
  totalDebit: number;
  totalCredit: number;
  balance: number;
  entries: Array<{
    date: string;
    type: 'sale' | 'payment';
    description: string;
    debit: number;
    credit: number;
    balance: number;
    payment_status?: string;
  }>;
  salesHistory: Array<{
    date: string;
    items_summary: string;
    total_amount: number;
    paid_amount: number;
    pending_amount: number;
    status: string;
  }>;
}

export function downloadCustomerLedgerPdf(data: CustomerLedgerPdfData) {
  const { customer, totalDebit, totalCredit, balance, entries, salesHistory } = data;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // ── Header bar ──
  doc.setFillColor(26, 32, 44);
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(APP_NAME, 14, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(245, 158, 11);
  doc.text('Cement Steel Dealer', 14, 20);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text('Customer Account Statement', 14, 27);
  doc.text(new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }), pageWidth - 14, 18, { align: 'right' });
  doc.setTextColor(33, 37, 41);

  // ── Customer info box ──
  doc.setDrawColor(220, 226, 232);
  doc.roundedRect(14, 38, pageWidth - 28, 22, 2, 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(customer.name, 18, 46);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const infoLine = [customer.phone, customer.address].filter(Boolean).join('   ·   ');
  if (infoLine) doc.text(infoLine, 18, 53);

  // ── Summary boxes ──
  const boxY = 66;
  const boxes = [
    { label: 'TOTAL BILLED', val: totalDebit, color: [38, 53, 72] as [number, number, number] },
    { label: 'COLLECTED', val: totalCredit, color: [22, 163, 74] as [number, number, number] },
    { label: 'BALANCE DUE', val: balance, color: balance > 0 ? ([239, 68, 68] as [number, number, number]) : ([22, 163, 74] as [number, number, number]) },
  ];
  const bw = (pageWidth - 28 - 6) / 3;
  boxes.forEach(({ label, val, color }, i) => {
    const bx = 14 + i * (bw + 3);
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(bx, boxY, bw, 20, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(label, bx + bw / 2, boxY + 6, { align: 'center' });
    doc.setFontSize(11);
    doc.text(money(val), bx + bw / 2, boxY + 14, { align: 'center' });
  });
  doc.setTextColor(33, 37, 41);

  let startY = boxY + 28;

  // ── Transaction Ledger ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Transaction Ledger', 14, startY);
  startY += 2;
  autoTable(doc, {
    startY,
    head: [['Date', 'Type', 'Description', 'Debit', 'Credit', 'Balance']],
    body: entries.map((e) => [
      new Date(e.date).toLocaleDateString('en-PK', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      e.type === 'sale' ? 'DR' : 'CR',
      e.description + (e.payment_status && e.type === 'sale' ? ` [${e.payment_status}]` : ''),
      e.debit > 0 ? money(e.debit) : '—',
      e.credit > 0 ? money(e.credit) : '—',
      money(e.balance),
    ]),
    theme: 'striped',
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [38, 53, 72], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 'auto' },
      3: { halign: 'right', cellWidth: 28 },
      4: { halign: 'right', cellWidth: 28 },
      5: { halign: 'right', cellWidth: 30, fontStyle: 'bold' },
    },
    foot: [['', '', 'TOTAL', money(totalDebit), money(totalCredit), money(balance)]],
    footStyles: { fillColor: [38, 53, 72], textColor: 255, fontStyle: 'bold', halign: 'right' },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.index === 1) {
        const val = hookData.cell.raw as string;
        hookData.cell.styles.textColor = val === 'DR' ? [220, 38, 38] : [22, 163, 74];
        hookData.cell.styles.fontStyle = 'bold';
      }
      if (hookData.section === 'body' && hookData.column.index === 3 && hookData.cell.raw !== '—') {
        hookData.cell.styles.textColor = [220, 38, 38];
      }
      if (hookData.section === 'body' && hookData.column.index === 4 && hookData.cell.raw !== '—') {
        hookData.cell.styles.textColor = [22, 163, 74];
      }
    },
  });
  startY = (doc as any).lastAutoTable?.finalY + 10;

  // ── Sales History ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Sales History', 14, startY);
  startY += 2;
  autoTable(doc, {
    startY,
    head: [['Date', 'Items', 'Billed', 'Collected', 'Total Due Balance', 'Status']],
    body: salesHistory.map((s) => [
      new Date(s.date).toLocaleDateString('en-PK', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      s.items_summary || '—',
      money(s.total_amount),
      money(s.paid_amount),
      money(s.pending_amount),
      s.status.toUpperCase(),
    ]),
    theme: 'striped',
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [38, 53, 72], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 'auto' },
      2: { halign: 'right', cellWidth: 28 },
      3: { halign: 'right', cellWidth: 28 },
      4: { halign: 'right', cellWidth: 28 },
      5: { halign: 'center', cellWidth: 22 },
    },
    foot: [['', 'TOTAL', money(totalDebit), money(totalCredit), money(balance), '']],
    footStyles: { fillColor: [38, 53, 72], textColor: 255, fontStyle: 'bold', halign: 'right' },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.index === 5) {
        const val = (hookData.cell.raw as string).toLowerCase();
        hookData.cell.styles.textColor =
          val === 'paid' ? [22, 163, 74] :
          val === 'partial' ? [217, 119, 6] :
          [220, 38, 38];
        hookData.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // ── Footer ──
  const footerY = (doc as any).lastAutoTable?.finalY + 10;
  doc.setDrawColor(220, 226, 232);
  doc.line(14, footerY, pageWidth - 14, footerY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 130, 145);
  doc.text(APP_NAME, 14, footerY + 6);
  doc.text(`Generated on ${new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageWidth - 14, footerY + 6, { align: 'right' });

  const safeName = customer.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  doc.save(`customer-statement-${safeName}.pdf`);
}

export interface ReportPdfData {
  from?: string;
  to?: string;
  summary: {
    totalSales: number;
    totalProfit: number;
    totalExpenses?: number;
    netProfit?: number;
    customerReceivable: number;
    millPayable: number;
  };
  profitRows: Array<{ product: string; quantity: number; cost: number; gross_sales?: number; discount?: number; sales: number; profit: number }>;
  stockRows: Array<{ product_name: string; current_stock: number; unit: string }>;
  topCustomers: Array<{ name: string; total: number }>;
}

export function downloadReportPdf(data: ReportPdfData) {
  const { from, to, summary, profitRows, stockRows, topCustomers } = data;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(26, 32, 44);
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(APP_NAME, 14, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(245, 158, 11);
  doc.text('Cement Steel Dealer', 14, 20);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text('Business Summary Report', 14, 27);
  const dateLabel = from && to ? `Period: ${from}  to  ${to}` : new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.text(dateLabel, pageWidth - 14, 18, { align: 'right' });
  doc.setTextColor(33, 37, 41);

  // Summary boxes
  const boxes = [
    { label: 'Total Sales', val: summary.totalSales, color: [16, 185, 129] as [number, number, number] },
    { label: 'Gross Profit', val: summary.totalProfit, color: [22, 163, 74] as [number, number, number] },
    { label: 'Expenses Deducted', val: summary.totalExpenses ?? 0, color: [220, 38, 38] as [number, number, number] },
    { label: 'Net Profit', val: summary.netProfit ?? summary.totalProfit, color: [2, 132, 199] as [number, number, number] },
    { label: 'Customer Receivable', val: summary.customerReceivable, color: [239, 68, 68] as [number, number, number] },
    { label: 'Dealer Payable', val: summary.millPayable, color: [245, 158, 11] as [number, number, number] },
  ];
  const boxW = (pageWidth - 28 - 5 * 3) / 6;
  boxes.forEach(({ label, val, color }, i) => {
    const x = 14 + i * (boxW + 3);
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(x, 38, boxW, 22, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text(label.toUpperCase(), x + boxW / 2, 44, { align: 'center' });
    doc.setFontSize(8);
    doc.text(money(val), x + boxW / 2, 53, { align: 'center' });
  });
  doc.setTextColor(33, 37, 41);

  let startY = 68;

  // Product-wise Profit table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Product-wise Sales & Profit', 14, startY);
  startY += 2;
  autoTable(doc, {
    startY,
    head: [['Product', 'Qty', 'Purchased', 'Gross Sold', 'Discount', 'Net Sold', 'Profit']],
    body: profitRows.map((r) => [r.product, String(r.quantity), money(r.cost), money(r.gross_sales ?? r.sales), r.discount ? `- ${money(r.discount)}` : '—', money(r.sales), money(r.profit)]),
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [38, 53, 72], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right', textColor: [180, 120, 0] },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
    foot: [[
      'TOTAL', '',
      money(profitRows.reduce((s, r) => s + r.cost, 0)),
      money(profitRows.reduce((s, r) => s + (r.gross_sales ?? r.sales), 0)),
      `- ${money(profitRows.reduce((s, r) => s + (r.discount ?? 0), 0))}`,
      money(profitRows.reduce((s, r) => s + r.sales, 0)),
      money(profitRows.reduce((s, r) => s + r.profit, 0)),
    ]],
    footStyles: { fillColor: [38, 53, 72], textColor: 255, fontStyle: 'bold' },
  });
  startY = (doc as any).lastAutoTable?.finalY + 4;

  // Profit summary (gross → expenses → net)
  if (summary.totalExpenses !== undefined) {
    const grossP = summary.totalProfit;
    const expP = summary.totalExpenses;
    const netP = summary.netProfit ?? grossP;
    const summaryBoxes: [string, number, [number, number, number]][] = [
      ['Gross Profit (from sales)', grossP, [22, 163, 74]],
      ['Less: Total Expenses', expP, [220, 38, 38]],
      ['= Net Profit', netP, netP >= 0 ? [2, 132, 199] : [185, 28, 28]],
    ];
    const sw = (pageWidth - 28 - 6) / 3;
    summaryBoxes.forEach(([lbl, val, col], i) => {
      const sx = 14 + i * (sw + 3);
      doc.setFillColor(col[0], col[1], col[2]);
      doc.roundedRect(sx, startY, sw, 18, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(lbl.toUpperCase(), sx + sw / 2, startY + 6, { align: 'center' });
      doc.setFontSize(10);
      doc.text(money(val), sx + sw / 2, startY + 13, { align: 'center' });
    });
    startY += 24;
  } else {
    startY += 4;
  }

  // Stock Report table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Stock Report', 14, startY);
  startY += 2;
  autoTable(doc, {
    startY,
    head: [['Product', 'Current Stock', 'Unit']],
    body: stockRows.map((r) => [r.product_name, String(r.current_stock), r.unit]),
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [38, 53, 72], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { halign: 'right' },
      2: { halign: 'right' },
    },
  });
  startY = (doc as any).lastAutoTable?.finalY + 8;

  // Top Customers table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Top Customers', 14, startY);
  startY += 2;
  autoTable(doc, {
    startY,
    head: [['Customer', 'Purchase Volume']],
    body: topCustomers.map((r) => [r.name, money(r.total)]),
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [38, 53, 72], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { halign: 'right' },
    },
  });

  const footerY = (doc as any).lastAutoTable?.finalY + 12;
  doc.setDrawColor(220, 226, 232);
  doc.line(14, footerY, pageWidth - 14, footerY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 130, 145);
  doc.text(APP_NAME, 14, footerY + 6);
  doc.text(`Generated on ${new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageWidth - 14, footerY + 6, { align: 'right' });

  const suffix = from && to ? `${from}-to-${to}` : new Date().toISOString().slice(0, 10);
  doc.save(`business-report-${suffix}.pdf`);
}

export function downloadDayDetailPdf(detail: DayDetailPdfData) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text('Daily Detail Report', 14, 14);
  doc.setFontSize(10);
  doc.text(`Date: ${detail.date}`, 14, 20);

  doc.text(`Total Sales: ${money(detail.summary.total_sales)}`, 14, 28);
  doc.text(`Cash + Collections: ${money(detail.summary.cash_collected + detail.summary.payments_collected)}`, 14, 34);
  doc.text(`Credit Given: ${money(detail.summary.credit_given)}`, 14, 40);
  doc.text(`Stock Value: ${money(detail.summary.stock_value)}`, 110, 28);
  doc.text(`Collections: ${money(detail.summary.payments_collected)}`, 110, 34);
  doc.text(`Profit: ${money(detail.summary.profit)}`, 110, 40);

  let startY = 46;

  if (detail.sales.length > 0) {
    autoTable(doc, {
      startY,
      head: [['Sales', 'Customer', 'Total', 'Paid', 'Pending', 'Type', 'Status']],
      body: detail.sales.map((s) => [
        `#${s.id}`,
        s.customer_name,
        money(s.total_amount),
        money(s.paid_amount),
        money(s.remaining_amount),
        s.payment_type,
        s.status,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 55, 72] },
    });
    startY = (doc as any).lastAutoTable?.finalY + 8;
  }

  if (detail.stock_movements.length > 0) {
    autoTable(doc, {
      startY,
      head: [['Stock In', 'Supplier', 'Product', 'Qty', 'Rate', 'Total']],
      body: detail.stock_movements.map((s) => [
        '',
        s.supplier,
        s.product,
        `${s.quantity} ${s.unit}`,
        money(s.purchase_rate),
        money(s.total_value),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 55, 72] },
    });
    startY = (doc as any).lastAutoTable?.finalY + 8;
  }

  if (detail.payments_received.length > 0) {
    autoTable(doc, {
      startY,
      head: [['Collections', 'Customer', 'Amount', 'Method', 'Notes']],
      body: detail.payments_received.map((p) => [
        '',
        p.customer_name,
        money(p.amount),
        p.method,
        p.notes || '',
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 55, 72] },
    });
  }

  doc.save(`daily-detail-${detail.date}.pdf`);
}
