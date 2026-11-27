// Nome e versão do cache para controle de atualizações offline
const CACHE_NAME = 'dicionario-en-pt-v13';

// Arquivos principais necessários para o app funcionar offline
const ARQUIVOS_ESSENCIAIS = [
  './',
  './index.html',
  './palavras.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Instalação: armazena todos os arquivos essenciais no cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARQUIVOS_ESSENCIAIS))
  );
  self.skipWaiting();
});

// Ativação: remove caches antigos quando a versão mudar
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(
        chaves
          .filter((chave) => chave !== CACHE_NAME)
          .map((chave) => caches.delete(chave))
      )
    )
  );
  self.clients.claim();
});

// Interceptação de requisições: responde primeiro pelo cache para funcionar offline
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((respostaCache) => {
      if (respostaCache) {
        return respostaCache;
      }

      return fetch(event.request)
        .then((respostaRede) => {
          if (!respostaRede || respostaRede.status !== 200 || respostaRede.type !== 'basic') {
            return respostaRede;
          }
          const copia = respostaRede.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, copia);
          });
          return respostaRede;
        })
        .catch(() => {
          // Em navegação offline, garante o retorno do index.html em cache
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('', { status: 503, statusText: 'Offline' });
        });
    })
  );
});
