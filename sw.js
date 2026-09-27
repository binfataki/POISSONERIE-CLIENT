/**
 * Service worker — Portail client POISSONNERIE DE L'EST
 *
 * - Coquille de l'app (index.html, manifest, logo, icônes) : mise en cache
 *   à l'installation, servie en cache-first.
 * - Images produits (dist/assets/...) : mises en cache au fur et à mesure
 *   qu'elles sont demandées (cache-first, remplies dynamiquement — leur
 *   liste dépend du catalogue, connu seulement par l'app).
 * - Données du catalogue (appel vers le lien de synchronisation, autre
 *   origine) : jamais interceptées ici. L'app gère elle-même le
 *   réseau d'abord / repli sur la dernière configuration via son propre
 *   stockage local, comme demandé dans le brief.
 *
 * Pour forcer une mise à jour de la coquille chez les visiteurs après une
 * modification du site, incrémentez CACHE_VERSION.
 */
const CACHE_VERSION = 'pde-client-v2';
const APP_SHELL = [
  './index.html',
  './manifest.webmanifest',
  './logo.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Laisser passer normalement tout appel vers une autre origine
  // (le lien de synchronisation du catalogue) : l'app gère son propre
  // repli hors ligne pour ces données.
  if (url.origin !== self.location.origin) return;

  // Coquille + images produits (même origine) : cache d'abord, réseau en
  // secours, et on alimente/actualise le cache silencieusement.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
