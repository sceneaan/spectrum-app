import { getProcedureTranslations } from './translations';
import environment from '../../config/environment';

const FILE_URL = environment.file_url;

// Signature placeholder for private file replacement by DocumentViewer
const SIGNATURE_PLACEHOLDER = 'PROVIDER_SIGNATURE_PLACEHOLDER';

/**
 * Generate procedure request HTML
 * @param {Object} procedure - Procedure data
 * @param {boolean} isArabic - RTL language support
 * @param {Object} options - Additional options
 * @param {string} options.signatureBase64 - Pre-loaded base64 signature image (for private files)
 * @returns {Object} { html: string, privateFileIds: Object } - HTML content and private file IDs for DocumentViewer
 */
export const generateProcedureHTML = (procedure, isArabic = false, options = {}) => {
  const { signatureBase64 } = options;
  const t = getProcedureTranslations(isArabic);

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

  /**
   * Get signature HTML with support for:
   * 1. Pre-loaded base64 signature (signatureBase64)
   * 2. Private file ID (signatureFileId) - uses placeholder for DocumentViewer
   * 3. Legacy URL (signatureUrl)
   */
  const getSignatureHtml = (data, isRTL, preloadedBase64, fileIds) => {
    const noSignatureHtml = `<div style="width: 150px; height: 60px; border: 2px dashed #ccc; border-radius: 4px; margin-bottom: 10px; display: inline-flex; align-items: center; justify-content: center; color: #aaa; font-size: 11px; background-color: #f9f9f9;">${isRTL ? 'لا يوجد توقيع' : 'No Signature'}</div>`;

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
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${t.procedureRequest}</title>
      <style>
        /* A4 Page Size: 210mm x 297mm - Compact single page layout */
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

        * { margin: 0; padding: 0; box-sizing: border-box; }

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
          margin-bottom: 10px;
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
          flex: 2;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .signature {
          margin-top: 20px;
          padding-top: 15px;
          border-top: 2px solid #DEE2E6;
        }

        .signature-box {
          padding: 10px;
          background-color: #f8f9fa;
          border-radius: 4px;
        }

        .signature-image {
          width: 150px;
          height: 60px;
          border: none;
          border-radius: 4px;
          margin-bottom: 8px;
        }

        .signature-text {
          font-size: 14px;
          color: #1F4E79;
          font-weight: bold;
          margin-top: 5px;
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
        <div class="header">
          <div class="document-title">${t.procedureRequest}</div>
          <div>${isArabic ? 'التاريخ: ' : 'Date: '}${formatDate(procedure?.createdAt)}</div>
        </div>

        <!-- PATIENT INFORMATION -->
        <div class="section-wrapper">
          <div class="section-header-bar">${t.patientInformation}</div>
          <div class="info-row">
            <div class="info-label-cell">${t.patient}</div>
            <div class="info-value-cell">${safeString(procedure?.patient?.fullName)}</div>
          </div>
          <div class="info-row">
            <div class="info-label-cell">${t.id}</div>
            <div class="info-value-cell">${safeString(procedure?.patient?.patientId)}</div>
          </div>
          <div class="info-row">
            <div class="info-label-cell">${t.dob}</div>
            <div class="info-value-cell">${formatDate(procedure?.patient?.dob)}</div>
          </div>
        </div>

        <!-- PROVIDER INFORMATION -->
        <div class="section-wrapper">
          <div class="section-header-bar">${t.providerInformation}</div>
          <div class="info-row">
            <div class="info-label-cell">${t.doctor}</div>
            <div class="info-value-cell">${safeString(procedure?.provider?.fullName)}</div>
          </div>
          <div class="info-row">
            <div class="info-label-cell">${t.specialty}</div>
            <div class="info-value-cell">${safeString(procedure?.provider?.specialty?.nameEnglish)}</div>
          </div>
        </div>

        <!-- PROCEDURE DETAILS -->
        <div class="section-wrapper">
          <div class="section-header-bar">${t.procedureDetails}</div>
          <div class="info-row">
            <div class="info-label-cell">${t.procedureType}</div>
            <div class="info-value-cell">${safeString(procedure?.procedureType)}</div>
          </div>
          <div class="info-row">
            <div class="info-label-cell">${t.procedureName}</div>
            <div class="info-value-cell">${safeString(procedure?.name)}</div>
          </div>
          <div class="info-row">
            <div class="info-label-cell">${t.priority}</div>
            <div class="info-value-cell">${safeString(procedure?.priority)}</div>
          </div>
          ${procedure?.symptoms ? `
          <div class="info-row">
            <div class="info-label-cell">${t.diagnosis}</div>
            <div class="info-value-cell">${safeString(procedure.symptoms)}</div>
          </div>
          ` : ''}
          ${procedure?.instructions ? `
          <div class="info-row">
            <div class="info-label-cell">${t.instructions}</div>
            <div class="info-value-cell">${safeString(procedure.instructions)}</div>
          </div>
          ` : ''}
        </div>

        <!-- Signature -->
        ${procedure?.provider || procedure?.providerName ? `
        <div class="signature" style="text-align: ${isRTL ? 'right' : 'left'};">
          <div class="signature-box">
            ${getSignatureHtml(procedure, isRTL, signatureBase64, privateFileIds)}
            <div class="signature-text">${isArabic ? 'د. ' : 'Dr. '}${safeString(procedure?.providerName || procedure?.provider?.fullName)}</div>
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
