export interface ReceiptItem {
  name: string;
  brand?: string;
  quantity: number;
  unit: string;
  rate: number;
  total: number;
}

export interface ReceiptData {
  saleId: number;
  date: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: ReceiptItem[];
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentType: 'cash' | 'credit';
  notes?: string;
}

export function printReceipt(data: ReceiptData) {
  const dateStr = new Date(data.date).toLocaleDateString('en-PK', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const timeStr = new Date().toLocaleTimeString('en-PK', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const itemsHtml = data.items.map((item) => {
    const itemName = item.brand ? `${item.name} (${item.brand})` : item.name;
    return `
      <tr>
        <td style="padding:3px 0; font-size:12px;">${itemName}</td>
        <td style="padding:3px 0; font-size:12px; text-align:center;">${item.quantity} ${item.unit}</td>
        <td style="padding:3px 0; font-size:12px; text-align:right;">${item.rate.toLocaleString()}</td>
        <td style="padding:3px 0; font-size:12px; text-align:right;font-weight:600;">${item.total.toLocaleString()}</td>
      </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Receipt #${data.saleId}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 4mm 4mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      color: #000;
      width: 72mm;
    }
    .center { text-align: center; }
    .right  { text-align: right; }
    .bold   { font-weight: bold; }
    .divider { border: none; border-top: 1px dashed #000; margin: 5px 0; }
    .divider-solid { border: none; border-top: 1px solid #000; margin: 5px 0; }
    .shop-name { font-size:18px; font-weight:bold; text-align:center; letter-spacing:1px; }
    .shop-sub  { font-size:10px; text-align:center; color:#333; margin-top:2px; }
    .receipt-num { font-size:11px; text-align:center; margin-top:4px; }
    table { width:100%; border-collapse:collapse; }
    th { font-size:10px; text-transform:uppercase; padding:3px 0; border-bottom:1px solid #000; }
    th:last-child, td:last-child { text-align:right; }
    th:nth-child(2), td:nth-child(2) { text-align:center; }
    .total-row td { padding-top:5px; font-size:13px; font-weight:bold; }
    .summary-table td { padding:2px 0; font-size:12px; }
    .summary-table .label { width:55%; }
    .summary-table .value { text-align:right; font-weight:600; }
    .status-badge {
      display:inline-block;
      border:1px solid #000;
      padding:1px 8px;
      font-size:11px;
      font-weight:bold;
      border-radius:2px;
    }
    .footer { font-size:10px; text-align:center; margin-top:6px; color:#444; }
    @media print {
      body { width:72mm; }
    }
  </style>
</head>
<body>
  <!-- Shop Header -->
  <div class="shop-name">Steel &amp; Cement POS</div>
  <div class="shop-sub">Receipt / رسید</div>
  <hr class="divider-solid" />

  <!-- Receipt Info -->
  <table class="summary-table" style="margin-bottom:4px;">
    <tr>
      <td class="label">Receipt #:</td>
      <td class="value">${data.saleId}</td>
    </tr>
    <tr>
      <td class="label">Date:</td>
      <td class="value">${dateStr}</td>
    </tr>
    <tr>
      <td class="label">Time:</td>
      <td class="value">${timeStr}</td>
    </tr>
  </table>
  <hr class="divider" />

  <!-- Customer -->
  <table class="summary-table" style="margin-bottom:4px;">
    <tr>
      <td class="label">Customer:</td>
      <td class="value">${data.customerName}</td>
    </tr>
    ${data.customerPhone ? `<tr><td class="label">Phone:</td><td class="value">${data.customerPhone}</td></tr>` : ''}
    ${data.customerAddress ? `<tr><td class="label">Address:</td><td class="value" style="font-size:10px;">${data.customerAddress}</td></tr>` : ''}
  </table>
  <hr class="divider" />

  <!-- Items Table -->
  <table>
    <thead>
      <tr>
        <th style="text-align:left;">Item</th>
        <th>Qty</th>
        <th style="text-align:right;">Rate</th>
        <th style="text-align:right;">Amt</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>
  <hr class="divider" />

  <!-- Totals -->
  <table class="summary-table">
    <tr>
      <td class="label">Sub Total:</td>
      <td class="value">Rs ${data.totalAmount.toLocaleString()}</td>
    </tr>
    <tr>
      <td class="label">Paid:</td>
      <td class="value">Rs ${data.paidAmount.toLocaleString()}</td>
    </tr>
    ${data.pendingAmount > 0 ? `
    <tr>
      <td class="label bold" style="color:#000;">Balance Due:</td>
      <td class="value bold" style="font-size:14px;">Rs ${data.pendingAmount.toLocaleString()}</td>
    </tr>` : ''}
  </table>
  <hr class="divider" />

  <!-- Payment Status -->
  <div class="center" style="margin:4px 0;">
    <span class="status-badge">
      ${data.paymentType === 'cash' ? '✓ CASH PAID' : '★ CREDIT / اُدھار'}
    </span>
  </div>

  ${data.notes ? `<hr class="divider" /><div style="font-size:10px;">Note: ${data.notes}</div>` : ''}

  <hr class="divider-solid" />
  <div class="footer">Thank you for your business!</div>
  <div class="footer">شکریہ</div>
  <br/><br/>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=320,height=600');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
    // Close after print dialog
    win.onafterprint = () => win.close();
  };
}
