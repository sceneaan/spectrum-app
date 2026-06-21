package care.spectrumclinics.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build

/**
 * Helper class for notification-related functionality.
 * Centralizes notification channel creation for use across the app.
 */
object NotificationHelper {

    const val CHANNEL_ID_DEFAULT = "spectrum_default_channel"
    const val CHANNEL_ID_APPOINTMENTS = "spectrum_appointments"
    const val CHANNEL_ID_CHAT = "spectrum_chat"
    const val CHANNEL_ID_PAYMENTS = "spectrum_payments"

    /**
     * Creates all notification channels for the app.
     * Safe to call multiple times - channels are only created if they don't exist.
     */
    fun createNotificationChannels(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val channels = listOf(
                NotificationChannel(
                    CHANNEL_ID_DEFAULT,
                    "General Notifications",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "General app notifications from Spectrum"
                    enableVibration(true)
                    setShowBadge(true)
                },
                NotificationChannel(
                    CHANNEL_ID_APPOINTMENTS,
                    "Appointment Notifications",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Reminders and updates for your appointments"
                    enableVibration(true)
                    setShowBadge(true)
                },
                NotificationChannel(
                    CHANNEL_ID_CHAT,
                    "Chat Messages",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "New messages from your healthcare providers"
                    enableVibration(true)
                    setShowBadge(true)
                },
                NotificationChannel(
                    CHANNEL_ID_PAYMENTS,
                    "Payment Updates",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "Payment confirmations and billing updates"
                    enableVibration(true)
                    setShowBadge(true)
                }
            )

            channels.forEach { channel ->
                notificationManager.createNotificationChannel(channel)
            }
        }
    }
}
