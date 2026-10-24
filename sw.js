const CACHE_NAME = "dad-schedule-v19";
const DATA_CACHE = "dad-schedule-data"; // 알림 목록 등 앱 데이터 — 버전이 바뀌어도 지우지 않음
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
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== DATA_CACHE).map(k => caches.delete(k)))
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

// 앱이 꺼져 있어도 다가오는 이벤트 알림: 하루 한두 번 깨어나서 앱이 적어둔 목록 중 오늘 보낼 것을 보여줌
self.addEventListener("periodicsync", (e) => {
  if (e.tag === "event-reminders") e.waitUntil(showDueReminders());
});

async function showDueReminders() {
  const cache = await caches.open(DATA_CACHE);
  const read = async (name, fallback) => {
    const res = await cache.match(`./__${name}.json`);
    return res ? res.json() : fallback;
  };
  const { reminders = [] } = await read("reminders", {});
  const sent = await read("sent", {});
  const today = localDateKey(new Date());
  // 같은 이벤트의 알림(3일 전·하루 전)이 밀려 있으면 하나만
  const due = {};
  for (const r of reminders) {
    if (r.notifyOn > today || r.date <= today || sent[r.key]) continue;
    (due[r.event] = due[r.event] || []).push(r);
  }
  for (const group of Object.values(due)) {
    const r = group[0];
    const days = Math.round((parseLocalDate(r.date) - parseLocalDate(today)) / 86400000);
    const [, month, day] = r.date.split("-").map(Number);
    try {
      await self.registration.showNotification(`${r.emoji} ${days === 1 ? "내일" : `${days}일 후`} — ${r.title}`, {
        body: `${month}월 ${day}일${r.detail ? " · " + r.detail : ""}`,
        icon: "./assets/icons/icon-192.png",
        badge: "./assets/icons/icon-192.png",
        tag: r.event,
      });
      group.forEach(x => { sent[x.key] = true; });
    } catch (err) {}
  }
  await cache.put("./__sent.json", new Response(JSON.stringify(sent)));
}
function localDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseLocalDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

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
