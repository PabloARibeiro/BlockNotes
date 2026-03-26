const CACHE_NAME = 'blocknotes-v0.3.5';

// Ficheiros vitais que devem ser armazenados imediatamente na instalação
const ASSETS_STATIC = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './fontawesome/css/all.min.css'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_STATIC))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    // Limpa caches antigos se a versão do CACHE_NAME for alterada no futuro
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Se o ficheiro estiver no cache, devolve-o imediatamente
                if (cachedResponse) {
                    return cachedResponse;
                }
                // Se não estiver, vai à rede, mas guarda uma cópia no cache para a próxima vez
                return fetch(event.request).then(networkResponse => {
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                }).catch(() => {
                    // Prevenção de falhas severas se a rede cair e o recurso não estiver em cache
                    console.error('Falha ao aceder ao recurso offline:', event.request.url);
                });
            })
    );
});