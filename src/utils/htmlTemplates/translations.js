// Translation helper for medical document HTML generation

export const getPrescriptionTranslations = (isArabic = false) => {
  if (isArabic) {
    return {
      patientInformation: 'معلومات المريض',
      providerInformation: 'معلومات مقدم الخدمة',
      prescriptionDetails: 'تفاصيل الوصفة الطبية',
      patient: 'المريض',
      phone: 'الهاتف',
      id: 'الرقم التعريفي',
      dob: 'تاريخ الميلاد',
      gender: 'الجنس',
      doctor: 'الطبيب',
      specialty: 'التخصص',
      license: 'رقم الترخيص',
      drugName: 'اسم الدواء',
      dose: 'الجرعة',
      frequency: 'التكرار',
      route: 'طريقة الإعطاء',
      duration: 'المدة',
      quantity: 'الكمية',
      notes: 'ملاحظات',
    };
  }

  return {
    patientInformation: 'PATIENT INFORMATION',
    providerInformation: 'PROVIDER INFORMATION',
    prescriptionDetails: 'PRESCRIPTION DETAILS',
    patient: 'Patient',
    phone: 'Phone',
    id: 'ID',
    dob: 'DOB',
    gender: 'Gender',
    doctor: 'Doctor',
    specialty: 'Specialty',
    license: 'License',
    drugName: 'Drug Name',
    dose: 'Dose',
    frequency: 'Frequency',
    route: 'Route',
    duration: 'Duration',
    quantity: 'Quantity',
    notes: 'Notes',
  };
};

export const getProcedureTranslations = (isArabic = false) => {
  if (isArabic) {
    return {
      procedureRequest: 'طلب إجراء',
      patientInformation: 'معلومات المريض',
      providerInformation: 'معلومات مقدم الخدمة',
      procedureDetails: 'تفاصيل الإجراء',
      patient: 'المريض',
      phone: 'الهاتف',
      id: 'الرقم التعريفي',
      dob: 'تاريخ الميلاد',
      gender: 'الجنس',
      doctor: 'الطبيب',
      specialty: 'التخصص',
      license: 'رقم الترخيص',
      procedureType: 'نوع الإجراء',
      procedureName: 'اسم الإجراء',
      priority: 'الأولوية',
      diagnosis: 'التشخيص',
      instructions: 'التعليمات',
    };
  }

  return {
    procedureRequest: 'PROCEDURE REQUEST',
    patientInformation: 'PATIENT INFORMATION',
    providerInformation: 'PROVIDER INFORMATION',
    procedureDetails: 'PROCEDURE DETAILS',
    patient: 'Patient',
    phone: 'Phone',
    id: 'ID',
    dob: 'DOB',
    gender: 'Gender',
    doctor: 'Doctor',
    specialty: 'Specialty',
    license: 'License',
    procedureType: 'Procedure Type',
    procedureName: 'Procedure Name',
    priority: 'Priority',
    diagnosis: 'Diagnosis/Symptoms',
    instructions: 'Instructions',
  };
};

export const getSickLeaveTranslations = (isArabic = false) => {
  if (isArabic) {
    return {
      sickLeave: 'إجازة مرضية',
      patientInformation: 'معلومات المريض',
      providerInformation: 'معلومات مقدم الخدمة',
      leaveDetails: 'تفاصيل الإجازة',
      patient: 'المريض',
      phone: 'الهاتف',
      id: 'الرقم التعريفي',
      dob: 'تاريخ الميلاد',
      doctor: 'الطبيب',
      specialty: 'التخصص',
      license: 'رقم الترخيص',
      reason: 'السبب',
      issuedDate: 'تاريخ الإصدار',
    };
  }

  return {
    sickLeave: 'SICK LEAVE CERTIFICATE',
    patientInformation: 'PATIENT INFORMATION',
    providerInformation: 'PROVIDER INFORMATION',
    leaveDetails: 'LEAVE DETAILS',
    patient: 'Patient',
    phone: 'Phone',
    id: 'ID',
    dob: 'DOB',
    doctor: 'Doctor',
    specialty: 'Specialty',
    license: 'License',
    reason: 'Reason',
    issuedDate: 'Issued Date',
  };
};

export const getRefillTranslations = (isArabic = false) => {
  if (isArabic) {
    return {
      refillRequest: 'طلب إعادة صرف الدواء',
      patientInformation: 'معلومات المريض',
      requestDetails: 'تفاصيل الطلب',
      medications: 'الأدوية',
      patient: 'المريض',
      phone: 'الهاتف',
      id: 'الرقم التعريفي',
      requestDate: 'تاريخ الطلب',
      status: 'الحالة',
      initiatedBy: 'بدأ بواسطة',
      drugName: 'اسم الدواء',
      dose: 'الجرعة',
      frequency: 'التكرار',
      route: 'طريقة الإعطاء',
      duration: 'المدة',
    };
  }

  return {
    refillRequest: 'MEDICATION REFILL REQUEST',
    patientInformation: 'PATIENT INFORMATION',
    requestDetails: 'REQUEST DETAILS',
    medications: 'MEDICATIONS',
    patient: 'Patient',
    phone: 'Phone',
    id: 'ID',
    requestDate: 'Request Date',
    status: 'Status',
    initiatedBy: 'Initiated By',
    drugName: 'Drug Name',
    dose: 'Dose',
    frequency: 'Frequency',
    route: 'Route',
    duration: 'Duration',
  };
};

