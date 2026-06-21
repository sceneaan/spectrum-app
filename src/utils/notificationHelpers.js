import { createAndSendNotification, NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } from '@api/services/Notification.Service';

/**
 * Notification Helper Utilities
 * Provides convenient functions to create and send notifications for common app events
 */

/**
 * Create an appointment-related notification
 * @param {string} userId - The user ID to send the notification to
 * @param {string} title - Notification title
 * @param {string} description - Notification description
 * @param {Object} data - Additional data (appointmentId, providerName, etc.)
 * @param {string} priority - Notification priority (low, medium, high, urgent)
 * @param {string} actionUrl - Optional action URL for navigation
 */
export const createAppointmentNotification = async (
  userId,
  title,
  description,
  data = {},
  priority = NOTIFICATION_PRIORITIES.MEDIUM,
  actionUrl = null
) => {
  try {
    const payload = {
      userIds: [userId],
      title,
      description,
      type: NOTIFICATION_TYPES.APPOINTMENT,
      priority,
      data,
      actionUrl,
    };

    return await createAndSendNotification(payload);
  } catch (error) {
    console.error('Error creating appointment notification:', error);
    throw error;
  }
};

/**
 * Create a payment-related notification
 * @param {string} userId - The user ID to send the notification to
 * @param {string} title - Notification title
 * @param {string} description - Notification description
 * @param {Object} data - Additional data (paymentId, amount, status, etc.)
 * @param {string} priority - Notification priority
 * @param {string} actionUrl - Optional action URL
 */
export const createPaymentNotification = async (
  userId,
  title,
  description,
  data = {},
  priority = NOTIFICATION_PRIORITIES.HIGH,
  actionUrl = null
) => {
  try {
    const payload = {
      userIds: [userId],
      title,
      description,
      type: NOTIFICATION_TYPES.PAYMENT,
      priority,
      data,
      actionUrl,
    };

    return await createAndSendNotification(payload);
  } catch (error) {
    console.error('Error creating payment notification:', error);
    throw error;
  }
};

/**
 * Create a refill request notification
 * @param {string} userId - The user ID to send the notification to
 * @param {string} title - Notification title
 * @param {string} description - Notification description
 * @param {Object} data - Additional data (requestId, medication, status, etc.)
 * @param {string} priority - Notification priority
 * @param {string} actionUrl - Optional action URL
 */
export const createRefillRequestNotification = async (
  userId,
  title,
  description,
  data = {},
  priority = NOTIFICATION_PRIORITIES.MEDIUM,
  actionUrl = null
) => {
  try {
    const payload = {
      userIds: [userId],
      title,
      description,
      type: NOTIFICATION_TYPES.REFILL_REQUEST,
      priority,
      data,
      actionUrl,
    };

    return await createAndSendNotification(payload);
  } catch (error) {
    console.error('Error creating refill request notification:', error);
    throw error;
  }
};

/**
 * Create a medical report notification
 * @param {string} userId - The user ID to send the notification to
 * @param {string} title - Notification title
 * @param {string} description - Notification description
 * @param {Object} data - Additional data (reportId, type, status, etc.)
 * @param {string} priority - Notification priority
 * @param {string} actionUrl - Optional action URL
 */
export const createMedicalReportNotification = async (
  userId,
  title,
  description,
  data = {},
  priority = NOTIFICATION_PRIORITIES.MEDIUM,
  actionUrl = null
) => {
  try {
    const payload = {
      userIds: [userId],
      title,
      description,
      type: NOTIFICATION_TYPES.MEDICAL_REPORT,
      priority,
      data,
      actionUrl,
    };

    return await createAndSendNotification(payload);
  } catch (error) {
    console.error('Error creating medical report notification:', error);
    throw error;
  }
};

/**
 * Create a wallet-related notification
 * @param {string} userId - The user ID to send the notification to
 * @param {string} title - Notification title
 * @param {string} description - Notification description
 * @param {Object} data - Additional data (balance, transactionId, type, etc.)
 * @param {string} priority - Notification priority
 * @param {string} actionUrl - Optional action URL
 */
export const createWalletNotification = async (
  userId,
  title,
  description,
  data = {},
  priority = NOTIFICATION_PRIORITIES.MEDIUM,
  actionUrl = null
) => {
  try {
    const payload = {
      userIds: [userId],
      title,
      description,
      type: NOTIFICATION_TYPES.WALLET,
      priority,
      data,
      actionUrl,
    };

    return await createAndSendNotification(payload);
  } catch (error) {
    console.error('Error creating wallet notification:', error);
    throw error;
  }
};

/**
 * Create a support card notification
 * @param {string} userId - The user ID to send the notification to
 * @param {string} title - Notification title
 * @param {string} description - Notification description
 * @param {Object} data - Additional data (cardId, amount, status, etc.)
 * @param {string} priority - Notification priority
 * @param {string} actionUrl - Optional action URL
 */
