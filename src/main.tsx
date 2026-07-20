import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import './responsive-fixes.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
  })
} else if ('serviceWorker' in navigator) {
  // O service worker de uma build anterior pode mascarar o HMR do Vite e fazer
  // localhost parecer desatualizado. O SW atual ignora fetches no localhost, mas
  // continua registrado para permitir o teste real das notificações push.
  void navigator.serviceWorker.getRegistrations()
    .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
    .then(() => navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }))
    .catch(() => undefined)
  if ('caches' in window) void caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('viva-')).map(key => caches.delete(key)))).catch(() => undefined)
}
