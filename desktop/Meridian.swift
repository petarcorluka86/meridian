import Cocoa
import WebKit

/// Everything environment-specific — where the repo is, which port, which npm
/// script — comes from Info.plist, written by build-app.sh at build time. The
/// source stays free of one machine's paths.
struct Config {
    static func string(_ key: String, _ fallback: String) -> String {
        Bundle.main.object(forInfoDictionaryKey: key) as? String ?? fallback
    }

    static let projectDir = string("MeridianProjectDir", "")
    static let port = Int(string("MeridianPort", "3210")) ?? 3210
    static let command = string("MeridianCommand", "npm run dev")

    /// One key out of the app's own .env, read the way the app reads it: an
    /// uncommented `KEY=value`, last one winning, quotes stripped.
    static func env(_ key: String) -> String? {
        guard let text = try? String(contentsOfFile: projectDir + "/.env", encoding: .utf8) else {
            return nil
        }

        var found: String?
        for line in text.split(separator: "\n", omittingEmptySubsequences: false) {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            guard trimmed.hasPrefix(key + "=") else { continue }
            found = String(trimmed.dropFirst(key.count + 1))
                .trimmingCharacters(in: CharacterSet(charactersIn: " \"'"))
        }
        return found
    }

    /// The splash is painted before the server can answer, so this is the one
    /// place the theme rule has to be said twice — nothing here can ask the app
    /// which scheme it is in, because the app is what it is waiting for.
    /// MERIDIAN_THEME, with absent or unrecognised meaning light, and `system`
    /// the one value that hands the question to the machine.
    static var isDark: Bool {
        switch env("MERIDIAN_THEME") {
        case "dark": return true
        case "system":
            return NSApp.effectiveAppearance.bestMatch(from: [.aqua, .darkAqua]) == .darkAqua
        default: return false
        }
    }
}

class AppDelegate: NSObject, NSApplicationDelegate {
    var serverProcess: Process?
    var window: NSWindow!
    var webView: WKWebView!
    var splashView: NSView!
    var statusLabel: NSTextField!
    var dockMenu: NSMenu!

    /// 127.0.0.1, not localhost: the dev server binds the IPv4 loopback only, and
    /// `localhost` can resolve to ::1 first.
    let baseURL = URL(string: "http://127.0.0.1:\(Config.port)")!
    /// --bg, both halves — #f2f0ec and #161310. A colour written out here is a
    /// colour that cannot come from a token, and this one is on screen before a
    /// stylesheet exists.
    let ground = (
        light: NSColor(red: 0.949, green: 0.941, blue: 0.925, alpha: 1.0),
        dark: NSColor(red: 0.086, green: 0.075, blue: 0.063, alpha: 1.0)
    )

    /// The page reaches the window through `window.webkit.messageHandlers.meridian`,
    /// which exists only inside this shell — in a browser tab the same button
    /// falls back to reloading the document. See `settings/ReloadApp.tsx`.
    let bridgeName = "meridian"

    func applicationDidFinishLaunching(_ notification: Notification) {
        setupMainMenu()
        setupDockMenu()
        setupWindow()
        startServer()
    }

    // MARK: - UI Setup

