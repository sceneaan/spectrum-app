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

    if let urlContext = connectionOptions.urlContexts.first {
      handleURL(urlContext.url)
    }
  }

  func sceneDidDisconnect(_ scene: UIScene) {}

  func sceneDidBecomeActive(_ scene: UIScene) {}

  func sceneWillResignActive(_ scene: UIScene) {}

  func sceneWillEnterForeground(_ scene: UIScene) {}

  func sceneDidEnterBackground(_ scene: UIScene) {}

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let url = URLContexts.first?.url else { return }
    handleURL(url)
  }

  private func isPaymentReturnURL(_ url: URL) -> Bool {
    if url.scheme == "com.spectrum.payments" { return true }

    let value = url.absoluteString.lowercased()
    if value.contains("payment/success") || value.contains("payment/redirect") {
      return true
    }

    if url.scheme == "spectrum" && value.contains("payment") {
      return true
    }

    return false
  }

  private func handleURL(_ url: URL) {
    print("🔄 Scene opened with URL: \(url.absoluteString)")

    if isPaymentReturnURL(url) {
      NotificationCenter.default.post(
        name: NSNotification.Name("PaymentRedirectCompleted"),
        object: nil,
        userInfo: ["url": url]
      )
      return
    }

    _ = SpectrumOpenURL(url)
  }

  func scene(
    _ scene: UIScene,
    continue userActivity: NSUserActivity
  ) {
    if userActivity.activityType == NSUserActivityTypeBrowsingWeb,
       let url = userActivity.webpageURL {
      print("🔄 Universal Link opened: \(url.absoluteString)")

      if isPaymentReturnURL(url) {
        NotificationCenter.default.post(
          name: NSNotification.Name("PaymentRedirectCompleted"),
          object: nil,
          userInfo: ["url": url]
        )
        return
      }

      _ = SpectrumContinueUserActivity(userActivity)
    }
  }
}