export const createSupportCardNotification = async (
  userId,
  title,
  description,
  data = {},
  priority = NOTIFICATION_PRIORITIES.MEDIUM,
  actionUrl = null
) => {
  try {
    const payload = {
      userIds: [userId],
      title,
      description,
      type: NOTIFICATION_TYPES.SUPPORT_CARD,
      priority,
      data,
      actionUrl,
    };

    return await createAndSendNotification(payload);
  } catch (error) {
    console.error('Error creating support card notification:', error);
    throw error;
  }
};

/**
 * Create a discount notification
 * @param {string} userId - The user ID to send the notification to
 * @param {string} title - Notification title
 * @param {string} description - Notification description
 * @param {Object} data - Additional data (discountId, code, percentage, etc.)
 * @param {string} priority - Notification priority
 * @param {string} actionUrl - Optional action URL
 */
export const createDiscountNotification = async (
  userId,
  title,
  description,
  data = {},
  priority = NOTIFICATION_PRIORITIES.LOW,
  actionUrl = null
) => {
  try {
    const payload = {
      userIds: [userId],
      title,
      description,
      type: NOTIFICATION_TYPES.DISCOUNT,
      priority,
      data,
      actionUrl,
    };

    return await createAndSendNotification(payload);
  } catch (error) {
    console.error('Error creating discount notification:', error);
    throw error;
  }
};

/**
 * Create a system notification
 * @param {string} userId - The user ID to send the notification to
 * @param {string} title - Notification title
 * @param {string} description - Notification description
 * @param {Object} data - Additional data
 * @param {string} priority - Notification priority
 * @param {string} actionUrl - Optional action URL
 */
export const createSystemNotification = async (
  userId,
  title,
  description,
  data = {},
  priority = NOTIFICATION_PRIORITIES.MEDIUM,
  actionUrl = null
) => {
  try {
    const payload = {
      userIds: [userId],
      title,
      description,
      type: NOTIFICATION_TYPES.SYSTEM,
      priority,
      data,
      actionUrl,
    };

    return await createAndSendNotification(payload);
  } catch (error) {
    console.error('Error creating system notification:', error);
    throw error;
  }
};

/**
 * Create a general notification
 * @param {string} userId - The user ID to send the notification to
 * @param {string} title - Notification title
 * @param {string} description - Notification description
 * @param {Object} data - Additional data
 * @param {string} priority - Notification priority
 * @param {string} actionUrl - Optional action URL
 */
export const createGeneralNotification = async (
  userId,
  title,
  description,
  data = {},
  priority = NOTIFICATION_PRIORITIES.LOW,
  actionUrl = null
) => {
  try {
    const payload = {
      userIds: [userId],
      title,
      description,
      type: NOTIFICATION_TYPES.GENERAL,
      priority,
      data,
      actionUrl,
    };

    return await createAndSendNotification(payload);
  } catch (error) {
    console.error('Error creating general notification:', error);
    throw error;
  }
};

/**
 * Create a bulk notification for multiple users
 * @param {Array<string>} userIds - Array of user IDs to send the notification to
 * @param {string} title - Notification title
 * @param {string} description - Notification description
 * @param {string} type - Notification type
 * @param {Object} data - Additional data
 * @param {string} priority - Notification priority
 * @param {string} actionUrl - Optional action URL
 */
export const createBulkNotification = async (
  userIds,
  title,
  description,
  type = NOTIFICATION_TYPES.GENERAL,
  data = {},
  priority = NOTIFICATION_PRIORITIES.MEDIUM,
  actionUrl = null
) => {
  try {
    const payload = {
      userIds,
      title,
      description,
      type,
      priority,
      data,
      actionUrl,
    };

    return await createAndSendNotification(payload);
  } catch (error) {
    console.error('Error creating bulk notification:', error);
    throw error;
  }
};

/**
 * Create a welcome notification for new users
 * @param {string} userId - The user ID to send the notification to
 * @param {string} userName - The user's name
 */
export const createWelcomeNotification = async (userId, userName) => {
  try {
    return await createGeneralNotification(
      userId,
      'Welcome to Spectrum! 🎉',
      `Hi ${userName}, welcome to Spectrum! We're excited to have you on board. Get started by exploring our services and booking your first appointment.`,
      { userName, type: 'welcome' },
      NOTIFICATION_PRIORITIES.LOW,
      '/dashboard'
    );
  } catch (error) {
    console.error('Error creating welcome notification:', error);
    throw error;
  }
};

/**
 * Create an appointment reminder notification
 * @param {string} userId - The user ID to send the notification to
 * @param {Object} appointmentData - Appointment data
 */
