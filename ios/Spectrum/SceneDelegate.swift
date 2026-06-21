import UIKit
import React
import React_RCTAppDelegate
import RNBootSplash

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }

    // Get the AppDelegate to access React Native factory
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else {
      return
    }

    window = UIWindow(windowScene: windowScene)
    appDelegate.window = window

    factory.startReactNative(
      withModuleName: "Spectrum",
      in: window,
      launchOptions: nil
    )

    if let rootView = window?.rootViewController?.view {
      RNBootSplash.initWithStoryboard("BootSplash", rootView: rootView)
    }

    window?.makeKeyAndVisible()

    // Handle URL if app was launched from a URL
    if let urlContext = connectionOptions.urlContexts.first {
      handleURL(urlContext.url)
    }
  }

  func sceneDidDisconnect(_ scene: UIScene) {
    // Called when the scene is released by the system
  }

  func sceneDidBecomeActive(_ scene: UIScene) {
    // Called when the scene moves from inactive to active state
  }

  func sceneWillResignActive(_ scene: UIScene) {
    // Called when the scene moves from active to inactive state
  }

  func sceneWillEnterForeground(_ scene: UIScene) {
    // Called when the scene moves from background to foreground
  }

  func sceneDidEnterBackground(_ scene: UIScene) {
    // Called when the scene moves from foreground to background
  }

  // MARK: - URL Handling

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let url = URLContexts.first?.url else { return }
    handleURL(url)
  }

  private func handleURL(_ url: URL) {
    print("🔄 Scene opened with URL: \(url.absoluteString)")

    // Check if the URL uses your scheme
    if url.scheme == "spectrum" || url.scheme == "com.spectrum.payments" {
      print("✅ URL matches our scheme: \(url.absoluteString)")

      // Post notification to inform the HyperpayModule
      NotificationCenter.default.post(
        name: NSNotification.Name("PaymentRedirectCompleted"),
        object: nil,
        userInfo: ["url": url]
      )
    }
  }

  // Handle Universal Links
  func scene(
    _ scene: UIScene,
    continue userActivity: NSUserActivity
  ) {
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
        }
      }
    }
  }
}
