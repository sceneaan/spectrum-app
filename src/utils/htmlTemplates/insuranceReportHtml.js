import { getMedicalReportTranslations } from './translations';
import environment from '../../config/environment';

const FILE_URL = environment.file_url;

// Signature placeholder for private file replacement by DocumentViewer
const SIGNATURE_PLACEHOLDER = 'PROVIDER_SIGNATURE_PLACEHOLDER';

/**
 * Generate Insurance Report HTML with diagnosis, treatments, and financial table
 * @param {Object} report - Insurance report data with insuranceData field
 * @param {boolean} isArabic - RTL language support
 * @param {Object} options - Additional options
 * @param {string} options.signatureBase64 - Pre-loaded base64 signature image
 * @returns {Object} { html: string, privateFileIds: Object }
 */
export const generateInsuranceReportHTML = (report, isArabic = false, options = {}) => {
  const { signatureBase64 } = options;
  const t = getMedicalReportTranslations(isArabic);
  const privateFileIds = {};

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: '2-digit'
    });
  };

  const formatDateShort = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  };

  const safeString = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      return value.nameEnglish || value.name || value.fullName || 'N/A';
    }
    return String(value);
  };

  const getSignatureHtml = (data, isRTL, preloadedBase64, fileIds) => {
    const noSignatureHtml = `<div style="width: 100px; height: 50px; border: 1px dashed #ccc; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; color: #aaa; font-size: 10px; background-color: #f9f9f9;">${isRTL ? 'لا يوجد توقيع' : 'No Signature'}</div>`;

    if (preloadedBase64) {
      return `<img src="${preloadedBase64}" alt="Signature" class="signature-image" onerror="this.style.display='none'" />`;
    }

    const signatureFileId = data?.providerSignatureFileId || data?.provider?.signatureFileId;
    if (signatureFileId) {
      fileIds[SIGNATURE_PLACEHOLDER] = signatureFileId;
      return `<img src="${SIGNATURE_PLACEHOLDER}" alt="Signature" class="signature-image" onerror="this.style.display='none'" />`;
    }

    const legacyUrl = data?.providerSignatureUrl || data?.provider?.signatureUrl || data?.provider?.signature;
    if (legacyUrl && legacyUrl.trim() !== '') {
      return `<img src="${legacyUrl}" alt="Signature" class="signature-image" onerror="this.style.display='none'" />`;
    }

    return noSignatureHtml;
  };

  const isRTL = isArabic;
  const textAlign = isRTL ? 'right' : 'left';
  const direction = isRTL ? 'rtl' : 'ltr';

  // Extract data
  const patient = report?.patient || {};
  const provider = report?.provider || {};
  const insuranceData = report?.insuranceData || {};
  const diagnosis = insuranceData?.diagnosis || [];
  const treatments = insuranceData?.recommendedTreatments || [];
  const services = insuranceData?.services || [];
  const totalValue = insuranceData?.totalValue || 0;
  const paymentStatus = insuranceData?.paymentStatus || 'Completed';
  const fileNumber = services[0]?.fileNumber || patient?.userId || '';

  // Generate services rows
  const servicesRows = services.map(service => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; text-align: center; font-size: 11px;">
        ${formatDateShort(service.date)}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; text-align: center; font-size: 11px;">
        ${fileNumber}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; text-align: center; font-size: 11px;">
        ${service.sessionType || 'Consultation'}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; text-align: center; font-size: 11px;">
        ${service.price || 0}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; text-align: center; font-size: 11px;">
        ${isArabic ? 'د. ' : 'Dr. '}${service.clinician || provider.fullName || ''}
      </td>
    </tr>
  `).join('');

  // Translation labels
  const labels = {
    title: isArabic ? 'تقرير التأمين' : 'Insurance Report',
    name: isArabic ? 'الاسم:' : 'Name:',
    dob: isArabic ? 'تاريخ الميلاد:' : 'Date of Birth:',
    id: isArabic ? 'رقم الهوية:' : 'ID:',
    toWhom: isArabic ? 'إلى من يهمه الأمر:' : 'To Whom It May Concern:',
    diagnosis: isArabic ? 'التشخيص:' : 'Diagnosis:',
    treatments: isArabic ? 'العلاجات الموصى بها:' : 'Recommended Treatments:',
    financialStatement: isArabic ? 'كشف حساب مفصل' : 'Detailed financial statement',
    date: isArabic ? 'التاريخ' : 'Date',
    file: isArabic ? 'رقم الملف' : 'File',
    sessionType: isArabic ? 'نوع الجلسة' : 'Session Type',
    price: isArabic ? 'السعر' : 'Price',
    clinician: isArabic ? 'الطبيب' : 'Clinician',
    paymentStatus: isArabic ? 'حالة الدفع' : 'Payment status',
    completed: isArabic ? 'مكتمل' : 'Completed',
    value: isArabic ? 'القيمة' : 'Value',
    contactMessage: isArabic
      ? 'لا تتردد في التواصل معي إذا كان لديك أي استفسار.'
      : 'Please feel free to contact me if you have any questions.',
    regards: isArabic ? 'مع التحية،' : 'Regards,',
    dateLabel: isArabic ? 'التاريخ:' : 'Date:',
    licenseNo: isArabic ? 'رقم الترخيص:' : 'License No:',
    disclaimer: isArabic
      ? 'تنويه: تم إنشاء هذا المستند تلقائيًا من منصة سبكتروم للرعاية الصحية. تستند المعلومات الواردة هنا إلى السجلات الطبية وبيانات المواعيد المخزنة في النظام. يصدر هذا التقرير لأغراض التأمين فقط ولا يشكل تشخيصًا طبيًا أو توصية علاجية. لأي استفسارات طبية، يرجى استشارة الطبيب المعالج مباشرة.'
      : 'DISCLAIMER: This document has been auto-generated from the Spectrum Healthcare Platform. The information contained herein is based on medical records and appointment data stored in the system. This report is issued for insurance purposes only and does not constitute a medical diagnosis or treatment recommendation. For any medical inquiries, please consult with the treating physician directly.',
  };

  const html = `
    <!DOCTYPE html>
    <html dir="${direction}" lang="${isArabic ? 'ar' : 'en'}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
      <title>${labels.title}</title>
      <style>
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
          font-size: 11px;
          line-height: 1.4;
          color: #333;
          background: white;
          direction: ${direction};
          text-align: ${textAlign};
          padding: 15px;
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
          padding: 0 15px;
        }

        .header-image {
          width: 100%;
          display: block;
          margin-bottom: 15px;
        }

        .footer-image {
          width: 100%;
          display: block;
          margin-top: auto;
          flex-shrink: 0;
        }

        .patient-info {
          margin-bottom: 15px;
        }

        .patient-info p {
          margin: 4px 0;
          font-size: 12px;
        }

        .patient-info strong {
          font-weight: bold;
        }

        .salutation {
          font-size: 12px;
          text-decoration: underline;
          margin: 15px 0;
        }

        .section-title {
          font-size: 12px;
          font-weight: bold;
          color: #333;
          margin: 15px 0 8px 0;
        }

        .bullet-item {
          font-size: 11px;
          color: #333;
          margin-${isRTL ? 'right' : 'left'}: 20px;
          margin-bottom: 4px;
        }

        .table-title {
          font-size: 13px;
          font-weight: bold;
          text-align: center;
          margin: 20px 0 12px 0;
          color: #333;
        }

        .financial-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #ccc;
          margin-bottom: 15px;
          font-size: 11px;
        }

        .financial-table th {
          background-color: #F5F5F5;
          padding: 10px;
          border-bottom: 1px solid #ccc;
          font-weight: bold;
          text-align: center;
          font-size: 10px;
        }

        .payment-row {
          background-color: #F5F5F5;
        }

        .payment-row td {
          padding: 10px;
          font-size: 11px;
          border-top: 1px solid #ccc;
        }

        .contact-message {
          font-size: 11px;
          margin: 20px 0 8px 0;
        }

        .regards {
          font-size: 11px;
          margin-bottom: 15px;
        }

        .signature-section {
          margin-top: 15px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .signature-image-container {
          margin-bottom: 5px;
        }

        .signature-line {
          width: 200px;
          height: 1px;
          background-color: #333;
          margin-bottom: 5px;
        }

        .doctor-name {
          font-size: 12px;
          font-weight: bold;
          color: #333;
          margin-bottom: 3px;
        }

        .doctor-specialty {
          font-size: 10px;
          color: #666;
          margin-bottom: 3px;
        }

        .date-label {
          font-size: 10px;
          color: #333;
          margin-top: 8px;
        }

        .signature-image {
          width: 150px;
          height: 70px;
          object-fit: contain;
        }

        .disclaimer-section {
          margin-top: 20px;
          padding-top: 10px;
          border-top: 1px solid #E5E5E5;
        }

        .disclaimer-text {
          font-size: 8px;
          color: #888;
          font-style: italic;
          text-align: center;
          line-height: 1.4;
        }
      </style>
    </head>
    <body>
      <!-- Header Image -->
      <img src="${FILE_URL}/uploads/app/document-header.png" class="header-image" alt="Header" />

      <div class="container">
        <!-- Patient Information -->
        <div class="patient-info">
          <p><strong>${labels.name}</strong> ${safeString(patient.fullName)}</p>
          <p><strong>${labels.dob}</strong> ${patient.dob ? formatDate(patient.dob) : 'N/A'}</p>
          <p><strong>${labels.id}</strong> ${patient.nationalId || patient.userId || 'N/A'}</p>
        </div>

        <!-- Salutation -->
        <p class="salutation">${labels.toWhom}</p>

        <!-- Diagnosis Section -->
        ${diagnosis.length > 0 ? `
          <p class="section-title">${labels.diagnosis}</p>
          ${diagnosis.map(item => `<p class="bullet-item">• ${item}</p>`).join('')}
        ` : ''}

        <!-- Recommended Treatments Section -->
        ${treatments.length > 0 ? `
          <p class="section-title">${labels.treatments}</p>
          ${treatments.map(item => `<p class="bullet-item">• ${item}</p>`).join('')}
        ` : ''}

        <!-- Detailed Financial Statement Table -->
        <p class="table-title">${labels.financialStatement}</p>

        <table class="financial-table">
          <thead>
            <tr>
              <th>${labels.date}</th>
              <th>${labels.file}</th>
              <th>${labels.sessionType}</th>
              <th>${labels.price}</th>
              <th>${labels.clinician}</th>
            </tr>
          </thead>
          <tbody>
            ${servicesRows}
            <tr class="payment-row">
              <td colspan="2"><strong>${labels.paymentStatus}</strong></td>
              <td style="text-align: center;">${paymentStatus === 'Completed' ? labels.completed : paymentStatus}</td>
              <td style="text-align: center;"><strong>${labels.value}</strong></td>
              <td style="text-align: center;">${totalValue} SAR</td>
            </tr>
          </tbody>
        </table>

        <!-- Contact Message -->
        <p class="contact-message">${labels.contactMessage}</p>
        <p class="regards">${labels.regards}</p>

        <!-- Signature Section -->
        <div class="signature-section">
          <!-- Signature Image on top -->
          <div class="signature-image-container">
            ${getSignatureHtml(report, isRTL, signatureBase64, privateFileIds)}
          </div>
          <!-- Line under signature -->
          <div class="signature-line"></div>
          <!-- Doctor Name -->
          <p class="doctor-name">
            ${isArabic ? 'د. ' : 'Dr. '}${safeString(provider.fullName)}
          </p>
          <!-- Specialty -->
          <p class="doctor-specialty">${safeString(provider.specialty?.nameEnglish || provider.specialty)}</p>
          <!-- License Number -->
          ${provider.licenseNumber ? `<p class="doctor-specialty">${labels.licenseNo} ${provider.licenseNumber}</p>` : ''}
          <!-- Date -->
          <p class="date-label">${labels.dateLabel} ${formatDateShort(report?.createdAt || new Date())}</p>
        </div>

        <!-- Disclaimer Section -->
        <div class="disclaimer-section">
          <p class="disclaimer-text">${labels.disclaimer}</p>
        </div>
      </div>

      <!-- Footer Image -->
      <img src="${FILE_URL}/uploads/app/document-footer.png" class="footer-image" alt="Footer" />
    </body>
    </html>
  `;

  return { html, privateFileIds, toString: () => html };
};