export const createAppointmentReminder = async (userId, appointmentData) => {
  try {
    const { appointmentId, providerName, appointmentTime, appointmentDate } = appointmentData;
    
    return await createAppointmentNotification(
      userId,
      'Appointment Reminder ⏰',
      `Your appointment with ${providerName} is scheduled for ${appointmentTime} on ${appointmentDate}. Please arrive 10 minutes early.`,
      { appointmentId, providerName, appointmentTime, appointmentDate },
      NOTIFICATION_PRIORITIES.HIGH,
      `/appointments/${appointmentId}`
    );
  } catch (error) {
    console.error('Error creating appointment reminder:', error);
    throw error;
  }
};

/**
 * Create a payment confirmation notification
 * @param {string} userId - The user ID to send the notification to
 * @param {Object} paymentData - Payment data
 */
export const createPaymentConfirmation = async (userId, paymentData) => {
  try {
    const { paymentId, amount, paymentMethod, appointmentId } = paymentData;
    
    return await createPaymentNotification(
      userId,
      'Payment Confirmed ✅',
      `Your payment of $${amount} via ${paymentMethod} has been confirmed. Your appointment is now confirmed.`,
      { paymentId, amount, paymentMethod, appointmentId },
      NOTIFICATION_PRIORITIES.HIGH,
      `/appointments/${appointmentId}`
    );
  } catch (error) {
    console.error('Error creating payment confirmation:', error);
    throw error;
  }
};

/**
 * Create a refill request status notification
 * @param {string} userId - The user ID to send the notification to
 * @param {Object} refillData - Refill request data
 */
export const createRefillStatusNotification = async (userId, refillData) => {
  try {
    const { requestId, medication, status, providerName } = refillData;
    
    const statusMessages = {
      approved: 'Your refill request for ${medication} has been approved by ${providerName}.',
      rejected: 'Your refill request for ${medication} has been reviewed. Please contact your provider for more information.',
      pending: 'Your refill request for ${medication} is being reviewed by ${providerName}.',
    };
    
    const message = statusMessages[status] || 'Your refill request status has been updated.';
    
    return await createRefillRequestNotification(
      userId,
      `Refill Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message,
      { requestId, medication, status, providerName },
      status === 'approved' ? NOTIFICATION_PRIORITIES.MEDIUM : NOTIFICATION_PRIORITIES.HIGH,
      `/refill/${requestId}`
    );
  } catch (error) {
    console.error('Error creating refill status notification:', error);
    throw error;
  }
};

/**
 * Create a medical report ready notification
 * @param {string} userId - The user ID to send the notification to
 * @param {Object} reportData - Medical report data
 */
export const createMedicalReportReadyNotification = async (userId, reportData) => {
  try {
    const { reportId, reportType, providerName } = reportData;
    
    return await createMedicalReportNotification(
      userId,
      'Medical Report Ready 📋',
      `Your ${reportType} report is ready and has been reviewed by ${providerName}. You can view it in your medical records.`,
      { reportId, reportType, providerName },
      NOTIFICATION_PRIORITIES.MEDIUM,
      `/medical-reports/${reportId}`
    );
  } catch (error) {
    console.error('Error creating medical report notification:', error);
    throw error;
  }
};

/**
 * Create a wallet balance update notification
 * @param {string} userId - The user ID to send the notification to
 * @param {Object} walletData - Wallet data
 */
export const createWalletBalanceNotification = async (userId, walletData) => {
  try {
    const { balance, transactionType, amount, transactionId } = walletData;
    
    const messages = {
      credit: `Your wallet has been credited with $${amount}. New balance: $${balance}`,
      debit: `Your wallet has been debited $${amount}. New balance: $${balance}`,
      low: `Your wallet balance is low: $${balance}. Consider adding funds for future appointments.`,
    };
    
    const message = messages[transactionType] || 'Your wallet balance has been updated.';
    
    return await createWalletNotification(
      userId,
      'Wallet Update 💰',
      message,
      { balance, transactionType, amount, transactionId },
      transactionType === 'low' ? NOTIFICATION_PRIORITIES.HIGH : NOTIFICATION_PRIORITIES.MEDIUM,
      '/wallet'
    );
  } catch (error) {
    console.error('Error creating wallet notification:', error);
    throw error;
  }
};

// Export all helper functions
export default {
  createAppointmentNotification,
  createPaymentNotification,
  createRefillRequestNotification,
  createMedicalReportNotification,
  createWalletNotification,
  createSupportCardNotification,
  createDiscountNotification,
  createSystemNotification,
  createGeneralNotification,
  createBulkNotification,
  createWelcomeNotification,
  createAppointmentReminder,
  createPaymentConfirmation,
  createRefillStatusNotification,
  createMedicalReportReadyNotification,
  createWalletBalanceNotification,
};
