const SHELL_CACHE = 'orion-shell-v1';
const RUNTIME_CACHE = 'orion-runtime-v1';
const APP_SHELL_FILES = [
  './',
  './index.html',
  './auth/index.html',
  './manifest.webmanifest',
  './pwa/icon-base.svg',
  './pwa/orion-mark.png'
];

self.addEventListener('message', (event) => {
  const data = event?.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function resolveScopeUrl(path = './') {
  return new URL(path, self.registration.scope).toString();
}

function isSameOriginRequest(requestUrl) {
  return requestUrl.origin === self.location.origin;
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(APP_SHELL_FILES.map((file) => resolveScopeUrl(file)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheKeys = await caches.keys();
    await Promise.all(
      cacheKeys
        .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

async function handleNavigationRequest(request) {
  const runtimeCache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await runtimeCache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    return (
      await runtimeCache.match(request)
      || await caches.match(resolveScopeUrl('./index.html'))
      || await caches.match(resolveScopeUrl('./'))
    );
  }
}

async function handleStaticRequest(request) {
  const runtimeCache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await runtimeCache.match(request);

  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response && response.ok) {
        await runtimeCache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cachedResponse) {
    void networkPromise;
    return cachedResponse;
  }

  return networkPromise || fetch(request);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const requestUrl = new URL(request.url);
  if (!isSameOriginRequest(requestUrl)) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  const destination = request.destination || '';
  const shouldHandleStatic = [
    'style',
    'script',
    'worker',
    'image',
    'font',
    'manifest'
  ].includes(destination)
    || requestUrl.pathname.includes('/assets/')
    || requestUrl.pathname.endsWith('.css')
    || requestUrl.pathname.endsWith('.js')
    || requestUrl.pathname.endsWith('.png');

  if (shouldHandleStatic) {
    event.respondWith(handleStaticRequest(request));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data && typeof event.notification.data === 'object'
    ? event.notification.data
    : {};
  const targetUrl = resolveScopeUrl(data.url || './');
  const payload = {
    type: 'orion-open-chat',
    url: targetUrl,
    chatServerId: String(data.chatServerId || '').trim(),
    localChatId: data.localChatId != null ? String(data.localChatId).trim() : ''
  };

  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    for (const client of clientsList) {
      if (!client || !client.url) continue;
      const clientUrl = new URL(client.url);
      if (clientUrl.origin !== self.location.origin) continue;
      try {
        if ('focus' in client) await client.focus();
        client.postMessage(payload);
      } catch (_) {
      }
      return;
    }

    const openedClient = await self.clients.openWindow(targetUrl);
    if (openedClient) {
      try {
        openedClient.postMessage(payload);
      } catch (_) {
      }
    }
  })());
});