    func setupWindow() {
        let isDark = Config.isDark
        let background = isDark ? ground.dark : ground.light
        let screen = NSScreen.main!.frame
        let width: CGFloat = 1280
        let height: CGFloat = 860
        let frame = NSRect(
            x: (screen.width - width) / 2,
            y: (screen.height - height) / 2,
            width: width,
            height: height
        )

        window = NSWindow(
            contentRect: frame,
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.title = "Meridian"
        window.titlebarAppearsTransparent = true
        window.titleVisibility = .hidden
        window.minSize = NSSize(width: 900, height: 560)
        window.isReleasedWhenClosed = false
        window.backgroundColor = background
        window.setFrameAutosaveName("MeridianMainWindow")

        let config = WKWebViewConfiguration()
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")
        config.userContentController.add(self, name: bridgeName)
        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.isHidden = true
        webView.setValue(false, forKey: "drawsBackground")
        webView.allowsBackForwardNavigationGestures = true

        splashView = NSView(frame: .zero)
        splashView.wantsLayer = true
        splashView.layer?.backgroundColor = background.cgColor
        // The ground above is one fixed colour, so the spinner and the label
        // over it cannot be left to the machine's appearance: in dark mode on a
        // light app they came out white on cream, and the wait looked like a
        // blank window. Scoped to the splash — the web view keeps the machine's
        // answer, which is what `system` renders from.
        splashView.appearance = NSAppearance(named: isDark ? .darkAqua : .aqua)

        let spinner = NSProgressIndicator(frame: .zero)
        spinner.style = .spinning
        spinner.controlSize = .regular
        spinner.startAnimation(nil)
        spinner.translatesAutoresizingMaskIntoConstraints = false

        statusLabel = NSTextField(labelWithString: "Starting Meridian…")
        statusLabel.font = NSFont.systemFont(ofSize: 13, weight: .medium)
        statusLabel.textColor = NSColor.secondaryLabelColor
        statusLabel.translatesAutoresizingMaskIntoConstraints = false

        splashView.addSubview(spinner)
        splashView.addSubview(statusLabel)

        let contentView = NSView(frame: frame)
        webView.translatesAutoresizingMaskIntoConstraints = false
        splashView.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(webView)
        contentView.addSubview(splashView)
        window.contentView = contentView

        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: contentView.topAnchor),
            webView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),

