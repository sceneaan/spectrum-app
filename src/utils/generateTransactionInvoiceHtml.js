import { file_url } from '../config/environment';

// Format date consistently
const formatDate = (dateString, includeTime = false) => {
  if (!dateString) { return 'N/A'; }
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) { return 'N/A'; }

    if (includeTime) {
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    return 'N/A';
  }
};

// Safe string accessor
const safeString = (value) => {
  if (value === null || value === undefined) { return 'N/A'; }
  if (typeof value === 'string') { return value; }
  if (typeof value === 'object') {
    return value.fullName || value.name || value.nameEnglish || 'N/A';
  }
  return String(value);
};

// Format amount with proper sign and Riyal icon (inline SVG similar to RiyalText component)
const formatAmount = (amount, type = null, includeIcon = true) => {
  const absAmount = Math.abs(Number(amount || 0));
  const sign = (type === 'refund' || type === 'withdraw') ? '-' : '';
  const formattedAmount = `${sign}${absAmount.toFixed(2)}`;

  if (includeIcon) {
    // Inline SVG Riyal icon (matching RiyalText component style)
    const riyalIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; margin: 0 3px;">
      <text x="50%" y="70%" text-anchor="middle" font-size="20" font-weight="bold" fill="currentColor">﷼</text>
    </svg>`;
    return `${riyalIcon} ${formattedAmount}`;
  }

  return formattedAmount;
};

// Get transaction title based on type
const getTransactionTitle = (type) => {
  if (!type) { return 'Transaction Receipt'; }
  const typeMap = {
    payment: 'Payment Transaction',
    refund: 'Refund Transaction',
    deposit: 'Deposit Transaction',
    withdraw: 'Withdrawal Transaction',
    redeem: 'Support Card Redemption',
    wallet: 'Wallet Transaction',
  };
  return typeMap[type.toLowerCase()] || 'Transaction Receipt';
};

export const generateTransactionInvoiceHTML = (transaction, providerName, patientName, appointment = null, qrCodeDataURL = null) => {
  const transactionTitle = getTransactionTitle(transaction?.type);
  const transactionId = (transaction?.slug || transaction?.id || 'N/A').toString().toUpperCase();

  // Calculate amounts
  const grossAmount = Number(transaction?.grossAmount || transaction?.netAmount || 0);
  const discount = Number(transaction?.discount || 0);
  const tax = Number(transaction?.tax || 0);
  const supportCardAmount = Number(transaction?.supportCardAmount || 0);
  const netAmount = Number(transaction?.netAmount || 0);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <title>${transactionTitle}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: Arial, sans-serif;
            line-height: 1.4;
            color: #000000;
            background: white;
            margin: 0;
            padding: 0;
          }

          .page {
            width: 100%;
            min-height: 100vh;
            position: relative;
          }

          .header-image {
            width: 100%;
            height: auto;
            display: block;
          }

          .footer-image {
            width: 100%;
            height: auto;
            display: block;
          }

          .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }

          .separator-line {
            width: 100%;
            border: none;
            border-top: 1px solid #000000;
            margin: 10px 0;
          }

          .document-title {
            font-size: 20px;
            font-weight: bold;
            color: #000000;
            text-align: center;
            margin: 15px 0;
          }

          .section-header {
            font-size: 14px;
            font-weight: bold;
            color: #000000;
            margin-bottom: 10px;
            text-transform: uppercase;
          }

          .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 5px;
            margin-bottom: 15px;
          }

          .detail-item {
            margin-bottom: 0px;
            white-space: nowrap;
            line-height: 1.2;
          }

          .detail-label {
            font-weight: bold;
            font-size: 12px;
            color: #000000;
            margin-bottom: 1px;
            display: inline;
          }

          .detail-value {
            font-size: 12px;
            color: #000000;
            font-weight: normal;
            display: inline;
          }

          .payment-summary {
            margin-bottom: 15px;
          }

          .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
          }

          .summary-table th {
            padding: 6px 5px;
            text-align: left;
            border-bottom: 1px solid #cccccc;
            font-size: 12px;
            font-weight: bold;
            color: #000000;
          }

          .summary-table th:last-child {
            text-align: right;
          }

          .summary-table td {
            padding: 6px 5px;
            font-size: 12px;
            color: #000000;
            border-bottom: 1px solid #cccccc;
          }

          .summary-table td:last-child {
            text-align: right;
          }

          .summary-table tr:last-child td {
            border-bottom: none;
          }

          .total-row {
            font-weight: bold;
          }

          .footer-notes {
            text-align: center;
            font-size: 11px;
            color: #000000;
            font-style: italic;
            margin: 15px 0;
          }

          .qr-code-container {
            text-align: center;
            margin: 15px 0;
          }

          .qr-code-image {
            width: 120px;
            height: 120px;
            display: block;
            margin: 0 auto;
          }

          .footer-bottom {
            border-top: 1px solid #000000;
            padding-top: 8px;
            margin-top: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 10px;
            color: #000000;
          }

          .address-info {
            display: flex;
            align-items: center;
          }

          .location-icon {
            width: 12px;
            height: 12px;
            margin-right: 5px;
          }

          .address-text {
            direction: rtl;
            text-align: right;
          }

          .generated-time {
            text-align: right;
            font-size: 10px;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <img class="header-image" src="${file_url}/uploads/document-header.png" alt="Header" />
          
          <div class="container">
            <!-- Document Title -->
            <div class="document-title">Payment Receipt</div>

            <hr class="separator-line" />

            <!-- Transaction Details -->
            <div class="section-header">Transaction Details</div>
            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-label">Date:</span> <span class="detail-value">${formatDate(transaction?.createdAt, true)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Transaction ID:</span> <span class="detail-value">${transactionId}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Service:</span> <span class="detail-value">${safeString(transaction?.serviceName || 'N/A')}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Provider:</span> <span class="detail-value">${safeString(transaction?.provider?.fullName || providerName)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Patient:</span> <span class="detail-value">${safeString(transaction?.patient?.fullName || patientName)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Payment Method:</span> <span class="detail-value">${safeString(transaction?.paymentMethod)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Payment Status:</span> <span class="detail-value" style="color: #28a745; font-weight: bold;">${safeString(transaction?.status || 'Completed')} ✓</span>
              </div>
              ${appointment?.status ? `
              <div class="detail-item">
                <span class="detail-label">Appointment Status:</span> <span class="detail-value" style="color: ${appointment.status === 'Confirmed' ? '#28a745' : appointment.status === 'Pending' ? '#fd7e14' : '#6c757d'}; font-weight: bold;">${appointment.status}</span>
              </div>
              ` : ''}
              <div class="detail-item">
                <span class="detail-label">Consultation Date:</span> <span class="detail-value">${transaction?.consultationDate || appointment?.startTime ? formatDate(transaction?.consultationDate || appointment?.startTime) : 'N/A'}</span>
              </div>
            </div>

            <hr class="separator-line" />

            <!-- Payment Summary -->
            <div class="section-header">Payment Summary</div>
            <div class="payment-summary">
              <table class="summary-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Amount (SAR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Consultation Fee</td>
                    <td>${formatAmount(grossAmount, null, true)}</td>
                  </tr>
                  ${discount > 0 ? `
                  <tr>
                    <td>Discount</td>
                    <td>${formatAmount(discount, 'refund', true)}</td>
                  </tr>
                  ` : ''}
                  ${tax > 0 ? `
                  <tr>
                    <td>Tax</td>
                    <td>${formatAmount(tax, null, true)}</td>
                  </tr>
                  ` : ''}
                  ${supportCardAmount > 0 ? `
                  <tr>
                    <td>Support Card</td>
                    <td>${formatAmount(supportCardAmount, 'refund', true)}</td>
                  </tr>
                  ` : ''}
                  <tr class="total-row">
                    <td>Total Paid</td>
                    <td>${formatAmount(netAmount, transaction?.type)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Footer Notes -->
            <div class="footer-notes">
              <div>This is an electronically generated receipt and does not require a signature.</div>
              <div style="margin-top: 5px;">Thank you for using our services!</div>
            </div>

            <!-- QR Code Section (under Additional Notes) -->
            ${qrCodeDataURL ? `
            <div style="border: 1px solid #DEE2E6; border-radius: 8px; margin-top: 20px; overflow: hidden;">
              <div style="background-color: #E9ECEF; padding: 10px 15px; border-bottom: 1px solid #DEE2E6; font-weight: bold; font-size: 14px; color: #495057; text-align: center;">
                E-Invoice QR Code
              </div>
              <div class="qr-code-container" style="padding: 20px;">
                <img class="qr-code-image" src="${qrCodeDataURL}" alt="E-Invoice QR Code" />
                <div style="font-size: 11px; color: #6C757D; margin-top: 10px; text-align: center;">
                  Scan to verify invoice
                </div>
              </div>
            </div>
            ` : ''}

            <div class="generated-time">Generated on: ${formatDate(new Date(), true)}</div>
          </div>
         <img class="footer-image" src="${file_url}/uploads/document-footer.png" alt="Footer" />
        </div>
      </body>
    </html>
  `;
};

