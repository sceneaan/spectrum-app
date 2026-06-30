package app.spectrumclinics.care

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * BootReceiver handles device boot events to reschedule notifications
 * and perform any necessary initialization after device restart.
 */
class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "SpectrumBootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.d(TAG, "Device boot completed - reinitializing notification channels")

            // Recreate notification channels after boot
            NotificationHelper.createNotificationChannels(context)

            // Note: Scheduled notifications from @notifee or other libraries
            // will handle their own rescheduling after boot
        }
    }
}
