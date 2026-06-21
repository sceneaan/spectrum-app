import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import FirebaseCore
import FirebaseMessaging
import UserNotifications
import RNBootSplash

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Initialize Firebase
    FirebaseApp.configure()

    // Set Firebase messaging delegate
    Messaging.messaging().delegate = self

    // Set notification center delegate
    if #available(iOS 10.0, *) {
      UNUserNotificationCenter.current().delegate = self
    }

    // Initialize React Native
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    // For iOS 13+, window is created in scene delegate
    // For older iOS versions, create window here
    if #unavailable(iOS 13.0) {
      window = UIWindow(frame: UIScreen.main.bounds)

      factory.startReactNative(
        withModuleName: "Spectrum",
        in: window,
        launchOptions: launchOptions
      )

      RNBootSplash.initWithStoryboard("BootSplash", rootView: window!.rootViewController!.view)
    }

    return true
  }

  // MARK: - UISceneSession Lifecycle (iOS 13+)

  func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
  }

  func application(
    _ application: UIApplication,
    didDiscardSceneSessions sceneSessions: Set<UISceneSession>
  ) {
    // Called when the user discards a scene session
  }

  // MARK: - Orientation Support
  func application(
    _ application: UIApplication,
    supportedInterfaceOrientationsFor window: UIWindow?
  ) -> UIInterfaceOrientationMask {
    // If you're using react-native-orientation-locker, you'll need to bridge this
    // For now, supporting portrait and landscape
    return [.portrait, .landscapeLeft, .landscapeRight]
  }

  // MARK: - URL Scheme Handling (Deep Linking)

  // For iOS 9+
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    print("🔄 Application opened with URL: \(url.absoluteString)")

    // Check if the URL uses your scheme
    if url.scheme == "spectrum" {
      print("✅ URL matches our scheme: \(url.absoluteString)")

      // Post notification to inform the HyperpayModule
      NotificationCenter.default.post(
        name: NSNotification.Name("PaymentRedirectCompleted"),
        object: nil,
        userInfo: ["url": url]
      )
      return true
    }

    return false
  }

  // Handle Universal Links
  func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    if userActivity.activityType == NSUserActivityTypeBrowsingWeb {
      if let url = userActivity.webpageURL {
        print("🔄 Universal Link opened: \(url.absoluteString)")

        // Check if this is a payment return URL
        if url.absoluteString.contains("payment/success") {
          print("✅ Universal Link for payment detected")

          // Post notification to inform the HyperpayModule
          NotificationCenter.default.post(
            name: NSNotification.Name("PaymentRedirectCompleted"),
            object: nil,
            userInfo: ["url": url]
          )
          return true
        }
      }
    }

    return true
  }

  // MARK: - Remote Notifications (APNS)

  func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    print("APNS device token received: \(deviceToken)")

    // Set the APNS token for Firebase
    Messaging.messaging().apnsToken = deviceToken

    // Now that APNS token is set, we can request FCM token
    DispatchQueue.main.async {
      Messaging.messaging().token { token, error in
        if let error = error {
          print("Error getting FCM token after APNS token set: \(error.localizedDescription)")
        } else if let token = token {
          print("FCM token obtained after APNS token set: \(token)")
        }
      }
    }
  }

  func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    print("Failed to register for remote notifications: \(error.localizedDescription)")
  }
}

// MARK: - UNUserNotificationCenterDelegate
extension AppDelegate: UNUserNotificationCenterDelegate {
  // Handle notification when app is in foreground
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    // Show notification even when app is in foreground
    if #available(iOS 14.0, *) {
      completionHandler([.banner, .sound, .badge])
    } else {
      completionHandler([.alert, .sound, .badge])
    }
  }

  // Handle notification tap
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    // Handle notification tap
    completionHandler()
  }
}

// MARK: - MessagingDelegate
extension AppDelegate: MessagingDelegate {
  func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
    guard let fcmToken = fcmToken else { return }
    print("FCM registration token: \(fcmToken)")

    // Store the token for later use
    UserDefaults.standard.set(fcmToken, forKey: "FCMToken")
    UserDefaults.standard.synchronize()
  }

}

// MARK: - ReactNativeDelegate
class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
