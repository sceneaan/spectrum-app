import { getSickLeaveTranslations } from './translations';
import environment from '../../config/environment';

const FILE_URL = environment.file_url;

// Signature placeholder for private file replacement by DocumentViewer
const SIGNATURE_PLACEHOLDER = 'PROVIDER_SIGNATURE_PLACEHOLDER';

/**
 * Generate sick leave certificate HTML
 * @param {Object} sickLeave - Sick leave data
 * @param {boolean} isArabic - RTL language support
 * @param {Object} options - Additional options
 * @param {string} options.signatureBase64 - Pre-loaded base64 signature image (for private files)
 * @returns {Object} { html: string, privateFileIds: Object } - HTML content and private file IDs for DocumentViewer
 */
export const generateSickLeaveHTML = (sickLeave, isArabic = false, options = {}) => {
  const { signatureBase64 } = options;
  const t = getSickLeaveTranslations(isArabic);

  // Track private file IDs for DocumentViewer to process
  const privateFileIds = {};

  // Saudi date format (DD/MM/YYYY)
  const formatDateSaudi = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
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
  const direction = isRTL ? 'rtl' : 'ltr';

  const html = `
    <!DOCTYPE html>
    <html dir="${direction}" lang="${isArabic ? 'ar' : 'en'}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${t.sickLeave}</title>
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
          padding: 10px;
          direction: ${direction};
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

        .title {
          font-size: 18px;
          font-weight: bold;
          color: #1F4E79;
          margin-bottom: 4px;
        }

        .date {
          font-size: 11px;
          color: #6C757D;
        }

        .section {
          margin-bottom: 10px;
          border: 1px solid #DEE2E6;
          border-radius: 4px;
          overflow: hidden;
        }

        .section-header {
          background-color: #65BED6;
          padding: 6px;
          color: white;
          font-weight: bold;
          font-size: 11px;
          text-align: center;
          text-transform: uppercase;
        }

        .section-content {
          padding: 10px;
          font-size: 10px;
          line-height: 1.4;
        }

        .info-row {
          display: flex;
          padding: 5px 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-label {
          font-weight: bold;
          flex: 1;
          font-size: 10px;
          color: #495057;
        }

        .info-value {
          flex: 2;
          font-size: 10px;
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

        .footer {
          margin-top: 15px;
          text-align: center;
          font-size: 9px;
          color: #6C757D;
          border-top: 1px solid #DEE2E6;
          padding-top: 8px;
        }
      </style>
    </head>
    <body>
      <!-- Header Image -->
      <img src="${FILE_URL}/uploads/app/document-header.png" class="header-image" style="margin-bottom: 8px;" alt="Header" />

      <div class="container">
        <div class="header">
          <div class="title">${t.sickLeave}</div>
          <div class="date">${isArabic ? 'التاريخ:' : 'Date:'} ${formatDateSaudi(sickLeave?.createdAt)}</div>
        </div>

        <!-- Patient Information -->
        <div class="section">
          <div class="section-header">${t.patientInformation}</div>
          <div class="section-content">
            <div class="info-row">
              <div class="info-label">${isArabic ? 'الاسم:' : 'Name:'}</div>
              <div class="info-value">${safeString(sickLeave?.patient?.fullName)}</div>
            </div>
            <div class="info-row">
              <div class="info-label">${isArabic ? 'تاريخ الميلاد:' : 'Date of Birth:'}</div>
              <div class="info-value">${sickLeave?.patient?.dob ? formatDateSaudi(sickLeave.patient.dob) : 'N/A'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">${isArabic ? 'رقم الهوية:' : 'ID:'}</div>
              <div class="info-value">${safeString(sickLeave?.patient?.nationalId)}</div>
            </div>
          </div>
        </div>

        <!-- To Whom It May Concern -->
        <div style="margin: 15px 0; padding: 10px; background-color: #f8f9fa; border-radius: 4px;">
          <p style="font-weight: bold; color: #1F4E79; font-size: 12px; margin: 0;">
            ${isArabic ? 'إلى من يهمه الأمر:' : 'To Whom It May Concern:'}
          </p>
        </div>

        <!-- Leave Duration Section -->
        <div class="section">
          <div class="section-header">${isArabic ? 'مدة الإجازة' : 'Leave Duration'}</div>
          <div class="section-content">
            <p style="font-size: 12px; color: #333; margin: 0;">
              ${sickLeave?.numberOfDays || '[___]'} ${isArabic ? 'يوم' : 'days'} ${isArabic ? 'من' : 'from'} ${sickLeave?.startDate ? formatDateSaudi(sickLeave.startDate) : '[__/__/____]'}
            </p>
          </div>
        </div>

        <!-- Note Section -->
        <div class="section">
          <div class="section-header">${isArabic ? 'ملاحظة' : 'Note'}</div>
          <div class="section-content">
            <p>${sickLeave?.details ? safeString(sickLeave.details) : (isArabic ? 'لا توجد ملاحظات' : 'No notes provided')}</p>
          </div>
        </div>

        ${sickLeave?.provider || sickLeave?.providerName ? `
        <div class="signature" style="text-align: ${isRTL ? 'right' : 'left'};">
          <div class="signature-box">
            ${getSignatureHtml(sickLeave, isRTL, signatureBase64, privateFileIds)}
            <div style="border-top: 1px solid #333; width: 180px; margin: 5px 0;"></div>
            <div class="signature-text">${isArabic ? 'د. ' : 'Dr. '}${safeString(sickLeave?.providerName || sickLeave?.provider?.fullName)}</div>
            ${sickLeave?.provider?.specialty ? `
            <div style="font-size: 10px; color: #666; margin-top: 2px;">
              ${safeString(sickLeave.provider.specialty?.nameEnglish || sickLeave.provider.specialty)}
            </div>
            ` : ''}
            ${sickLeave?.provider?.licenseNumber ? `
            <div style="font-size: 10px; color: #666; margin-top: 2px;">
              ${isArabic ? 'رقم الترخيص: ' : 'License: '}${sickLeave.provider.licenseNumber}
            </div>
            ` : ''}
            <div style="font-size: 10px; color: #333; margin-top: 5px;">
              ${isArabic ? 'التاريخ: ' : 'Date: '}${formatDateSaudi(sickLeave?.updatedAt || sickLeave?.createdAt)}
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