            splashView.topAnchor.constraint(equalTo: contentView.topAnchor),
            splashView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor),
            splashView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
            splashView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),

            spinner.centerXAnchor.constraint(equalTo: splashView.centerXAnchor),
            spinner.centerYAnchor.constraint(equalTo: splashView.centerYAnchor, constant: -12),
            statusLabel.centerXAnchor.constraint(equalTo: splashView.centerXAnchor),
            statusLabel.topAnchor.constraint(equalTo: spinner.bottomAnchor, constant: 16),
        ])

        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    func setupMainMenu() {
        let mainMenu = NSMenu()

        let appMenuItem = NSMenuItem()
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "About Meridian", action: #selector(showAbout), keyEquivalent: "")
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(withTitle: "Open in Browser", action: #selector(openInBrowser), keyEquivalent: "")
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(withTitle: "Quit Meridian", action: #selector(quitApp), keyEquivalent: "q")
        appMenuItem.submenu = appMenu
        mainMenu.addItem(appMenuItem)

        // Without an Edit menu the web view gets no copy/paste/undo key equivalents.
        let editMenuItem = NSMenuItem()
        let editMenu = NSMenu(title: "Edit")
        editMenu.addItem(withTitle: "Undo", action: Selector(("undo:")), keyEquivalent: "z")
        editMenu.addItem(withTitle: "Redo", action: Selector(("redo:")), keyEquivalent: "Z")
        editMenu.addItem(NSMenuItem.separator())
        editMenu.addItem(withTitle: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        editMenu.addItem(withTitle: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        editMenu.addItem(withTitle: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        editMenu.addItem(withTitle: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        editMenuItem.submenu = editMenu
        mainMenu.addItem(editMenuItem)

        let viewMenuItem = NSMenuItem()
        let viewMenu = NSMenu(title: "View")
        viewMenu.addItem(withTitle: "Reload", action: #selector(reloadPage), keyEquivalent: "r")
        viewMenu.addItem(withTitle: "Back", action: #selector(goBack), keyEquivalent: "[")
        viewMenu.addItem(withTitle: "Forward", action: #selector(goForward), keyEquivalent: "]")
        viewMenu.addItem(NSMenuItem.separator())
        viewMenu.addItem(withTitle: "Actual Size", action: #selector(zoomReset), keyEquivalent: "0")
        viewMenu.addItem(withTitle: "Zoom In", action: #selector(zoomIn), keyEquivalent: "+")
        viewMenu.addItem(withTitle: "Zoom Out", action: #selector(zoomOut), keyEquivalent: "-")
        viewMenu.addItem(NSMenuItem.separator())
        let fullScreen = NSMenuItem(
            title: "Toggle Full Screen",
            action: #selector(NSWindow.toggleFullScreen(_:)),
            keyEquivalent: "f"
        )
        fullScreen.keyEquivalentModifierMask = [.control, .command]
        viewMenu.addItem(fullScreen)
        viewMenuItem.submenu = viewMenu
        mainMenu.addItem(viewMenuItem)

        NSApp.mainMenu = mainMenu
    }

    func setupDockMenu() {
        dockMenu = NSMenu()
        dockMenu.addItem(withTitle: "Reload", action: #selector(reloadPage), keyEquivalent: "")
        dockMenu.addItem(withTitle: "Open in Browser", action: #selector(openInBrowser), keyEquivalent: "")
    }

    func applicationDockMenu(_ sender: NSApplication) -> NSMenu? {
        dockMenu
    }

    // MARK: - Server

    func startServer() {
        if isPortOpen() {
            loadApp()
            return
        }

        /// A non-login zsh with the node manager bootstrapped by hand: the login
        /// files here set up nvm, but the shell that actually runs node day to day
        /// gets fnm from .zshrc, and `fnm use` is what honours .nvmrc.
        let script = """
            export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
            cd \(shellQuoted(Config.projectDir)) || exit 1
            if command -v fnm > /dev/null 2>&1; then
                eval "$(fnm env)"
                fnm use --install-if-missing > /dev/null 2>&1
            elif [ -s "$HOME/.nvm/nvm.sh" ]; then
                . "$HOME/.nvm/nvm.sh"
                nvm use > /dev/null 2>&1 || nvm use --lts > /dev/null 2>&1
            fi
            export PORT=\(Config.port)
            exec \(Config.command)
            """

        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/bin/zsh")
        process.arguments = ["-c", script]
        process.qualityOfService = .userInitiated
        process.standardOutput = FileHandle.nullDevice
        process.standardError = FileHandle.nullDevice

        do {
            try process.run()
            serverProcess = process
            waitAndLoad()
        } catch {
            let alert = NSAlert()
            alert.messageText = "Failed to start the Meridian server"
            alert.informativeText = error.localizedDescription
            alert.runModal()
        }
    }

    /// The dev server is a cold Next build on first launch, so the wait is generous.
    func waitAndLoad() {
        DispatchQueue.global().async {
            for attempt in 0..<90 {
                if self.isPortOpen() {
                    DispatchQueue.main.async { self.loadApp() }
                    return
                }
                if attempt == 8 {
                    DispatchQueue.main.async {
                        self.statusLabel.stringValue = "Building — first launch takes a moment…"
                    }
                }
                Thread.sleep(forTimeInterval: 1)
            }
            DispatchQueue.main.async {
                self.statusLabel.stringValue = "Server did not come up on port \(Config.port)."
                self.loadApp()
            }
        }
    }

    func loadApp() {
        webView.load(URLRequest(url: baseURL))
    }

    func isPortOpen() -> Bool {
        let sock = socket(AF_INET, SOCK_STREAM, 0)
        guard sock >= 0 else { return false }
        defer { close(sock) }

        var addr = sockaddr_in()
        addr.sin_family = sa_family_t(AF_INET)
        addr.sin_port = UInt16(Config.port).bigEndian
        addr.sin_addr.s_addr = inet_addr("127.0.0.1")

        let result = withUnsafePointer(to: &addr) {
            $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                connect(sock, $0, socklen_t(MemoryLayout<sockaddr_in>.size))
            }
        }
        return result == 0
    }

    /// npm spawns next as a child, so terminating the shell leaves the server
    /// holding the port. Whatever listens on it goes too.
    func killServer() {
        guard serverProcess != nil else { return }

        let cleanup = Process()
        cleanup.executableURL = URL(fileURLWithPath: "/bin/zsh")
        cleanup.arguments = ["-c", "lsof -t -i :\(Config.port) -sTCP:LISTEN | xargs -r kill -9 2>/dev/null"]
        try? cleanup.run()
        cleanup.waitUntilExit()

        if let process = serverProcess, process.isRunning {
            process.terminate()
        }
        serverProcess = nil
    }

    func shellQuoted(_ path: String) -> String {
        "'" + path.replacingOccurrences(of: "'", with: "'\\''") + "'"
    }

    // MARK: - Actions

    @objc func reloadPage() { webView.reload() }
    @objc func goBack() { webView.goBack() }
    @objc func goForward() { webView.goForward() }
    @objc func zoomIn() { webView.pageZoom = min(webView.pageZoom + 0.1, 2.5) }
    @objc func zoomOut() { webView.pageZoom = max(webView.pageZoom - 0.1, 0.5) }
    @objc func zoomReset() { webView.pageZoom = 1.0 }

    @objc func openInBrowser() {
        NSWorkspace.shared.open(webView.url ?? baseURL)
    }

    @objc func showAbout() {
        let alert = NSAlert()
        alert.messageText = "Meridian"
        alert.informativeText = """
            A local hub for running a team.

            Serving \(baseURL.absoluteString)
            from \(Config.projectDir)
            """
        alert.alertStyle = .informational
        alert.runModal()
    }

    @objc func quitApp() {
        killServer()
        NSApp.terminate(nil)
    }

    /// Settings → Reload, when the page is running inside this window: the window
    /// *is* the app, so starting over means this process rather than the
    /// document. The server goes with it under the same rule as quitting — only
    /// if this app was the one that started it.
    ///
    /// The reopening is a detached shell rather than anything in here, because
    /// nothing in a process can outlive its own termination. It waits for this
    /// pid to actually go: `open` on a bundle that is still terminating
    /// activates the instance that is on its way out, and no new one appears.
    @objc func restartApp() {
        killServer()

        let pid = ProcessInfo.processInfo.processIdentifier
        let relaunch = Process()
        relaunch.executableURL = URL(fileURLWithPath: "/bin/zsh")
        relaunch.arguments = [
            "-c",
            "while kill -0 \(pid) 2>/dev/null; do sleep 0.2; done; "
                + "open \(shellQuoted(Bundle.main.bundlePath))",
        ]
        relaunch.standardOutput = FileHandle.nullDevice
        relaunch.standardError = FileHandle.nullDevice
        try? relaunch.run()

        NSApp.terminate(nil)
    }

    // MARK: - Lifecycle

    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        killServer()
        return .terminateNow
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        return false
    }

    /// Closing the window parks the app in the Dock rather than shutting the vault down.
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        false
    }
}

// MARK: - WKNavigationDelegate

extension AppDelegate: WKNavigationDelegate {
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        splashView.isHidden = true
        webView.isHidden = false
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        retryLoad()
    }

    func webView(
        _ webView: WKWebView,
        didFailProvisionalNavigation navigation: WKNavigation!,
        withError error: Error
    ) {
        retryLoad()
    }

    func retryLoad() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { self.loadApp() }
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.allow)
            return
        }

        if url.host == "127.0.0.1" || url.host == "localhost" {
            decisionHandler(.allow)
            return
        }

        NSWorkspace.shared.open(url)
        decisionHandler(.cancel)
    }
}

// MARK: - WKUIDelegate

extension AppDelegate: WKUIDelegate {
    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = navigationAction.request.url {
            if url.host == "127.0.0.1" || url.host == "localhost" {
                webView.load(navigationAction.request)
            } else {
                NSWorkspace.shared.open(url)
            }
        }
        return nil
    }
}

// MARK: - WKScriptMessageHandler

extension AppDelegate: WKScriptMessageHandler {
    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == bridgeName, let body = message.body as? String else { return }

        switch body {
        case "restart": restartApp()
        default: break
        }
    }
}

// MARK: - Entry Point

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
