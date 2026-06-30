package app.spectrumclinics.care

import android.content.Intent
import android.os.Bundle
import android.util.Log
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.zoontek.rnbootsplash.RNBootSplash

class MainActivity : ReactActivity() {

  companion object {
    private const val TAG = "SpectrumMainActivity"
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "Spectrum"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    RNBootSplash.init(this, R.style.BootTheme) // Initialize the splash screen
    super.onCreate(null) // super.onCreate(null) with react-native-screens

    // Handle deep link if app was launched via URL scheme
    handleDeepLink(intent)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    // Handle deep link when app is already running and receives a new intent
    handleDeepLink(intent)
  }

  /**
   * Handle deep linking for payment redirects and other URL schemes.
   * Supported schemes: spectrum://, app.spectrumclinics.care.payments://
   */
  private fun handleDeepLink(intent: Intent) {
    val action = intent.action
    val data = intent.data

    if (Intent.ACTION_VIEW == action && data != null) {
      Log.d(TAG, "Deep link received: $data")
      Log.d(TAG, "Scheme: ${data.scheme}, Host: ${data.host}, Path: ${data.path}")

      // The deep link will be automatically handled by React Navigation's linking config
      // Additional native handling can be added here if needed
    }
  }
}
