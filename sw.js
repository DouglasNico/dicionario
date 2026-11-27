// Nome e versão do cache para controle de atualizações offline
const CACHE_NAME = 'dicionario-en-pt-v19';

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

// Interceptação de requisições: HTML usa rede primeiro para atualizar PWA rápido; estáticos usam cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const ehHtmlNavegacao =
    event.request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname.endsWith('/index.html');

  if (ehHtmlNavegacao) {
    event.respondWith(
      fetch(event.request)
        .then((respostaRede) => {
          if (respostaRede && respostaRede.status === 200 && respostaRede.type === 'basic') {
            const copia = respostaRede.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copia));
          }
          return respostaRede;
        })
        .catch(() => caches.match(event.request).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

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
        .catch(() => new Response('', { status: 503, statusText: 'Offline' }));
    })
  );
});
