package app.spectrumclinics.care

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class SpectrumFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "SpectrumFCM"
        const val CHANNEL_ID_DEFAULT = "spectrum_default_channel"
        const val CHANNEL_ID_APPOINTMENTS = "spectrum_appointments"
        const val CHANNEL_ID_CHAT = "spectrum_chat"
        const val CHANNEL_ID_PAYMENTS = "spectrum_payments"
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "FCM Token refreshed: $token")
        // Token is handled by @react-native-firebase/messaging
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        Log.d(TAG, "Message received from: ${remoteMessage.from}")

        // Check if message contains a data payload
        if (remoteMessage.data.isNotEmpty()) {
            Log.d(TAG, "Message data payload: ${remoteMessage.data}")
            handleDataMessage(remoteMessage.data)
        }

        // Check if message contains a notification payload
        remoteMessage.notification?.let { notification ->
            Log.d(TAG, "Message notification body: ${notification.body}")
            sendNotification(
                title = notification.title ?: "Spectrum",
                body = notification.body ?: "",
                data = remoteMessage.data
            )
        }
    }

    private fun handleDataMessage(data: Map<String, String>) {
        val type = data["type"] ?: "default"
        val title = data["title"] ?: "Spectrum"
        val body = data["body"] ?: data["message"] ?: ""

        when (type) {
            "appointment" -> sendNotification(title, body, data, CHANNEL_ID_APPOINTMENTS)
            "chat" -> sendNotification(title, body, data, CHANNEL_ID_CHAT)
            "payment" -> sendNotification(title, body, data, CHANNEL_ID_PAYMENTS)
            else -> sendNotification(title, body, data, CHANNEL_ID_DEFAULT)
        }
    }

    private fun sendNotification(
        title: String,
        body: String,
        data: Map<String, String>,
        channelId: String = CHANNEL_ID_DEFAULT
    ) {
        val intent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            // Pass notification data to the app
            data.forEach { (key, value) ->
                putExtra(key, value)
            }
        }

        val pendingIntentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_ONE_SHOT
        } else {
            PendingIntent.FLAG_ONE_SHOT
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            System.currentTimeMillis().toInt(),
            intent,
            pendingIntentFlags
        )

        val defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        val notificationBuilder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setSound(defaultSoundUri)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Create notification channel for Android O and above
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            createNotificationChannels(notificationManager)
        }

        notificationManager.notify(System.currentTimeMillis().toInt(), notificationBuilder.build())
    }

    private fun createNotificationChannels(notificationManager: NotificationManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channels = listOf(
                NotificationChannel(
                    CHANNEL_ID_DEFAULT,
                    "General Notifications",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "General app notifications"
                    enableVibration(true)
                },
                NotificationChannel(
                    CHANNEL_ID_APPOINTMENTS,
                    "Appointment Notifications",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Appointment reminders and updates"
                    enableVibration(true)
                },
                NotificationChannel(
                    CHANNEL_ID_CHAT,
                    "Chat Notifications",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "New messages from doctors"
                    enableVibration(true)
                },
                NotificationChannel(
                    CHANNEL_ID_PAYMENTS,
                    "Payment Notifications",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "Payment confirmations and updates"
                    enableVibration(true)
                }
            )

            channels.forEach { channel ->
                notificationManager.createNotificationChannel(channel)
            }
        }
    }
}
