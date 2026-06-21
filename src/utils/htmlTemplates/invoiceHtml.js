import environment from '../../config/environment';

const FILE_URL = environment.file_url;

/**
 * Generate Invoice HTML matching web PatientBillingPDF design
 * Supports Arabic/RTL with bilingual labels (Arabic + English)
 * ZATCA Phase 1 compliant
 * @param {Object} transaction - Transaction data
 * @param {boolean} isArabic - RTL language support
 * @param {string} qrCodeBase64 - QR code base64 string
 * @param {Object} invoiceData - Invoice data from backend (contains vatNumber)
 */
export const generateInvoiceHTML = (transaction, isArabic = false, qrCodeBase64 = null, invoiceData = null) => {
  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '0.00';
    return typeof amount === 'number' ? amount.toFixed(2) : '0.00';
  };

  // Get company info from invoice data (from backend CompanySettings), with fallbacks
  // Backend returns: { invoice: { metadata: { vatNumber, sellerName, sellerNameArabic, crn } } }
  const DEFAULT_VAT_NUMBER = '300000000000003';
  const DEFAULT_COMPANY_NAME_EN = 'Spectrum Healthcare';
  const DEFAULT_COMPANY_NAME_AR = 'سبيكترم للرعاية الصحية';

  const vatNumber = invoiceData?.invoice?.metadata?.vatNumber || invoiceData?.invoice?.vatNumber || invoiceData?.metadata?.vatNumber || transaction?.vatNumber || DEFAULT_VAT_NUMBER;
  const companyNameEn = invoiceData?.invoice?.metadata?.sellerName || DEFAULT_COMPANY_NAME_EN;
  const companyNameAr = invoiceData?.invoice?.metadata?.sellerNameArabic || DEFAULT_COMPANY_NAME_AR;

  // Bilingual labels (Arabic + English) - matching web PDF
  const labels = {
    // Title based on transaction type
    taxInvoice: { ar: 'فاتورة ضريبية مبسطة', en: 'Simplified Tax Invoice' },
    creditNote: { ar: 'إشعار دائن', en: 'Credit Note' },
    deposit: { ar: 'إيصال إيداع', en: 'Deposit Receipt' },
    withdraw: { ar: 'إيصال سحب', en: 'Withdrawal Receipt' },
    receipt: { ar: 'إيصال', en: 'Receipt' },
    redemption: { ar: 'إيصال استبدال بطاقة الدعم', en: 'Support Card Redemption' },
    // Seller/Buyer section
    seller: { ar: 'البائع', en: 'Seller' },
    buyer: { ar: 'المشتري', en: 'Buyer' },
    company: { ar: companyNameAr, en: companyNameEn },
    vat: { ar: 'الرقم الضريبي', en: 'VAT No' },
    // Details grid
    invoiceNo: { ar: 'رقم الفاتورة', en: 'Invoice No' },
    date: { ar: 'التاريخ', en: 'Date' },
    method: { ar: 'طريقة الدفع', en: 'Payment Method' },
    status: { ar: 'الحالة', en: 'Status' },
    // Items table
    description: { ar: 'البيان', en: 'Description' },
    qty: { ar: 'الكمية', en: 'Qty' },
    price: { ar: 'السعر', en: 'Price' },
    amount: { ar: 'المبلغ', en: 'Amount' },
    // Totals
    subtotal: { ar: 'المجموع الفرعي', en: 'Subtotal' },
    discount: { ar: 'الخصم', en: 'Discount' },
    vatAmount: { ar: 'ضريبة القيمة المضافة', en: 'VAT (15%)' },
    total: { ar: 'الإجمالي', en: 'Total' },
    // QR and disclaimer
    scan: { ar: 'امسح للتحقق', en: 'Scan to verify' },
    disclaimer: {
      ar: 'فاتورة إلكترونية وفقاً لمتطلبات هيئة الزكاة والضريبة',
      en: 'E-invoice per ZATCA requirements'
    },
  };

  // Get title based on transaction type
  const getTitle = () => {
    const type = transaction?.type || 'payment';
    switch (type) {
      case 'payment': return labels.taxInvoice;
      case 'refund': return labels.creditNote;
      case 'deposit': return labels.deposit;
      case 'withdraw': return labels.withdraw;
      case 'redeem': return labels.redemption;
      default: return labels.receipt;
    }
  };

  const title = getTitle();
  const grossAmount = transaction?.fee || transaction?.grossAmount || transaction?.netAmount || 0;
  const taxAmount = transaction?.tax || 0;
  const discountAmount = transaction?.discount || 0;
  const netAmount = transaction?.netAmount || 0;
  const serviceName = transaction?.serviceNameArabic || transaction?.serviceName || 'استشارة';
  const serviceNameEn = transaction?.serviceName || 'Consultation';
  const customerName = transaction?.patient?.fullName || 'N/A';
  const isCompleted = transaction?.status?.toLowerCase() === 'completed';
  const paymentMethod = transaction?.paymentMethod || 'N/A';

  // Colors matching web PDF
  const COLORS = {
    primary: '#64BED6',
    black: '#000000',
    darkGrey: '#333333',
    mediumGrey: '#666666',
    lightGrey: '#999999',
    border: '#EEEEEE',
    background: '#FAFAFA',
    white: '#FFFFFF',
    green: '#28A745',
    greenLight: '#D4EDDA',
    yellow: '#FFC107',
    yellowLight: '#FFF3CD',
    red: '#DC3545',
  };

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
      <title>${title.ar}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap');

        @page {
          size: A4;
          margin: 8mm;
        }

        @media print {
          html, body {
            width: 210mm;
            height: 297mm;
          }
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html {
          background: #f0f0f0;
        }

        body {
          font-family: 'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif;
          font-size: 10px;
          line-height: 1.4;
          color: ${COLORS.black};
          background: ${COLORS.white};
          direction: rtl;
          text-align: right;
          padding: 10px;
          width: 100%;
          max-width: 210mm;
          min-height: 100vh;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
        }

        .container {
          width: 100%;
          margin: 0 auto;
          background: ${COLORS.white};
          flex: 1;
          padding: 0 15px;
        }

        .header-image, .footer-image {
          width: 100%;
          display: block;
        }

        .header-image {
          margin-bottom: 10px;
        }

        .footer-image {
          margin-top: auto;
          flex-shrink: 0;
        }

        /* Title Section - Bilingual */
        .title-section {
          text-align: center;
          margin-bottom: 10px;
          padding-bottom: 8px;
        }

        .title-ar {
          font-size: 16px;
          font-weight: 700;
          color: ${COLORS.black};
          margin-bottom: 2px;
        }

        .title-en {
          font-size: 9px;
          color: ${COLORS.lightGrey};
          font-weight: 400;
        }

        /* Seller/Buyer Info - Two Column RTL */
        .info-container {
          display: flex;
          flex-direction: row-reverse;
          gap: 10px;
          margin-bottom: 10px;
        }

        .info-box {
          flex: 1;
          background: ${COLORS.white};
          padding: 8px;
          border: 0.5px solid ${COLORS.border};
          border-radius: 4px;
        }

        .info-header {
          display: flex;
          flex-direction: row-reverse;
          justify-content: space-between;
          margin-bottom: 6px;
          border-bottom: 0.5px solid ${COLORS.border};
          padding-bottom: 4px;
        }

        .info-header-ar {
          font-size: 10px;
          font-weight: 700;
          color: ${COLORS.black};
        }

        .info-header-en {
          font-size: 7px;
          color: ${COLORS.lightGrey};
        }

        .info-content {
          text-align: right;
        }

        .info-value {
          font-size: 9px;
          color: ${COLORS.black};
          margin-bottom: 2px;
        }

        .info-label-en {
          font-size: 7px;
          color: ${COLORS.lightGrey};
          margin-bottom: 4px;
        }

        .info-vat {
          font-size: 9px;
          color: ${COLORS.black};
          margin-top: 4px;
        }

        /* Details Grid - 4 Columns RTL */
        .details-grid {
          display: flex;
          flex-direction: row-reverse;
          background: ${COLORS.white};
          margin-bottom: 10px;
          padding: 8px 0;
          border: 0.5px solid ${COLORS.border};
          border-radius: 4px;
        }

        .detail-item {
          flex: 1;
          text-align: center;
          border-left: 0.5px solid ${COLORS.border};
          padding: 0 6px;
        }

        .detail-item:first-child {
          border-left: none;
        }

        .detail-label-ar {
          font-size: 8px;
          color: ${COLORS.black};
          margin-bottom: 1px;
        }

        .detail-label-en {
          font-size: 6px;
          color: ${COLORS.lightGrey};
          margin-bottom: 3px;
        }

        .detail-value {
          font-size: 9px;
          font-weight: 700;
          color: ${COLORS.black};
        }

        /* Status Badge */
        .status-badge {
          display: inline-block;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 8px;
          font-weight: 700;
          border: 1px solid;
        }

        .status-completed {
          background: ${COLORS.white};
          border-color: ${COLORS.green};
          color: ${COLORS.green};
        }

        .status-pending {
          background: ${COLORS.yellowLight};
          border-color: ${COLORS.yellow};
          color: #856404;
        }

        /* Items Table */
        .items-table {
          width: 100%;
          margin-bottom: 10px;
          border: 0.5px solid ${COLORS.border};
          border-radius: 4px;
          overflow: hidden;
          border-collapse: collapse;
        }

        .items-table thead {
          background: ${COLORS.background};
        }

        .items-table th {
          padding: 8px 6px;
          text-align: center;
          border-bottom: 0.5px solid ${COLORS.border};
        }

        .items-table th .th-ar {
          font-size: 9px;
          font-weight: 700;
          color: ${COLORS.primary};
          display: block;
        }

        .items-table th .th-en {
          font-size: 6px;
          color: ${COLORS.lightGrey};
          display: block;
        }

        .items-table td {
          padding: 8px 6px;
          text-align: center;
          font-size: 9px;
          color: ${COLORS.black};
          border-bottom: 0.5px solid ${COLORS.border};
        }

        .items-table .td-small {
          font-size: 7px;
          color: ${COLORS.lightGrey};
        }

        /* Totals Box */
        .totals-container {
          display: flex;
          flex-direction: row;
          margin-bottom: 12px;
        }

        .totals-box {
          width: 45%;
          border: 0.5px solid ${COLORS.border};
          border-radius: 4px;
          overflow: hidden;
        }

        .totals-row {
          display: flex;
          flex-direction: row-reverse;
          border-bottom: 0.5px solid ${COLORS.border};
        }

        .totals-row:last-child {
          border-bottom: none;
        }

        .totals-row.total-row {
          background: ${COLORS.background};
        }

        .totals-label {
          flex: 1;
          padding: 6px 8px;
          background: ${COLORS.white};
          border-left: 0.5px solid ${COLORS.border};
          text-align: right;
        }

        .totals-row.total-row .totals-label {
          background: ${COLORS.background};
        }

        .totals-label-ar {
          font-size: 9px;
          color: ${COLORS.black};
        }

        .totals-row.total-row .totals-label-ar {
          font-weight: 700;
          font-size: 10px;
        }

        .totals-label-en {
          font-size: 6px;
          color: ${COLORS.lightGrey};
        }

        .totals-value {
          flex: 1;
          padding: 6px 8px;
          text-align: left;
          display: flex;
          align-items: center;
        }

        .totals-row.total-row .totals-value {
          background: ${COLORS.background};
        }

        .totals-value-text {
          font-size: 9px;
          color: ${COLORS.black};
        }

        .totals-row.total-row .totals-value-text {
          font-weight: 700;
          font-size: 10px;
        }

        .totals-value-text.discount {
          color: ${COLORS.red};
        }

        /* QR Section */
        .qr-section {
          text-align: center;
          padding: 12px 0;
          margin-bottom: 10px;
        }

        .qr-image {
          width: 80px;
          height: 80px;
          margin: 0 auto 6px auto;
          display: block;
        }

        .qr-label-ar {
          font-size: 8px;
          color: ${COLORS.black};
        }

        .qr-label-en {
          font-size: 7px;
          color: ${COLORS.lightGrey};
        }

        /* Disclaimer */
        .disclaimer {
          text-align: center;
          padding-top: 8px;
          border-top: 0.5px solid ${COLORS.border};
        }

        .disclaimer-ar {
          font-size: 8px;
          color: ${COLORS.mediumGrey};
          margin-bottom: 2px;
        }

        .disclaimer-en {
          font-size: 7px;
          color: ${COLORS.lightGrey};
        }

        .timestamp {
          font-size: 7px;
          color: ${COLORS.lightGrey};
          margin-top: 4px;
        }
      </style>
    </head>
    <body>
      <!-- Header Image -->
      <img src="${FILE_URL}/uploads/app/document-header.png" class="header-image" alt="Header" />

      <div class="container">
        <!-- Title Section - Bilingual -->
        <div class="title-section">
          <div class="title-ar">${title.ar}</div>
          <div class="title-en">${title.en}</div>
        </div>

        <!-- Seller & Buyer Info - RTL Two Column -->
        <div class="info-container">
          <!-- Seller (Right side due to row-reverse) -->
          <div class="info-box">
            <div class="info-header">
              <span class="info-header-ar">${labels.seller.ar}</span>
              <span class="info-header-en">${labels.seller.en}</span>
            </div>
            <div class="info-content">
              <div class="info-value">${labels.company.ar}</div>
              <div class="info-label-en">${labels.company.en}</div>
              <div class="info-vat">${labels.vat.ar}: ${vatNumber}</div>
              <div class="info-label-en">${labels.vat.en}: ${vatNumber}</div>
            </div>
          </div>

          <!-- Buyer (Left side due to row-reverse) -->
          <div class="info-box">
            <div class="info-header">
              <span class="info-header-ar">${labels.buyer.ar}</span>
              <span class="info-header-en">${labels.buyer.en}</span>
            </div>
            <div class="info-content">
              <div class="info-value">${customerName}</div>
            </div>
          </div>
        </div>

        <!-- Invoice Details Grid - 4 Columns RTL -->
        <div class="details-grid">
          <div class="detail-item">
            <div class="detail-label-ar">${labels.invoiceNo.ar}</div>
            <div class="detail-label-en">${labels.invoiceNo.en}</div>
            <div class="detail-value">INV-${transaction?.slug || 'N/A'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label-ar">${labels.date.ar}</div>
            <div class="detail-label-en">${labels.date.en}</div>
            <div class="detail-value">${formatDate(transaction?.createdAt)}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label-ar">${labels.method.ar}</div>
            <div class="detail-label-en">${labels.method.en}</div>
            <div class="detail-value">${paymentMethod}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label-ar">${labels.status.ar}</div>
            <div class="detail-label-en">${labels.status.en}</div>
            <span class="status-badge ${isCompleted ? 'status-completed' : 'status-pending'}">
              ${transaction?.status || 'N/A'}
            </span>
          </div>
        </div>

        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 45%;">
                <span class="th-ar">${labels.description.ar}</span>
                <span class="th-en">${labels.description.en}</span>
              </th>
              <th style="width: 15%;">
                <span class="th-ar">${labels.qty.ar}</span>
                <span class="th-en">${labels.qty.en}</span>
              </th>
              <th style="width: 20%;">
                <span class="th-ar">${labels.price.ar}</span>
                <span class="th-en">${labels.price.en}</span>
              </th>
              <th style="width: 20%;">
                <span class="th-ar">${labels.amount.ar}</span>
                <span class="th-en">${labels.amount.en}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                ${serviceName}
                ${transaction?.serviceNameArabic ? `<div class="td-small">${serviceNameEn}</div>` : ''}
              </td>
              <td>1</td>
              <td>${formatCurrency(grossAmount)}</td>
              <td>${formatCurrency(grossAmount)} SAR</td>
            </tr>
          </tbody>
        </table>

        <!-- Totals Box -->
        <div class="totals-container">
          <div class="totals-box">
            <!-- Subtotal -->
            <div class="totals-row">
              <div class="totals-label">
                <div class="totals-label-ar">${labels.subtotal.ar}</div>
                <div class="totals-label-en">${labels.subtotal.en}</div>
              </div>
              <div class="totals-value">
                <span class="totals-value-text">${formatCurrency(grossAmount)} SAR</span>
              </div>
            </div>

            <!-- Discount (if applicable) -->
            ${discountAmount > 0 ? `
            <div class="totals-row">
              <div class="totals-label">
                <div class="totals-label-ar">${labels.discount.ar}</div>
                <div class="totals-label-en">${labels.discount.en}</div>
              </div>
              <div class="totals-value">
                <span class="totals-value-text discount">-${formatCurrency(discountAmount)} SAR</span>
              </div>
            </div>
            ` : ''}

            <!-- VAT -->
            <div class="totals-row">
              <div class="totals-label">
                <div class="totals-label-ar">${labels.vatAmount.ar}</div>
                <div class="totals-label-en">${labels.vatAmount.en}</div>
              </div>
              <div class="totals-value">
                <span class="totals-value-text">${formatCurrency(taxAmount)} SAR</span>
              </div>
            </div>

            <!-- Total -->
            <div class="totals-row total-row">
              <div class="totals-label">
                <div class="totals-label-ar">${labels.total.ar}</div>
                <div class="totals-label-en">${labels.total.en}</div>
              </div>
              <div class="totals-value">
                <span class="totals-value-text">${formatCurrency(Math.abs(netAmount))} SAR</span>
              </div>
            </div>
          </div>
        </div>

        <!-- QR Code Section -->
        ${qrCodeBase64 ? `
        <div class="qr-section">
          <img src="${qrCodeBase64}" class="qr-image" alt="E-Invoice QR Code" />
          <div class="qr-label-ar">${labels.scan.ar}</div>
          <div class="qr-label-en">${labels.scan.en}</div>
        </div>
        ` : ''}

        <!-- Disclaimer -->
        <div class="disclaimer">
          <div class="disclaimer-ar">${labels.disclaimer.ar}</div>
          <div class="disclaimer-en">${labels.disclaimer.en}</div>
          <div class="timestamp">${formatDate(new Date())}</div>
        </div>
      </div>

      <!-- Footer Image -->
      <img src="${FILE_URL}/uploads/app/document-footer.png" class="footer-image" alt="Footer" />
    </body>
    </html>
  `;
};
