# Static deployment (no deployment performed)

Requirements: Node 22.12+ to build; runtime is a modern browser with Canvas 2D,
Pointer Events and Web Audio. npm ci && npm run build produces dist/.
Vite base is './'; asset URLs remain relative under /nightfold/ or any static prefix.
No router, API keys, external fonts, CDN dependency or telemetry.

To check a nested path locally, copy dist/ into a temporary web root's /nightfold/
folder, serve that web root with `python3 -m http.server 4180`, then open
http://127.0.0.1:4180/nightfold/. Exercise start, movement, draft and reload there.
Do not use file://; browser ES module security requires an HTTP server.

For a phone on the same trusted Wi-Fi, npm run dev listens on all interfaces; use
http://<computer LAN IP>:4178. This is LAN-only convenience, not a public deploy.
Stop the dev server when no longer needed. A physical phone pass is still required.
