// service-worker.js — Member Portal BMI Taekwondo Academy
// Meng-cache "shell" statis (HTML/CSS/JS) agar app tetap bisa terbuka
// walau sinyal lemah. Data Firestore (kas, profil, jadwal) TETAP butuh
// koneksi internet karena bersifat real-time, tidak di-cache di sini.

const CACHE_NAME = "bmi-member-shell-v1";
const APP_SHELL = [
  "./index.html",
  "./index.css",
  "./index.js",
  "./manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (event.request.url.startsWith(self.location.origin)) {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
