const CACHE_PREFIX = 'viva-'
const CACHE = `${CACHE_PREFIX}v17`
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png']
const IS_DEV = self.location.hostname === '127.0.0.1' || self.location.hostname === 'localhost'

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)),
  )))
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  if (IS_DEV) return
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request)
        const cache = await caches.open(CACHE)
        await cache.put('/index.html', response.clone())
        return response
      } catch {
        const cached = await caches.match('/index.html', { ignoreSearch: true })
        return cached || new Response('O Viva está offline e ainda não foi carregado neste dispositivo.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      }
    })())
    return
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request)
    if (cached) return cached

    const response = await fetch(event.request)
    if (response.ok) {
      const copy = response.clone()
      const cache = await caches.open(CACHE)
      await cache.put(event.request, copy)
    }
    return response
  })())
})

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const target = event.notification.data?.url || '/?page=agua'
  event.waitUntil(self.clients.matchAll({ type: 'window' }).then(clients => clients[0]?.focus() || self.clients.openWindow(target)))
})

self.addEventListener('push', event => {
  const fallback = { title: 'Hora de beber água 💧', body: 'Um pequeno gole agora mantém sua meta no caminho.', url: '/?page=agua' }
  let payload = fallback
  try { payload = { ...fallback, ...event.data.json() } } catch { /* usa mensagem padrão */ }
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: 'water-reminder',
    renotify: true,
    data: { url: payload.url },
  }))
})
