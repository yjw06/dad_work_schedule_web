const CACHE_NAME = "dad-schedule-v15";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./vendor/korean-lunar-calendar.min.js",
  "./manifest.json",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // 앱 파일(같은 주소)만 캐시 — Firebase·날씨 같은 바깥 요청은 건드리지 않고 그대로 통과
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      })
      // 초대 링크(index.html?join=…)도 오프라인일 땐 저장된 화면으로
      .catch(() => caches.match(e.request, { ignoreSearch: e.request.mode === "navigate" }))
  );
});

self.addEventListener("push", (e) => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || "아빠 스케줄", {
      body: data.body || "일정이 업데이트됐어요!",
      icon: "./assets/icons/icon-192.png",
      badge: "./assets/icons/icon-192.png"
    })
  );
});

// 알림을 누르면 열려 있는 앱으로 가고, 없으면 새로 열기
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      if (list.length) return list[0].focus();
      return self.clients.openWindow("./");
    })
  );
});
