package app.spectrumclinics.care

import android.app.Application
import android.content.Intent
import android.util.Log
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  companion object {
    private const val TAG = "SpectrumApp"
  }

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Add Hyperpay native module package
          add(HyperpayPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()

    // Initialize notification channels for Android O and above
    initNotificationChannels()

    // Load React Native
    loadReactNative(this)

    Log.d(TAG, "Spectrum application initialized")
  }

  /**
   * Initialize notification channels.
   * This must be called before any notifications are sent.
   */
  private fun initNotificationChannels() {
    NotificationHelper.createNotificationChannels(this)
    Log.d(TAG, "Notification channels initialized")
  }
}