export const getInvoiceTranslations = (isArabic = false) => {
  const getFooterMessage = (type) => {
    if (isArabic) {
      switch (type) {
        case 'payment':
          return 'شكراً لاستخدام خدماتنا الصحية!';
        case 'refund':
          return 'نعتذر عن أي إزعاج. نأمل أن نخدمك بشكل أفضل في المستقبل.';
        case 'deposit':
          return 'تم إضافة المبلغ إلى حسابك بنجاح.';
        case 'withdraw':
          return 'تمت معالجة عملية السحب بنجاح.';
        case 'redeem':
          return 'شكراً لاستبدال بطاقة الدعم معنا!';
        default:
          return 'شكراً لاختيار خدماتنا!';
      }
    }

    switch (type) {
      case 'payment':
        return 'Thank you for using our healthcare services!';
      case 'refund':
        return 'We apologize for any inconvenience. We hope to serve you better in the future.';
      case 'deposit':
        return 'Your account has been successfully credited.';
      case 'withdraw':
        return 'Your withdrawal has been processed successfully.';
      case 'redeem':
        return 'Thank you for redeeming your support card with us!';
      default:
        return 'Thank you for choosing our services!';
    }
  };

  if (isArabic) {
    return {
      invoice: 'الفاتورة',
      date: 'التاريخ',
      transactionDetails: 'تفاصيل المعاملة',
      transactionId: 'رقم المعاملة',
      service: 'الخدمة',
      provider: 'مقدم الخدمة',
      patient: 'المريض',
      paymentMethod: 'طريقة الدفع',
      supportCardCode: 'رمز بطاقة الدعم',
      paymentStatus: 'حالة الدفع',
      appointmentStatus: 'حالة الموعد',
      consultationDate: 'تاريخ الاستشارة',
      paymentBreakdown: 'تفاصيل الدفع',
      consultationFee: 'رسوم الاستشارة',
      discountApplied: 'الخصم المطبق',
      tax: 'الضريبة',
      totalPaid: 'المجموع المدفوع',
      totalRefunded: 'المجموع المسترد',
      depositAmount: 'مبلغ الإيداع',
      totalDeposited: 'المجموع المودع',
      withdrawalAmount: 'مبلغ السحب',
      totalWithdrawn: 'المجموع المسحوب',
      supportCardValue: 'قيمة بطاقة الدعم',
      originalCardValue: 'قيمة البطاقة الأصلية',
      remainingBalance: 'الرصيد المتبقي',
      amountCredited: 'المبلغ المضاف',
      netAmount: 'صافي المبلغ',
      currency: 'ر.س',
      additionalNotes: 'ملاحظات إضافية',
      relatedTransaction: 'المعاملة ذات الصلة',
      disclaimer: 'هذا إيصال إلكتروني ولا يتطلب توقيعاً.',
      generated: 'تم الإنشاء في:',
      getFooterMessage,
    };
  }

  return {
    invoice: 'Invoice',
    date: 'Date',
    transactionDetails: 'TRANSACTION DETAILS',
    transactionId: 'Transaction ID',
    service: 'Service',
    provider: 'Provider',
    patient: 'Patient',
    paymentMethod: 'Payment Method',
    supportCardCode: 'Support Card Code',
    paymentStatus: 'Payment Status',
    appointmentStatus: 'Appointment Status',
    consultationDate: 'Consultation Date',
    paymentBreakdown: 'PAYMENT BREAKDOWN',
    consultationFee: 'Consultation Fee',
    discountApplied: 'Discount Applied',
    tax: 'Tax',
    totalPaid: 'Total Paid',
    totalRefunded: 'Total Refunded',
    depositAmount: 'Deposit Amount',
    totalDeposited: 'Total Deposited',
    withdrawalAmount: 'Withdrawal Amount',
    totalWithdrawn: 'Total Withdrawn',
    supportCardValue: 'Support Card Value',
    originalCardValue: 'Original Card Value',
    remainingBalance: 'Remaining Balance',
    amountCredited: 'Amount Credited',
    netAmount: 'Net Amount',
    currency: 'SAR',
    additionalNotes: 'ADDITIONAL NOTES',
    relatedTransaction: 'RELATED TRANSACTION',
    disclaimer: 'This is an electronically generated receipt and does not require a signature.',
    generated: 'Generated on:',
    getFooterMessage,
  };
};

export const getMedicalReportTranslations = (isArabic = false) => {
  if (isArabic) {
    return {
      medicalReport: 'التقرير الطبي',
      reportInformation: 'معلومات التقرير',
      reportType: 'نوع التقرير',
      provider: 'مقدم الخدمة',
      specialty: 'التخصص',
      date: 'التاريخ',
      status: 'الحالة',
      reportContent: 'محتوى التقرير',
      noDetailsAvailable: 'لا توجد تفاصيل متاحة',
    };
  }

  return {
    medicalReport: 'MEDICAL REPORT',
    reportInformation: 'REPORT INFORMATION',
    reportType: 'Report Type',
    provider: 'Provider',
    specialty: 'Specialty',
    date: 'Date',
    status: 'Status',
    reportContent: 'REPORT CONTENT',
    noDetailsAvailable: 'No details available',
  };
};
