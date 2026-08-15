import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { isDesktop } from './core/desktop'
import './index.css'

// PWA caching is a web-only concern. Tauri uses a versioned WebView data
// directory and must not install a Service Worker that can serve stale assets.
if (!isDesktop() && 'serviceWorker' in navigator) {
  void import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => undefined)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
