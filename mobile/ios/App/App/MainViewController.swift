import UIKit
import Capacitor
import WebKit

/// Enables Safari Web Inspector attachment for the app's WKWebView in Debug builds.
/// Required on newer iOS versions where WebView inspection is opt-in.
class MainViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        #if DEBUG
        if #available(iOS 16.4, *) {
            // CAPBridgeViewController exposes the underlying WKWebView.
            // Mark it inspectable so it appears under Safari → Develop.
            self.webView?.isInspectable = true
        }
        #endif
    }
}

