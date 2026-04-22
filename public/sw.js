const SHELL_CACHE = 'nymo-shell-v8';
const RUNTIME_CACHE = 'nymo-runtime-v8';
const APP_SHELL_FILES = [
  './',
  './index.html',
  './auth/index.html',
  './manifest.webmanifest',
  './pwa/icon-192.png',
  './pwa/icon-512.png',
  './pwa/favicon-dark.png',
  './pwa/favicon-light.png'
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
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      await runtimeCache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (_) {
  }

  const cachedResponse = await runtimeCache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  const appShellResponse = await caches.match(resolveScopeUrl('./index.html'))
    || await caches.match(resolveScopeUrl('./'));
  if (appShellResponse) {
    return appShellResponse;
  }

  return Response.error();
}

async function handleStaticRequest(request) {
  const requestUrl = new URL(request.url);
  const runtimeCache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await runtimeCache.match(request);
  const isImmutableAsset = requestUrl.pathname.includes('/assets/')
    || requestUrl.pathname.includes('/pwa/');

  if (!isImmutableAsset) {
    try {
      return await fetch(request);
    } catch (_) {
      if (cachedResponse) return cachedResponse;
      return Response.error();
    }
  }

  if (cachedResponse) return cachedResponse;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      await runtimeCache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (_) {
    if (cachedResponse) return cachedResponse;
    return Response.error();
  }
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
  const isImmutableAsset = requestUrl.pathname.includes('/assets/')
    || requestUrl.pathname.includes('/pwa/');
  const isAppManifest = destination === 'manifest'
    || requestUrl.pathname.endsWith('manifest.webmanifest');
  const shouldHandleStatic = isImmutableAsset || isAppManifest;

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
