import { getPrescriptionTranslations } from './translations';
import environment from '../../config/environment';

const FILE_URL = environment.file_url;

// Signature placeholder for private file replacement by DocumentViewer
const SIGNATURE_PLACEHOLDER = 'PROVIDER_SIGNATURE_PLACEHOLDER';

/**
 * Generate prescription HTML
 * @param {Object} prescription - Prescription data
 * @param {boolean} isArabic - RTL language support
 * @param {Object} options - Additional options
 * @param {string} options.signatureBase64 - Pre-loaded base64 signature image (for private files)
 * @returns {Object} { html: string, privateFileIds: Object } - HTML content and private file IDs for DocumentViewer
 */
export const generatePrescriptionHTML = (prescription, isArabic = false, options = {}) => {
  const { signatureBase64 } = options;
  const t = getPrescriptionTranslations(isArabic);

  // Track private file IDs for DocumentViewer to process
  const privateFileIds = {};

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US');
  };

  const safeString = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      return value.nameEnglish || value.name || value.fullName || 'N/A';
    }
    return String(value);
  };

  const getDoseString = (prescriptionData) => {
    const dose = safeString(prescriptionData?.dose);
    const unit = safeString(prescriptionData?.unit);
    if (dose === 'N/A' && unit === 'N/A') return 'N/A';
    return `${dose} ${unit}`.trim();
  };

  /**
   * Get signature HTML with support for:
   * 1. Pre-loaded base64 signature (signatureBase64)
   * 2. Private file ID (signatureFileId) - uses placeholder for DocumentViewer
   * 3. Legacy URL (signatureUrl)
   */
  const getSignatureHtml = (data, isRTL, preloadedBase64, fileIds) => {
    const noSignatureHtml = `<div style="width: 150px; height: 60px; border: 2px dashed #ccc; border-radius: 4px; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; color: #aaa; font-size: 11px; background-color: #f9f9f9;">${isRTL ? 'لا يوجد توقيع' : 'No Signature'}</div>`;

    // Priority 1: Pre-loaded base64 signature (already fetched for private files)
    if (preloadedBase64) {
      return `<img src="${preloadedBase64}" alt="Signature" class="signature-image" onerror="this.style.display='none'" />`;
    }

    // Priority 2: Check for signatureFileId (new secure system) - use placeholder
    const signatureFileId = data?.providerSignatureFileId || data?.provider?.signatureFileId;
    if (signatureFileId) {
      // Register the fileId for DocumentViewer to process
      fileIds[SIGNATURE_PLACEHOLDER] = signatureFileId;
      return `<img src="${SIGNATURE_PLACEHOLDER}" alt="Signature" class="signature-image" onerror="this.style.display='none'" />`;
    }

    // Priority 3: Legacy URL (providerSignatureUrl or provider.signatureUrl)
    const legacyUrl = data?.providerSignatureUrl || data?.provider?.signatureUrl || data?.provider?.signature;
    if (legacyUrl && legacyUrl.trim() !== '') {
      return `<img src="${legacyUrl}" alt="Signature" class="signature-image" onerror="this.style.display='none'" />`;
    }

    // No signature available
    return noSignatureHtml;
  };

  const isRTL = isArabic;
  const textAlign = isRTL ? 'right' : 'left';
  const direction = isRTL ? 'rtl' : 'ltr';

  const html = `
    <!DOCTYPE html>
    <html dir="${direction}" lang="${isArabic ? 'ar' : 'en'}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
      <title>${isArabic ? 'الوصفة الطبية' : 'Prescription'}</title>
      <style>
        /* A4 Page Size for print */
        @page {
          size: A4;
          margin: 10mm;
        }

        @media print {
          html, body {
            width: 210mm;
            min-height: 297mm;
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
          font-family: ${isArabic ? 'Arial, "Noto Sans Arabic", sans-serif' : 'Arial, sans-serif'};
          font-size: 10px;
          line-height: 1.3;
          color: #212529;
          background: white;
          direction: ${direction};
          text-align: ${textAlign};
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
          background: white;
          flex: 1;
        }

        .footer-image {
          width: 100%;
          display: block;
          margin-top: auto;
          flex-shrink: 0;
        }

        .header {
          text-align: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #DEE2E6;
        }

        .document-title {
          font-size: 18px;
          font-weight: bold;
          color: #1F4E79;
          margin-bottom: 4px;
        }

        .document-date {
          font-size: 11px;
          color: #6C757D;
        }

        .section-wrapper {
          margin-bottom: 12px;
          border: 1px solid #DEE2E6;
          border-radius: 4px;
          overflow: hidden;
        }

        .section-header-bar {
          background-color: #65BED6;
          padding: 6px;
          color: white;
          font-weight: bold;
          font-size: 11px;
          text-transform: uppercase;
          text-align: center;
        }

        .info-table {
          width: 100%;
          table-layout: fixed;
        }

        .info-row {
          display: flex;
          border-bottom: 1px solid #DEE2E6;
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-label-cell {
          background-color: #F8F9FA;
          padding: 5px 6px;
          font-weight: bold;
          font-size: 10px;
          color: #495057;
          flex: 1;
          border-right: 1px solid #DEE2E6;
        }

        .info-value-cell {
          padding: 5px 6px;
          font-size: 10px;
          color: #212529;
          flex: 1.5;
          border-right: 1px solid #DEE2E6;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .info-value-cell.last-cell {
          border-right: none;
        }

        .prescription-table {
          width: 100%;
          overflow-x: auto;
        }

        .table-header {
          display: flex;
          background-color: #E9ECEF;
          border-bottom: 1px solid #DEE2E6;
        }

        .table-row {
          display: flex;
          border-bottom: 1px solid #DEE2E6;
        }

        .header-cell, .data-cell {
          padding: 5px 4px;
          border-right: 1px solid #DEE2E6;
          text-align: center;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .header-cell:last-child, .data-cell:last-child {
          border-right: none;
        }

        .col-drug { flex: 2; min-width: 60px; }
        .col-dose { flex: 1; min-width: 40px; }
        .col-freq { flex: 1; min-width: 40px; }
        .col-route { flex: 1; min-width: 50px; }
        .col-duration { flex: 1; min-width: 40px; }
        .col-qty { flex: 1; min-width: 30px; }

        .header-text {
          color: #495057;
          font-weight: bold;
          font-size: 9px;
        }

        .cell-text {
          color: #212529;
          font-size: 10px;
        }

        .section {
          margin-bottom: 8px;
          border: 1px solid #DEE2E6;
          border-radius: 4px;
          overflow: hidden;
        }

        .section-header {
          background-color: #E9ECEF;
          padding: 5px 8px;
          border-bottom: 1px solid #DEE2E6;
        }

        .section-title {
          font-weight: bold;
          font-size: 10px;
          color: #495057;
        }

        .section-content {
          padding: 6px 8px;
          font-size: 10px;
          line-height: 1.4;
        }

        .signature {
          margin-top: 10px;
          border-top: 1px solid #DEE2E6;
          padding-top: 8px;
        }

        .signature-box {
          text-align: ${textAlign};
        }

        .signature-image {
          width: 100px;
          height: 40px;
          border: none;
          border-radius: 4px;
          margin-bottom: 4px;
          background-color: transparent;
        }

        .signature-text {
          font-size: 10px;
          color: #6C757D;
          font-weight: bold;
        }

        .footer {
          margin-top: 10px;
          text-align: center;
          font-size: 9px;
          color: #6C757D;
          border-top: 1px solid #DEE2E6;
          padding-top: 6px;
        }

        .header-image {
          width: 100%;
          display: block;
        }
      </style>
    </head>
    <body>
      <!-- Header Image -->
      <img src="${FILE_URL}/uploads/app/document-header.png" class="header-image" style="margin-bottom: 8px;" alt="Header" />

      <div class="container">
        <!-- Header -->
        <div class="header">
          <div class="document-title">${isArabic ? 'الوصفة الطبية' : 'PRESCRIPTION'}</div>
          <div class="document-date">${isArabic ? 'التاريخ: ' : 'Date: '}${formatDate(prescription?.updatedAt || prescription?.createdAt)}</div>
        </div>

        <!-- PATIENT INFORMATION SECTION -->
        <div class="section-wrapper">
          <div class="section-header-bar">${t.patientInformation}</div>
          <div class="info-table">
            <div class="info-row">
              <div class="info-label-cell">${t.patient}</div>
              <div class="info-value-cell">${safeString(prescription?.patient?.fullName || prescription?.patientName)}</div>
              <div class="info-label-cell">${t.phone}</div>
              <div class="info-value-cell last-cell">${safeString(prescription?.patient?.phone)}</div>
            </div>

            <div class="info-row">
              <div class="info-label-cell">${t.id}</div>
              <div class="info-value-cell">${safeString(prescription?.patient?.patientId)}</div>
              <div class="info-label-cell">${t.dob}</div>
              <div class="info-value-cell last-cell">${formatDate(prescription?.patient?.dob)}</div>
            </div>

            <div class="info-row">
              <div class="info-label-cell">${t.gender}</div>
              <div class="info-value-cell last-cell" style="flex: 4;">${safeString(prescription?.patient?.gender)}</div>
            </div>
          </div>
        </div>

        <!-- PROVIDER INFORMATION SECTION -->
        <div class="section-wrapper">
          <div class="section-header-bar">${t.providerInformation}</div>
          <div class="info-table">
            <div class="info-row">
              <div class="info-label-cell">${t.doctor}</div>
              <div class="info-value-cell">${safeString(prescription?.providerName || prescription?.provider?.fullName)}</div>
              <div class="info-label-cell">${t.specialty}</div>
              <div class="info-value-cell last-cell">${safeString(prescription?.provider?.specialty?.nameEnglish || prescription?.provider?.specialty)}</div>
            </div>

            <div class="info-row">
              <div class="info-label-cell">${t.phone}</div>
              <div class="info-value-cell">${safeString(prescription?.provider?.phone)}</div>
              <div class="info-label-cell">${t.license}</div>
              <div class="info-value-cell last-cell">${safeString(prescription?.provider?.licenseNumber || prescription?.provider?.licenseId)}</div>
            </div>
          </div>
        </div>

        <!-- PRESCRIPTION TABLE -->
        <div class="section-wrapper">
          <div class="section-header-bar">${t.prescriptionDetails}</div>
          <div class="prescription-table">
            <div class="table-header">
              <div class="header-cell col-drug"><div class="header-text">${t.drugName}</div></div>
              <div class="header-cell col-dose"><div class="header-text">${t.dose}</div></div>
              <div class="header-cell col-freq"><div class="header-text">${t.frequency}</div></div>
              <div class="header-cell col-route"><div class="header-text">${t.route}</div></div>
              <div class="header-cell col-duration"><div class="header-text">${t.duration}</div></div>
              <div class="header-cell col-qty"><div class="header-text">${t.quantity}</div></div>
            </div>

            <div class="table-row">
              <div class="data-cell col-drug"><div class="cell-text">${safeString(prescription?.drugName)}</div></div>
              <div class="data-cell col-dose"><div class="cell-text">${getDoseString(prescription)}</div></div>
              <div class="data-cell col-freq"><div class="cell-text">${safeString(prescription?.frequency)}</div></div>
              <div class="data-cell col-route"><div class="cell-text">${safeString(prescription?.route)}</div></div>
              <div class="data-cell col-duration"><div class="cell-text">${safeString(prescription?.duration)}</div></div>
              <div class="data-cell col-qty"><div class="cell-text">${safeString(prescription?.quantity)}</div></div>
            </div>
          </div>
        </div>

        <!-- Notes Section -->
        ${prescription?.notes ? `
        <div class="section">
          <div class="section-header">
            <div class="section-title">${t.notes}</div>
          </div>
          <div class="section-content">${prescription.notes}</div>
        </div>
        ` : ''}

        <!-- Signature -->
        ${prescription?.provider || prescription?.providerName ? `
        <div class="signature">
          <div class="signature-box">
            ${getSignatureHtml(prescription, isArabic, signatureBase64, privateFileIds)}
            <div class="signature-text">
              ${isArabic ? 'د. ' : 'Dr. '}${safeString(prescription?.providerName || prescription?.provider?.fullName)}
            </div>
          </div>
        </div>
        ` : ''}

      </div>

      <!-- Footer Image - Fixed at bottom -->
      <img src="${FILE_URL}/uploads/app/document-footer.png" class="footer-image" alt="Footer" />
    </body>
    </html>
  `;

  // Return both HTML and privateFileIds for backward compatibility
  // Callers can use result.html or just result (string) for backward compatibility
  return { html, privateFileIds, toString: () => html };
};
