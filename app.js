const firebaseConfig = {
  apiKey: "AIzaSyBmF43ThMFz9tN2A90zmD_K7ybkv2gLMIU",
  authDomain: "dad-work-schedule.firebaseapp.com",
  projectId: "dad-work-schedule",
  storageBucket: "dad-work-schedule.firebasestorage.app",
  messagingSenderId: "452426155762",
  appId: "1:452426155762:web:8fa302a7acde767e4bb26b"
};

const EMOJI_CATEGORIES = [
  { label: "기념·축하",   emojis: ["🎂","🎉","❤️","🎁"] },
  { label: "건강",       emojis: ["💊","🏥","🩺"] },
  { label: "일·돈",      emojis: ["💼","💰","📋"] },
  { label: "여가·취미",   emojis: ["⛳","🏃","✈️","🎣"] },
  { label: "모임·약속",   emojis: ["🍽️","☕","🍺"] },
  { label: "가족·경조사", emojis: ["🎓","💒","🐶"] },
  { label: "생활·기타",   emojis: ["🚗","💇","📌","📅"] }
];
function emojiPickerHTML(selected, onclickFn) {
  // 카테고리 순서대로 펼쳐 하나의 그리드로 (라벨 없이 순서만 유지)
  return EMOJI_CATEGORIES.flatMap(cat => cat.emojis).map(e =>
    `<div class="emoji-option ${e === selected ? "selected" : ""}" onclick="${onclickFn}('${e}')">${e}</div>`
  ).join("");
}
const KO_WEEKDAYS = ["일","월","화","수","목","금","토"];

let db = null;
let roomDoc = null;
let unsubscribe = null;
let chatUnsub = null;

let baseDate = null;
let overrides = {};
let periods = [];
let notes = {};
let events = [];
let members = [];
let personalSchedules = [];
let weatherData = {};

let calendarMonth = new Date();
let bottomSheetDate = null;
let selectedEventEmoji = "🎂";
let selectedPersonalEmoji = "📌";
let isFirstSnapshot = true;

let rangeMonth = new Date();
let rangeStart = null;
let rangeEnd = null;

let selectedRecurrence = "yearly";
let selectedWeekday = 0;
let editingEventId = null;

function getDeviceId() {
  const uid = firebase.auth?.()?.currentUser?.uid;
  if (uid) return uid;
  let id = localStorage.getItem("v2_device_id");
  if (!id) {
    id = "d_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    localStorage.setItem("v2_device_id", id);
  }
  return id;
}
function getMyName() { return localStorage.getItem("v2_user_name") || "나"; }
function getRoomCode() { return localStorage.getItem("v2_room_code"); }
function isSetupDone() { return localStorage.getItem("v2_setup_done") === "true"; }
function myMeta() { return { by: getMyName(), byId: getDeviceId(), at: Date.now() }; }

function initFirebase() {
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  if (!db) db = firebase.firestore();
}

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function normalizeDate(d) {
  const r = new Date(d); r.setHours(0, 0, 0, 0); return r;
}
function dateKey(d) {
  const n = normalizeDate(d);
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function diffDays(a, b) { return Math.round((normalizeDate(a) - normalizeDate(b)) / 86400000); }

// 근무일 여부: overrides → periods → 기준일 2일 교대
function isWorkDay(date) {
  const key = dateKey(date);
  if (overrides[key] !== undefined) return overrides[key];
  for (const p of [...periods].sort((a, b) => new Date(b.end) - new Date(a.end))) {
    if (key >= p.start && key <= p.end) return p.type === "work";
  }
  if (!baseDate) return true;
  const diff = diffDays(date, baseDate);
  return ((diff % 2) + 2) % 2 === 0;
}

function eventMatchesDate(ev, date) {
  if (ev.recurrence === "once") return ev.date === dateKey(date);
  if (!ev.recurrence || ev.recurrence === "yearly") return ev.month === date.getMonth()+1 && ev.day === date.getDate();
  if (ev.recurrence === "weekly") return ev.weekday === date.getDay();
  if (ev.recurrence === "monthly") return ev.monthDay === date.getDate();
  return false;
}

function getNextOccurrence(ev, today) {
  if (ev.recurrence === "once") {
    const [y, m, d] = ev.date.split("-").map(Number);
    return normalizeDate(new Date(y, m-1, d));
  }
  if (!ev.recurrence || ev.recurrence === "yearly") {
    const y = today.getFullYear();
    let d = new Date(y, (ev.month||1)-1, ev.day||1);
    if (normalizeDate(d) < today) d = new Date(y+1, (ev.month||1)-1, ev.day||1);
    return normalizeDate(d);
  }
  if (ev.recurrence === "weekly") {
    const wd = ev.weekday || 0;
    let d = new Date(today);
    for (let i = 0; i < 7; i++) { if (d.getDay() === wd) return normalizeDate(d); d = addDays(d, 1); }
    return normalizeDate(d);
  }
  if (ev.recurrence === "monthly") {
    const day = ev.monthDay || 1;
    let d = new Date(today.getFullYear(), today.getMonth(), day);
    if (normalizeDate(d) < today) d = new Date(today.getFullYear(), today.getMonth()+1, day);
    return normalizeDate(d);
  }
  return today;
}

async function saveToFirestore(updates) {
  if (!roomDoc) return;
  try { await roomDoc.update(updates); } catch(e) { console.error("Firestore write error", e); }
}

function saveToCache() {
  localStorage.setItem("v2_base_date", baseDate ? baseDate.getTime() : "");
  localStorage.setItem("v2_overrides", JSON.stringify(overrides));
  localStorage.setItem("v2_periods", JSON.stringify(periods));
  localStorage.setItem("v2_notes", JSON.stringify(notes));
  localStorage.setItem("v2_events", JSON.stringify(events));
  localStorage.setItem("v2_members", JSON.stringify(members));
  localStorage.setItem("v2_personal_schedules", JSON.stringify(personalSchedules));
}
function loadFromCache() {
  const bd = localStorage.getItem("v2_base_date");
  baseDate = bd ? new Date(Number(bd)) : normalizeDate(new Date());
  overrides = JSON.parse(localStorage.getItem("v2_overrides") || "{}");
  periods = JSON.parse(localStorage.getItem("v2_periods") || "[]");
  notes = JSON.parse(localStorage.getItem("v2_notes") || "{}");
  events = JSON.parse(localStorage.getItem("v2_events") || "[]");
  members = JSON.parse(localStorage.getItem("v2_members") || "[]");
  personalSchedules = JSON.parse(localStorage.getItem("v2_personal_schedules") || "[]");
  const wc = JSON.parse(localStorage.getItem("v2_weather_cache") || "null");
  if (wc && Date.now() - wc.fetchedAt < 3600000) weatherData = wc.data || {};
}

document.addEventListener("DOMContentLoaded", () => {
  initFirebase();
  buildEmojiPicker();
  firebase.auth().onAuthStateChanged(handleAuthState);
});

function handleAuthState(user) {
  if (!user) { showView("view-login"); return; }
  localStorage.setItem("v2_device_id", user.uid);
  if (!localStorage.getItem("v2_user_name") && user.displayName) {
    localStorage.setItem("v2_user_name", user.displayName);
  }
  const sub = document.getElementById("card-account-sub");
  if (sub) sub.textContent = user.email || "Google 계정에서 로그아웃";
  if (isSetupDone() && getRoomCode()) { startApp(); return; }
  // 로컬에 방 정보 없으면 Firestore에서 조회
  db.collection("memberships").doc(user.uid).get().then(snap => {
    if (snap.exists) {
      const { roomCode, userName } = snap.data();
      localStorage.setItem("v2_room_code", roomCode);
      localStorage.setItem("v2_setup_done", "true");
      if (userName && !localStorage.getItem("v2_user_name")) localStorage.setItem("v2_user_name", userName);
      startApp();
    } else {
      const nameInput = document.getElementById("setup-name-input");
      if (nameInput && !nameInput.value) nameInput.value = localStorage.getItem("v2_user_name") || user.displayName || "";
      showView("view-setup");
    }
  }).catch(() => {
    const nameInput = document.getElementById("setup-name-input");
    if (nameInput && !nameInput.value) nameInput.value = localStorage.getItem("v2_user_name") || user.displayName || "";
    showView("view-setup");
  });
}

function isNativeApp() {
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

async function signInWithGoogle() {
  // 네이티브(안드로이드 앱): WebView에서는 signInWithPopup이 막히므로
  // 네이티브 플러그인으로 구글 로그인 → idToken을 받아 compat SDK에 넘긴다.
  if (isNativeApp()) {
    try {
      const FA = window.Capacitor.Plugins.FirebaseAuthentication;
      const result = await FA.signInWithGoogle();
      const idToken = result?.credential?.idToken;
      if (!idToken) throw new Error("no idToken");
      const cred = firebase.auth.GoogleAuthProvider.credential(idToken);
      await firebase.auth().signInWithCredential(cred);
    } catch(e) {
      showToast("로그인에 실패했어요. 다시 시도해주세요.");
    }
    return;
  }
  // 웹(PWA): 기존 팝업 방식
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await firebase.auth().signInWithPopup(provider);
  } catch(e) {
    if (e.code !== "auth/popup-closed-by-user") showToast("로그인에 실패했어요. 다시 시도해주세요.");
  }
}

async function signOutUser() {
  if (!confirm("로그아웃 하시겠어요?")) return;
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  if (chatUnsub) { chatUnsub(); chatUnsub = null; }
  db = null; roomDoc = null;
  if (isNativeApp()) {
    try { await window.Capacitor.Plugins.FirebaseAuthentication.signOut(); } catch(e) {}
  }
  await firebase.auth().signOut();
}

function showView(id) {
  document.getElementById("view-login").style.display = id === "view-login" ? "" : "none";
  document.getElementById("view-setup").style.display = id === "view-setup" ? "" : "none";
  document.getElementById("view-app").style.display = id === "view-app" ? "" : "none";
}

function goToSetupGroup() {
  const name = document.getElementById("setup-name-input").value.trim();
  if (!name) { document.getElementById("setup-name-input").focus(); return; }
  localStorage.setItem("v2_user_name", name);
  document.getElementById("setup-step-name").style.display = "none";
  document.getElementById("setup-step-group").style.display = "";
}
function backToSetupName() {
  document.getElementById("setup-step-group").style.display = "none";
  document.getElementById("setup-step-name").style.display = "";
}
function backToSetupGroup() {
  document.getElementById("setup-step-code-show").style.display = "none";
  document.getElementById("setup-step-code-join").style.display = "none";
  document.getElementById("setup-step-group").style.display = "";
}

async function createGroup() {
  document.getElementById("setup-step-group").style.display = "none";
  try {
    initFirebase();
    let code; let attempts = 0;
    while (attempts < 5) {
      code = generateRoomCode();
      const snap = await db.collection("rooms").doc(code).get();
      if (!snap.exists) break;
      attempts++;
    }
    const deviceId = getDeviceId(); const name = getMyName(); const now = Date.now();
    await db.collection("rooms").doc(code).set({
      createdAt: now, hostDeviceId: deviceId,
      members: [{ deviceId, name, joinedAt: now }],
      baseDate: now, overrides: {}, periods: [], notes: {}, events: [], personalSchedules: []
    });
    localStorage.setItem("v2_room_code", code);
    localStorage.setItem("v2_is_host", "true");
    await db.collection("memberships").doc(deviceId).set({ roomCode: code, userName: name });
    document.getElementById("setup-generated-code").textContent = code;
    document.getElementById("setup-step-code-show").style.display = "";
  } catch(e) {
    console.error("createGroup error:", e);
    showToast("오류가 발생했어요. Firestore 규칙을 확인하거나 다시 시도해주세요.");
    document.getElementById("setup-step-group").style.display = "";
  }
}

function copyGroupCode() {
  const code = getRoomCode() || document.getElementById("setup-generated-code")?.textContent || "";
  navigator.clipboard.writeText(code).then(() => showToast("코드가 복사됐어요!")).catch(() => {});
}

function finishSetupAsHost() {
  localStorage.setItem("v2_setup_done", "true");
  startApp();
}

function showJoinInput() {
  document.getElementById("setup-step-group").style.display = "none";
  document.getElementById("setup-step-code-join").style.display = "";
}

async function joinGroup() {
  const input = document.getElementById("setup-join-code-input").value.trim().toUpperCase();
  const errEl = document.getElementById("setup-join-error");
  errEl.style.display = "none";
  if (!input || input.length < 4) { errEl.style.display = ""; return; }
  try { initFirebase(); } catch(e) { showToast("네트워크 오류. 다시 시도해주세요."); return; }
  let snap;
  try { snap = await db.collection("rooms").doc(input).get(); }
  catch(e) { showToast("Firestore 연결 오류. 보안 규칙을 확인해주세요."); return; }
  if (!snap.exists) {
    errEl.style.display = "";
    errEl.classList.remove("setup-join-error"); void errEl.offsetWidth; errEl.classList.add("setup-join-error");
    return;
  }
  const deviceId = getDeviceId(); const name = getMyName();
  const data = snap.data();
  const existingByDevice = (data.members || []).findIndex(m => m.deviceId === deviceId);
  if (existingByDevice < 0) {
    const existingByName = (data.members || []).findIndex(m => m.name === name);
    if (existingByName >= 0) {
      const updated = [...data.members];
      updated[existingByName] = { ...updated[existingByName], deviceId };
      await db.collection("rooms").doc(input).update({ members: updated });
    } else {
      await db.collection("rooms").doc(input).update({
        members: firebase.firestore.FieldValue.arrayUnion({ deviceId, name, joinedAt: Date.now() })
      });
    }
  }
  localStorage.setItem("v2_room_code", input);
  localStorage.setItem("v2_setup_done", "true");
  await db.collection("memberships").doc(deviceId).set({ roomCode: input, userName: name });
  startApp();
}

function startApp() {
  const code = getRoomCode();
  if (!code) { localStorage.removeItem("v2_setup_done"); showView("view-setup"); return; }
  initFirebase();
  roomDoc = db.collection("rooms").doc(code);
  loadFromCache();
  showView("view-app");
  updateUI();
  subscribeFirestore();
  renderMemberList();
  document.getElementById("group-code-display").textContent = code;
  fetchWeather();
  registerPushNotifications();   // 네이티브: FCM 토큰 등록 (채팅 푸시용)
  initNotifSettings();           // 가족 탭 알림 토글 상태 반영 (네이티브 전용)
  if (!localStorage.getItem("v2_notif_asked")) {
    setTimeout(() => {
      if (!isNativeApp() && "Notification" in window && Notification.permission === "default") {
        document.getElementById("notif-banner").style.display = "";
      }
      localStorage.setItem("v2_notif_asked", "true");
    }, 3000);
  }
}

function subscribeFirestore() {
  if (unsubscribe) unsubscribe();
  unsubscribe = roomDoc.onSnapshot(snap => {
    if (!snap.exists) return;
    const data = snap.data();
    const prev = JSON.stringify({ baseDate, overrides, periods, notes, events, members, personalSchedules });
    baseDate = data.baseDate ? new Date(data.baseDate) : normalizeDate(new Date());
    overrides = data.overrides || {};
    periods = data.periods || [];
    notes = data.notes || {};
    events = data.events || [];
    members = data.members || [];
    personalSchedules = data.personalSchedules || [];
    saveToCache();
    updateUI();
    renderMemberList();
    scheduleLocalReminders();   // 네이티브: 최신 데이터로 예약 알림 재등록 (앱 닫혀도 작동)
    if (!isFirstSnapshot) {
      const curr = JSON.stringify({ baseDate, overrides, periods, notes, events, members, personalSchedules });
      if (prev !== curr && document.hidden) sendNotification("📅 일정이 업데이트됐어요!", "가족이 일정을 변경했습니다.");
      checkUpcomingNotifications();
    }
    isFirstSnapshot = false;
  });
}

function allowNotifications() {
  Notification.requestPermission().then(p => {
    document.getElementById("notif-banner").style.display = "none";
    if (p === "granted") checkUpcomingNotifications();
  });
}
function dismissNotifBanner() { document.getElementById("notif-banner").style.display = "none"; }
function sendNotification(title, body) {
  if (Notification.permission === "granted") new Notification(title, { body, icon: "./assets/icons/icon-192.png" });
}

function checkUpcomingNotifications() {
  if (Notification.permission !== "granted") return;
  const today = normalizeDate(new Date());
  const todayKey = dateKey(today);
  const sent = JSON.parse(localStorage.getItem("v2_notif_sent") || "{}");
  for (const ev of events) {
    const nextDate = getNextOccurrence(ev, today);
    const diff = diffDays(nextDate, today);
    if (diff === 1 || diff === 3) {
      const key = `ev_${ev.id}_d${diff}_${nextDate.getFullYear()}${nextDate.getMonth()}`;
      if (!sent[key]) {
        sendNotification(
          `${ev.emoji} ${diff === 1 ? "내일" : "3일 후"} — ${ev.title}`,
          `${nextDate.getMonth()+1}월 ${nextDate.getDate()}일`
        );
        sent[key] = true;
      }
    }
  }
  for (const ps of personalSchedules) {
    if (ps.date === todayKey) {
      const key = `ps_${ps.id}_${todayKey}`;
      if (!sent[key]) {
        sendNotification(`${ps.emoji || "📌"} 오늘 일정: ${ps.title}`, `${ps.by || ""}의 일정`);
        sent[key] = true;
      }
    }
  }
  localStorage.setItem("v2_notif_sent", JSON.stringify(sent));
}

// ===== 네이티브 로컬 알림: 예정 일정 리마인더 (앱이 닫혀 있어도 OS가 발사) =====
function lnPlugin() {
  return isNativeApp() ? window.Capacitor.Plugins.LocalNotifications : null;
}

async function ensureLocalNotifPermission() {
  const LN = lnPlugin();
  if (!LN) return false;
  try {
    let perm = await LN.checkPermissions();
    if (perm.display !== "granted") perm = await LN.requestPermissions();
    return perm.display === "granted";
  } catch(e) { return false; }
}

// 문자열 → 안정적인 양수 정수 (네이티브 알림 ID는 정수여야 함)
function notifId(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h) % 2000000000 + 1;
}

async function cancelAllLocalReminders() {
  const LN = lnPlugin();
  if (!LN) return;
  try {
    const pending = await LN.getPending();
    if (pending && pending.notifications && pending.notifications.length) {
      await LN.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
    }
  } catch(e) {}
}

async function scheduleLocalReminders() {
  const LN = lnPlugin();
  if (!LN) return;                                  // 웹에서는 동작 안 함 (no-op)
  if (!getNotifPref("events")) { await cancelAllLocalReminders(); return; }  // 설정에서 끔
  if (!(await ensureLocalNotifPermission())) return;

  // 기존 예약 전부 취소 후 최신 데이터로 재예약 (중복/구식 알림 방지)
  await cancelAllLocalReminders();

  const now = new Date();
  const today = normalizeDate(now);
  const toSchedule = [];

  // 가족 이벤트: 3일 전 / 1일 전 오전 9시
  for (const ev of events) {
    let nextDate;
    try { nextDate = getNextOccurrence(ev, today); } catch(e) { continue; }
    if (!nextDate) continue;
    for (const lead of [3, 1]) {
      const fire = new Date(nextDate);
      fire.setDate(fire.getDate() - lead);
      fire.setHours(9, 0, 0, 0);
      if (fire <= now) continue;
      toSchedule.push({
        id: notifId(`ev_${ev.id}_d${lead}_${dateKey(nextDate)}`),
        title: `${ev.emoji || "📅"} ${lead === 1 ? "내일" : "3일 후"} — ${ev.title}`,
        body: `${nextDate.getMonth()+1}월 ${nextDate.getDate()}일`,
        schedule: { at: fire, allowWhileIdle: true }
      });
    }
  }

  // 개인 일정: 당일 오전 8시
  for (const ps of personalSchedules) {
    if (!ps.date) continue;
    const [y, m, d] = ps.date.split("-").map(Number);
    if (!y || !m || !d) continue;
    const fire = new Date(y, m-1, d, 8, 0, 0, 0);
    if (fire <= now) continue;
    toSchedule.push({
      id: notifId(`ps_${ps.id}_${ps.date}`),
      title: `${ps.emoji || "📌"} 오늘 일정: ${ps.title}`,
      body: `${ps.by || ""}의 일정`,
      schedule: { at: fire, allowWhileIdle: true }
    });
  }

  if (toSchedule.length) {
    try { await LN.schedule({ notifications: toSchedule }); }
    catch(e) { console.warn("local notif schedule failed", e); }
  }
}

// ===== 네이티브 푸시 알림 (FCM): 채팅 메시지 알림 =====
async function ensurePushPermission() {
  if (!isNativeApp()) return false;
  const FM = window.Capacitor.Plugins.FirebaseMessaging;
  if (!FM) return false;
  try {
    let perm = await FM.checkPermissions();
    if (perm.receive !== "granted") perm = await FM.requestPermissions();
    return perm.receive === "granted";
  } catch(e) { return false; }
}

let _pushRegistered = false;
async function registerPushNotifications() {
  if (!isNativeApp()) return;
  if (!getNotifPref("chat")) return;                // 설정에서 끔
  const FM = window.Capacitor.Plugins.FirebaseMessaging;
  if (!FM) return;
  try {
    if (!(await ensurePushPermission())) return;

    // 안드로이드 알림 채널 (백그라운드 푸시 표시 보장)
    try { await FM.createChannel({ id: "default", name: "가족 알림", importance: 5, visibility: 1 }); } catch(e) {}

    const { token } = await FM.getToken();
    if (token) await saveFcmToken(token);

    if (!_pushRegistered) {
      _pushRegistered = true;
      FM.addListener("tokenReceived", (e) => { if (e && e.token) saveFcmToken(e.token); });
    }
  } catch(e) { console.warn("push register failed", e); }
}

async function saveFcmToken(token) {
  try {
    if (!roomDoc) return;
    const deviceId = getDeviceId();
    // 방 문서에 { fcmTokens: { [deviceId]: token } } 병합 저장
    await roomDoc.set({ fcmTokens: { [deviceId]: token } }, { merge: true });
  } catch(e) { console.warn("save fcm token failed", e); }
}

async function removeFcmToken() {
  try {
    if (!roomDoc) return;
    const deviceId = getDeviceId();
    await roomDoc.update({ ["fcmTokens." + deviceId]: firebase.firestore.FieldValue.delete() });
  } catch(e) {}
}

// ===== 알림 설정 토글 (가족 탭, 네이티브 전용) =====
function getNotifPref(type) {
  const v = localStorage.getItem("notifpref_" + type);
  return v === null ? true : v === "true";   // 기본값: 켜짐
}
function setNotifPref(type, val) {
  localStorage.setItem("notifpref_" + type, val ? "true" : "false");
}

function initNotifSettings() {
  const section = document.getElementById("notif-settings-section");
  if (!section) return;
  if (!isNativeApp()) { section.style.display = "none"; return; }  // 웹에선 숨김
  section.style.display = "";
  const ev = document.getElementById("toggle-notif-events");
  const ch = document.getElementById("toggle-notif-chat");
  if (ev) ev.checked = getNotifPref("events");
  if (ch) ch.checked = getNotifPref("chat");
}

async function onToggleNotif(type, el) {
  const on = el.checked;
  if (on) {
    const granted = type === "events"
      ? await ensureLocalNotifPermission()
      : await ensurePushPermission();
    if (!granted) {
      el.checked = false;
      setNotifPref(type, false);
      showToast("알림 권한이 꺼져 있어요. 휴대폰 설정 > 앱 > 아빠 스케줄 > 알림에서 켜주세요.");
      return;
    }
    setNotifPref(type, true);
    if (type === "events") scheduleLocalReminders();
    else registerPushNotifications();
    showToast(type === "events" ? "이벤트 알림을 켰어요 🔔" : "채팅 알림을 켰어요 💬");
  } else {
    setNotifPref(type, false);
    if (type === "events") cancelAllLocalReminders();
    else removeFcmToken();
    showToast("알림을 껐어요");
  }
}

function updateUI() {
  updateHome();
  renderCalendar();
  renderMonthEventList();
  renderPeriodList();
  renderEventList();
}

function updateHome() {
  const today = normalizeDate(new Date());
  const tomorrow = addDays(today, 1);
  const isWork = isWorkDay(today);
  const isWorkTomorrow = isWorkDay(tomorrow);
  const KO_DAYS = ["일","월","화","수","목","금","토"];
  document.getElementById("home-date").textContent =
    `${today.getMonth()+1}월 ${today.getDate()}일 (${KO_DAYS[today.getDay()]})`;
  const card = document.getElementById("status-card");
  card.className = "status-card " + (isWork ? "work" : "rest");
  document.getElementById("status-icon").textContent = isWork ? "💼" : "🏠";
  document.getElementById("status-label").textContent = isWork ? "근무일" : "휴무일";
  document.getElementById("status-desc").textContent = isWork ? "오늘은 근무하는 날입니다" : "오늘은 쉬는 날입니다";
  const badge = document.getElementById("tomorrow-badge");
  badge.className = "tomorrow-badge " + (isWorkTomorrow ? "work" : "rest");
  badge.textContent = isWorkTomorrow ? "근무 💼" : "휴무 🏠";
  // (오늘의 메모 카드 제거됨 — 메모는 이제 이벤트 세부사항)
  renderWeekPreview();
  renderNextEvent();
  renderActivityFeed();
}

function renderWeekPreview() {
  const grid = document.getElementById("week-grid");
  const today = normalizeDate(new Date());
  const todayKey = dateKey(today);
  const weekStart = addDays(today, -today.getDay());
  let html = "";
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    const key = dateKey(d);
    const work = isWorkDay(d);
    const isToday = key === todayKey;
    const labelCls = i === 0 ? "sun" : i === 6 ? "sat" : "";
    const dayEvs = events.filter(ev => eventMatchesDate(ev, d));
    const evBlock = dayEvs.length
      ? `<span class="week-day-event">${dayEvs[0].emoji}</span>
         <span class="week-day-event-name">${escapeHtml(dayEvs[0].title)}</span>`
      : "";
    html += `<div class="week-day ${work ? "work" : "rest"}${isToday ? " today" : ""}" onclick="openBottomSheetFromKey('${key}')">
      <span class="week-day-label ${labelCls}">${KO_WEEKDAYS[i]}</span>
      <span class="week-day-num">${d.getDate()}</span>
      <span class="week-day-icon">${work ? "💼" : "🏠"}</span>
      ${evBlock}
    </div>`;
  }
  grid.innerHTML = html;
}

function openBottomSheetFromKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  openBottomSheet(new Date(y, m - 1, d));
}

function renderNextEvent() {
  const card = document.getElementById("next-event-card");
  const upcoming = getUpcomingEvents(365);
  if (!upcoming.length) { card.style.display = "none"; return; }
  const next = upcoming[0];
  card.style.display = "";
  document.getElementById("next-event-emoji").textContent = next.emoji;
  document.getElementById("next-event-title").textContent = next.title;
  const KO_DAYS = ["일","월","화","수","목","금","토"];
  const nd = next.nextDate;
  document.getElementById("next-event-date").textContent =
    `${nd.getMonth()+1}월 ${nd.getDate()}일 (${KO_DAYS[nd.getDay()]})`;
  document.getElementById("next-event-dday").textContent =
    next.days === 0 ? "D-DAY" : `D-${next.days}`;
}

function renderActivityFeed() {
  const section = document.getElementById("activity-section");
  const list = document.getElementById("activity-list");
  const activities = [];
  for (const p of periods) {
    if (!p.at) continue;
    activities.push({
      icon: p.type === "work" ? "💼" : "🏖️",
      text: `${formatActor(p.by)} ${p.type === "work" ? "연속 근무" : "연속 휴무"} 추가 (${formatDateShort(p.start)}${p.start !== p.end ? "~"+formatDateShort(p.end) : ""})`,
      at: p.at
    });
  }
  for (const ev of events) {
    if (!ev.at) continue;
    activities.push({ icon: ev.emoji, text: `${formatActor(ev.by)} 이벤트 "${ev.title}" 추가`, at: ev.at, evId: ev.id });
  }
  for (const key in notes) {
    const n = notes[key];
    if (typeof n !== "object" || !n.at) continue;
    activities.push({ icon: "📝", text: `${formatActor(n.by)} ${formatDateShort(key)} 메모 작성`, at: n.at });
  }
  for (const ps of personalSchedules) {
    if (!ps.at) continue;
    activities.push({ icon: ps.emoji || "📌", text: `${formatActor(ps.by)} ${formatDateShort(ps.date)} 일정 "${ps.title}" 추가`, at: ps.at });
  }
  if (!activities.length) { section.style.display = "none"; return; }
  activities.sort((a, b) => b.at - a.at);
  section.style.display = "";
  list.innerHTML = activities.slice(0, 6).map(a => {
    const inner = `
    <div class="activity-item${a.evId ? " lp" : ""}">
      <span class="activity-icon">${a.icon}</span>
      <div class="activity-body">
        <div class="activity-text">${a.text}</div>
        <div class="activity-time">${formatTimeAgo(a.at)}</div>
      </div>
    </div>`;
    return a.evId ? swipeRowHtml(a.evId, `edit:${a.evId}`, `edit:${a.evId}`, inner) : inner;
  }).join("");
  wireSwipeRows(list);
}

function getUpcomingEvents(daysAhead) {
  const today = normalizeDate(new Date());
  const result = [];
  for (const ev of events) {
    const nextDate = getNextOccurrence(ev, today);
    const diff = diffDays(nextDate, today);
    if (diff >= 0 && diff <= daysAhead) result.push({ ...ev, days: diff, nextDate });
  }
  return result.sort((a, b) => a.days - b.days);
}

function renderCalendar() {
  const y = calendarMonth.getFullYear();
  const m = calendarMonth.getMonth();
  document.getElementById("cal-title").textContent = `${y}년 ${m+1}월`;
  const grid = document.getElementById("cal-grid");
  grid.innerHTML = "";
  const startDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const todayKey = dateKey(new Date());
  for (let i = 0; i < startDay; i++) {
    const el = document.createElement("div"); el.className = "cal-day empty"; grid.appendChild(el);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(y, m, d);
    const key = dateKey(date);
    const work = isWorkDay(date);
    const el = document.createElement("div");
    el.className = `cal-day ${work ? "work" : "rest"}`;
    if (key === todayKey) el.classList.add("today");
    el.onclick = () => openBottomSheet(date);
    const num = document.createElement("div");
    num.className = "cal-day-num"; num.textContent = d; el.appendChild(num);
    if (weatherData[key]) {
      const w = document.createElement("div");
      w.className = "cal-day-weather"; w.textContent = weatherData[key].emoji; el.appendChild(w);
    }
    const dots = document.createElement("div"); dots.className = "cal-day-dots";
    const noteData = notes[key];
    if (noteData && (typeof noteData === "string" ? noteData : noteData.text)) {
      const dot = document.createElement("span"); dot.className = "dot dot-note"; dots.appendChild(dot);
    }
    if (events.some(ev => eventMatchesDate(ev, date))) {
      const dot = document.createElement("span"); dot.className = "dot dot-event"; dots.appendChild(dot);
    }
    el.appendChild(dots); grid.appendChild(el);
  }
}
function changeMonth(dir) {
  calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + dir, 1);
  renderCalendar();
  renderMonthEventList();
}

function renderMonthEventList() {
  const el = document.getElementById("cal-event-list");
  if (!el) return;
  const y = calendarMonth.getFullYear();
  const m = calendarMonth.getMonth();
  const firstDay = new Date(y, m, 1);
  const KO_DAYS = ["일","월","화","수","목","금","토"];
  const rows = [];
  for (const ev of events) {
    const d = getNextOccurrence(ev, firstDay);
    if (d.getFullYear() === y && d.getMonth() === m) {
      rows.push({ ev, d });
    }
  }
  if (!rows.length) { el.style.display = "none"; return; }
  rows.sort((a, b) => a.d - b.d);
  el.style.display = "";
  el.innerHTML = `<div class="cal-event-list-header">📅 이번 달 이벤트</div>` +
    rows.map(({ ev, d }) => {
      const inner = `<div class="cal-event-row">
        <span class="cal-event-emoji">${ev.emoji}</span>
        <span class="cal-event-date">${d.getMonth()+1}월 ${d.getDate()}일 (${KO_DAYS[d.getDay()]})</span>
        <span class="cal-event-title">${escapeHtml(ev.title)}</span>
      </div>`;
      return swipeRowHtml(ev.id, `sheet:${d.getFullYear()},${d.getMonth()},${d.getDate()}`, `edit:${ev.id}`, inner);
    }).join("");
  wireSwipeRows(el);
}

function openBottomSheet(date) {
  bottomSheetDate = normalizeDate(date);
  const key = dateKey(date);
  const work = isWorkDay(date);
  const KO_DAYS = ["일","월","화","수","목","금","토"];
  const d = normalizeDate(date);
  document.getElementById("bs-date-text").textContent = `${d.getMonth()+1}월 ${d.getDate()}일 (${KO_DAYS[d.getDay()]})`;
  const badge = document.getElementById("bs-status-badge");
  badge.className = "bs-status-badge " + (work ? "work" : "rest");
  badge.textContent = work ? "근무일 💼" : "휴무일 🏠";
  document.getElementById("bs-weather-badge").textContent = weatherData[key] ? weatherData[key].emoji : "";
  quickAddEmoji = "📅";
  renderBsEvents();
  document.getElementById("bs-overlay").classList.add("show");
  document.getElementById("bottom-sheet").classList.add("show");
}

// 바텀시트 이벤트 목록 + 인라인 추가 렌더
let quickAddEmoji = "📅";
let bsRecurrence = "once";
let bsWeekday = 0;
function renderBsEvents() {
  const sec = document.getElementById("bs-events-section");
  if (!sec || !bottomSheetDate) return;
  const dayEvents = events.filter(ev => eventMatchesDate(ev, bottomSheetDate));
  const listHtml = dayEvents.length
    ? dayEvents.map(ev => {
        const inner = `
        <div class="bs-event-item">
          <span class="bs-event-emoji">${ev.emoji || "📅"}</span>
          <div class="bs-event-body">
            <div class="bs-event-title">${escapeHtml(ev.title)}${ev.time ? ` <span class="bs-event-time">${ev.time}</span>` : ""}</div>
            ${ev.memo ? `<div class="bs-event-memo">${escapeHtml(ev.memo)}</div>` : ""}
          </div>
        </div>`;
        return swipeRowHtml(ev.id, `sheetEdit:${ev.id}`, `sheetEdit:${ev.id}`, inner);
      }).join("")
    : `<div class="bs-empty-hint">등록된 이벤트가 없어요</div>`;
  const dKey = dateKey(bottomSheetDate);
  bsRecurrence = "once";
  bsWeekday = bottomSheetDate.getDay();
  const wd = ["일","월","화","수","목","금","토"];
  sec.innerHTML =
    `<div class="bs-section-title">📅 이벤트</div>
     <div id="bs-event-list">${listHtml}</div>
     <div class="bs-quick-add">
       <button type="button" class="bs-qa-emoji" onclick="toggleQuickEmoji()">${quickAddEmoji}</button>
       <input type="text" id="bs-qa-input" class="bs-qa-input" placeholder="이벤트 추가…"
         onkeydown="if(event.key==='Enter'){event.preventDefault();quickAddEvent();}" />
       <button type="button" class="bs-qa-btn" onclick="quickAddEvent()">추가</button>
     </div>
     <div id="bs-qa-emoji-picker" class="emoji-picker" style="display:none"></div>
     <button type="button" class="bs-qa-more" onclick="toggleQuickDetail()">상세 옵션 ▾</button>
     <div id="bs-qa-detail" class="bs-qa-detail" style="display:none">
       <label class="bs-qa-label">반복 유형</label>
       <div class="recurrence-tabs">
         <button type="button" id="bsrec-once" class="rec-tab active" onclick="setBsRecurrence('once')">한 번만</button>
         <button type="button" id="bsrec-yearly" class="rec-tab" onclick="setBsRecurrence('yearly')">매년</button>
         <button type="button" id="bsrec-weekly" class="rec-tab" onclick="setBsRecurrence('weekly')">매주</button>
         <button type="button" id="bsrec-monthly" class="rec-tab" onclick="setBsRecurrence('monthly')">매월</button>
       </div>
       <div id="bsrec-date-row">
         <label class="bs-qa-label" id="bsrec-date-label">날짜</label>
         <input type="date" id="bs-qa-date" class="form-input" value="${dKey}" />
       </div>
       <div id="bsrec-weekly-row" style="display:none">
         <label class="bs-qa-label">요일</label>
         <div class="weekday-picker">
           ${wd.map((w,i)=>`<button type="button" class="weekday-btn ${i===bsWeekday?"active":""}" onclick="setBsWeekday(${i})">${w}</button>`).join("")}
         </div>
       </div>
       <div id="bsrec-monthly-row" style="display:none">
         <label class="bs-qa-label">매월 며칠</label>
         <input type="number" id="bs-qa-monthday" class="form-input" min="1" max="31" value="${bottomSheetDate.getDate()}" />
       </div>
       <label class="bs-qa-label">시간 (선택)</label>
       <input type="time" id="bs-qa-time" class="form-input" />
       <label class="bs-qa-label">세부 메모 (선택)</label>
       <textarea id="bs-qa-memo" class="form-input event-memo-input" placeholder="장소, 준비물, 메모 등"></textarea>
     </div>`;
  wireSwipeRows(document.getElementById("bs-event-list"));
}
function toggleQuickEmoji() {
  const p = document.getElementById("bs-qa-emoji-picker");
  if (!p) return;
  if (p.style.display === "none") {
    p.innerHTML = emojiPickerHTML(quickAddEmoji, "selectQuickEmoji");
    p.style.display = "";
  } else { p.style.display = "none"; }
}
function selectQuickEmoji(e) {
  quickAddEmoji = e;
  const btn = document.querySelector(".bs-qa-emoji");
  if (btn) btn.textContent = e;
  const p = document.getElementById("bs-qa-emoji-picker");
  if (p) p.style.display = "none";
}
function toggleQuickDetail() {
  const d = document.getElementById("bs-qa-detail");
  const btn = document.querySelector(".bs-qa-more");
  if (!d) return;
  const open = d.style.display === "none";
  d.style.display = open ? "" : "none";
  if (btn) btn.textContent = open ? "상세 옵션 ▲" : "상세 옵션 ▾";
}
function setBsRecurrence(r) {
  bsRecurrence = r;
  ["once","yearly","weekly","monthly"].forEach(k => {
    const b = document.getElementById("bsrec-" + k);
    if (b) b.classList.toggle("active", k === r);
  });
  const dateRow = document.getElementById("bsrec-date-row");
  const weeklyRow = document.getElementById("bsrec-weekly-row");
  const monthlyRow = document.getElementById("bsrec-monthly-row");
  if (dateRow) dateRow.style.display = (r === "once" || r === "yearly") ? "" : "none";
  if (weeklyRow) weeklyRow.style.display = r === "weekly" ? "" : "none";
  if (monthlyRow) monthlyRow.style.display = r === "monthly" ? "" : "none";
  const dateLabel = document.getElementById("bsrec-date-label");
  if (dateLabel) dateLabel.textContent = r === "yearly" ? "날짜 (매년 반복)" : "날짜";
}
function setBsWeekday(i) {
  bsWeekday = i;
  document.querySelectorAll("#bsrec-weekly-row .weekday-btn").forEach((b, idx) => b.classList.toggle("active", idx === i));
}
async function quickAddEvent() {
  if (!bottomSheetDate) return;
  const input = document.getElementById("bs-qa-input");
  const title = input.value.trim();
  if (!title) { input.focus(); return; }
  const ev = { id: Date.now().toString(), title, emoji: quickAddEmoji, recurrence: bsRecurrence, ...myMeta() };
  if (bsRecurrence === "once") {
    ev.date = document.getElementById("bs-qa-date").value || dateKey(bottomSheetDate);
  } else if (bsRecurrence === "yearly") {
    const dv = document.getElementById("bs-qa-date").value || dateKey(bottomSheetDate);
    const [, ms, ds] = dv.split("-"); ev.month = Number(ms); ev.day = Number(ds);
  } else if (bsRecurrence === "weekly") {
    ev.weekday = bsWeekday;
  } else if (bsRecurrence === "monthly") {
    const dv = Number(document.getElementById("bs-qa-monthday").value) || bottomSheetDate.getDate();
    ev.monthDay = Math.min(31, Math.max(1, dv));
  }
  ev.time = document.getElementById("bs-qa-time").value || null;
  ev.memo = (document.getElementById("bs-qa-memo").value || "").trim();
  events.push(ev);
  input.value = "";
  quickAddEmoji = "📅";
  saveToCache();
  renderBsEvents();
  renderCalendar(); renderEventList(); updateHome();
  await saveToFirestore({ events });
  scheduleLocalReminders();
  showToast("이벤트가 추가됐어요!");
}
function editEventFromSheet(id) {
  closeBottomSheet();
  openEventModal(id);
}

// ===== 이벤트 행: 꾹눌러 수정 + 스와이프 삭제 =====
// swipeRowHtml(evId, tapAction, editAction, innerHtml)
//   action 형식: "edit:<id>" | "sheetEdit:<id>" | "sheet:<y>,<m>,<d>"
//   - 짧게 탭   → tapAction 실행
//   - 0.5초 꾹  → editAction 실행 (수정창)
//   - 왼쪽 스와이프 → 삭제 버튼 노출 / 더 세게 밀면 바로 삭제
function swipeRowHtml(evId, tap, edit, inner) {
  return `<div class="swipe-row">`
    + `<button class="swipe-del-btn" data-del="${evId}">삭제</button>`
    + `<div class="swipe-content" data-tap="${tap}" data-edit="${edit}" data-ev="${evId}">${inner}</div>`
    + `</div>`;
}

function runEventAction(action) {
  if (!action) return;
  const i = action.indexOf(":");
  const kind = action.slice(0, i), arg = action.slice(i + 1);
  if (kind === "edit") openEventModal(arg);
  else if (kind === "sheetEdit") editEventFromSheet(arg);
  else if (kind === "sheet") {
    const [y, m, d] = arg.split(",").map(Number);
    openBottomSheet(new Date(y, m, d));
  }
}

async function confirmDeleteEvent(id) {
  closeOpenSwipe();
  if (!id) return;
  if (!confirm("이 이벤트를 삭제할까요?")) return;
  await deleteEvent(id);
}

const SWIPE_OPEN = -76;     // 열림 위치(px) — 삭제 버튼 너비와 동일
const SWIPE_SNAP = -32;     // 이만큼 넘게 밀면 열린 채 유지
const SWIPE_DELETE = -150;  // 이만큼 넘게 밀면 바로 삭제
let _openSwipe = null;
// 행 상태 적용: "closed" | "open" | "swiping" (닫힘일 때는 삭제 버튼을 CSS로 숨겨 빨강 새는 것 방지)
function setSwipeState(el, state) {
  const row = el.parentElement;
  if (state === "open") {
    el.style.transform = `translateX(${SWIPE_OPEN}px)`;
    el.classList.add("open");
    if (row) { row.classList.add("open"); row.classList.remove("swiping"); }
    _openSwipe = el;
  } else if (state === "swiping") {
    if (row) row.classList.add("swiping");
  } else { // closed
    el.style.transform = "";
    el.classList.remove("open");
    if (row) row.classList.remove("open", "swiping");
    if (_openSwipe === el) _openSwipe = null;
  }
}
function closeOpenSwipe(except) {
  if (_openSwipe && _openSwipe !== except) setSwipeState(_openSwipe, "closed");
}

function wireSwipeRows(root) {
  if (!root) return;
  root.querySelectorAll(".swipe-content").forEach(el => {
    if (el._swipeWired) return;
    el._swipeWired = true;
    let sx = 0, sy = 0, st = 0, base = 0, dx = 0, dragging = false, horiz = false, lpFired = false, gaveUp = false, lpTimer = null;

    el.addEventListener("pointerdown", e => {
      if (e.button != null && e.button > 0) return; // 좌클릭/터치만
      sx = e.clientX; sy = e.clientY; st = Date.now();
      base = el.classList.contains("open") ? SWIPE_OPEN : 0;
      dx = base; dragging = false; horiz = false; lpFired = false; gaveUp = false;
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      clearTimeout(lpTimer);
      lpTimer = setTimeout(() => {
        if (!horiz && !gaveUp) { lpFired = true; closeOpenSwipe(); runEventAction(el.dataset.edit); }
      }, 500);
    });

    el.addEventListener("pointermove", e => {
      if (lpFired || gaveUp) return;
      const ddx = e.clientX - sx, ddy = e.clientY - sy;
      if (!dragging) {
        if (Math.abs(ddx) > 8 && Math.abs(ddx) > Math.abs(ddy)) {
          dragging = true; horiz = true; clearTimeout(lpTimer); closeOpenSwipe(el);
          setSwipeState(el, "swiping"); // 삭제 버튼 노출 시작
        } else if (Math.abs(ddy) > 10) {
          gaveUp = true; clearTimeout(lpTimer); return; // 세로 스크롤 의도 → 제스처 포기 (탭 발동 안 함)
        } else { return; }
      }
      e.preventDefault();
      dx = Math.max(SWIPE_DELETE - 30, Math.min(0, base + ddx)); // 왼쪽만
      el.style.transform = `translateX(${dx}px)`;
    });

    const finish = (e, allowTap) => {
      clearTimeout(lpTimer);
      try { el.releasePointerCapture(e.pointerId); } catch (_) {}
      if (lpFired) return;
      if (dragging) {
        if (dx <= SWIPE_DELETE) {              // 더 세게 → 바로 삭제
          setSwipeState(el, "closed");
          confirmDeleteEvent(el.dataset.ev);
        } else if (dx <= SWIPE_SNAP) {          // 열린 채 유지
          setSwipeState(el, "open");
        } else {                                // 닫기
          setSwipeState(el, "closed");
        }
      } else if (allowTap && !gaveUp && Date.now() - st < 500) {  // 탭
        if (el.classList.contains("open")) setSwipeState(el, "closed");
        else runEventAction(el.dataset.tap);
      }
    };
    el.addEventListener("pointerup", e => finish(e, true));
    el.addEventListener("pointercancel", e => finish(e, false));
  });

  root.querySelectorAll(".swipe-del-btn").forEach(btn => {
    if (btn._swipeWired) return;
    btn._swipeWired = true;
    btn.addEventListener("click", e => { e.stopPropagation(); confirmDeleteEvent(btn.dataset.del); });
  });
}

// 바깥을 탭하면 열린 스와이프 닫기
document.addEventListener("pointerdown", e => {
  if (_openSwipe && !(e.target.closest && e.target.closest(".swipe-row"))) closeOpenSwipe();
}, true);
function closeBottomSheet() {
  document.getElementById("bs-overlay").classList.remove("show");
  document.getElementById("bottom-sheet").classList.remove("show");
  bottomSheetDate = null;
  if (chatUnsub) { chatUnsub(); chatUnsub = null; }
}

async function saveMemoFromSheet() {
  if (!bottomSheetDate) return;
  const key = dateKey(bottomSheetDate);
  const text = document.getElementById("bs-memo-input").value.trim();
  const val = text ? { text, ...myMeta() } : null;
  const update = {};
  update[`notes.${key}`] = val || firebase.firestore.FieldValue.delete();
  if (val) notes[key] = val; else delete notes[key];
  saveToCache(); updateUI(); closeBottomSheet();
  await saveToFirestore(update);
  showToast("메모가 저장됐어요!");
}

async function toggleSelectedDaySchedule() {
  if (!bottomSheetDate) return;
  const key = dateKey(bottomSheetDate);
  overrides[key] = !isWorkDay(bottomSheetDate);
  const update = {}; update[`overrides.${key}`] = overrides[key];
  saveToCache(); openBottomSheet(bottomSheetDate); renderCalendar(); updateHome();
  await saveToFirestore(update);
}

let psModalDate = null;

function renderBsPersonalSchedules(key) {
  const list = document.getElementById("bs-personal-list");
  if (!list) return;
  const items = personalSchedules.filter(ps => ps.date === key);
  if (!items.length) {
    list.innerHTML = '<div class="bs-empty-hint">등록된 개인 일정이 없어요</div>';
    return;
  }
  list.innerHTML = items.map(ps => `
    <div class="bs-personal-item">
      <span class="bs-personal-emoji">${ps.emoji || "📌"}</span>
      <div class="bs-personal-body">
        <div class="bs-personal-title">${escapeHtml(ps.title)}</div>
        ${ps.by ? `<div class="bs-personal-by">${ps.by}</div>` : ""}
      </div>
      ${ps.byId === getDeviceId() ? `<button class="bs-personal-delete" onclick="deletePersonalSchedule('${ps.id}')">✕</button>` : ""}
    </div>`).join("");
}

function openPsModal() {
  if (!bottomSheetDate) return;
  psModalDate = bottomSheetDate;
  document.getElementById("ps-title-input").value = "";
  selectedPersonalEmoji = "📌";
  buildPersonalEmojiPicker();
  document.getElementById("ps-modal").style.display = "";
}
function closePsModal() { document.getElementById("ps-modal").style.display = "none"; }

function buildPersonalEmojiPicker() {
  const picker = document.getElementById("ps-emoji-picker");
  if (!picker) return;
  picker.innerHTML = emojiPickerHTML(selectedPersonalEmoji, "selectPersonalEmoji");
}
function selectPersonalEmoji(e) { selectedPersonalEmoji = e; buildPersonalEmojiPicker(); }

async function savePersonalSchedule() {
  const title = document.getElementById("ps-title-input").value.trim();
  if (!title) { showToast("이름을 입력해주세요"); return; }
  const key = dateKey(psModalDate);
  const ps = { id: Date.now().toString(), date: key, title, emoji: selectedPersonalEmoji, ...myMeta() };
  personalSchedules.push(ps);
  saveToCache(); renderCalendar(); closePsModal();
  await saveToFirestore({ personalSchedules });
  showToast("개인 일정이 등록됐어요!");
  if (bottomSheetDate && dateKey(bottomSheetDate) === key) renderBsPersonalSchedules(key);
}

async function deletePersonalSchedule(id) {
  personalSchedules = personalSchedules.filter(p => p.id !== id);
  saveToCache(); renderCalendar();
  await saveToFirestore({ personalSchedules });
  showToast("삭제됐어요!");
  if (bottomSheetDate) renderBsPersonalSchedules(dateKey(bottomSheetDate));
}

async function fetchWeather() {
  const wc = JSON.parse(localStorage.getItem("v2_weather_cache") || "null");
  if (wc && Date.now() - wc.fetchedAt < 3600000) { weatherData = wc.data || {}; renderCalendar(); return; }
  let lat = 37.5665, lon = 126.9780;
  try {
    const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 }));
    lat = pos.coords.latitude.toFixed(4); lon = pos.coords.longitude.toFixed(4);
  } catch(e) {}
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max&timezone=Asia%2FSeoul&forecast_days=14`;
    const res = await fetch(url); const json = await res.json();
    const nd = {};
    (json.daily?.time || []).forEach((ds, i) => {
      nd[ds] = { code: json.daily.weathercode[i], emoji: weatherCodeToEmoji(json.daily.weathercode[i]), maxTemp: Math.round(json.daily.temperature_2m_max[i]) };
    });
    weatherData = nd;
    localStorage.setItem("v2_weather_cache", JSON.stringify({ fetchedAt: Date.now(), data: nd }));
    renderCalendar();
  } catch(e) { console.warn("Weather fetch failed", e); }
}

function weatherCodeToEmoji(code) {
  if (code === 0) return "☀️";
  if (code === 1) return "🌤️";
  if (code === 2) return "⛅";
  if (code === 3) return "🌥️";
  if (code <= 48) return "🌫️";
  if (code <= 57) return "🌦️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌧️";
  if (code <= 86) return "❄️";
  return "⛈️";
}

function subscribeChat(key) {
  if (chatUnsub) { chatUnsub(); chatUnsub = null; }
  if (!roomDoc) return;
  chatUnsub = roomDoc.collection("chats").doc(key).onSnapshot(snap => {
    renderChatMessages(snap.exists ? (snap.data().messages || []) : []);
  });
}

async function sendChatMessage() {
  if (!bottomSheetDate) return;
  const input = document.getElementById("bs-chat-input");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  const key = dateKey(bottomSheetDate);
  const msg = { id: Date.now().toString(), text, ...myMeta() };
  try {
    await roomDoc.collection("chats").doc(key).set(
      { messages: firebase.firestore.FieldValue.arrayUnion(msg) },
      { merge: true }
    );
  } catch(e) { showToast("메시지 전송 실패"); }
}

function renderChatMessages(msgs) {
  const list = document.getElementById("bs-chat-list");
  if (!list) return;
  const myId = getDeviceId();
  if (!msgs.length) {
    list.innerHTML = '<div class="bs-empty-hint">대화를 시작해보세요! 💬</div>';
    return;
  }
  list.innerHTML = msgs.slice(-30).map(m => {
    const isMe = m.byId === myId;
    return `<div class="chat-msg ${isMe ? "chat-msg-me" : "chat-msg-other"}">
      ${!isMe ? `<div class="chat-msg-name">${escapeHtml(m.by || "?")}</div>` : ""}
      <div class="chat-bubble">${escapeHtml(m.text)}</div>
      <div class="chat-msg-time">${formatTimeAgo(m.at)}</div>
    </div>`;
  }).join("");
  list.scrollTop = list.scrollHeight;
}

function escapeHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function setRecurrence(type) {
  selectedRecurrence = type;
  ["once","yearly","weekly","monthly"].forEach(t => {
    document.getElementById("rec-" + t).classList.toggle("active", t === type);
    document.getElementById("rec-" + t + "-opts").style.display = t === type ? "" : "none";
  });
}
function setWeekday(wd) {
  selectedWeekday = wd;
  document.querySelectorAll(".weekday-btn").forEach((btn, i) => btn.classList.toggle("active", i === wd));
}

function openEventModalForDate() {
  const date = bottomSheetDate;
  closeBottomSheet();
  openEventModal();
  if (date) {
    setRecurrence("once");
    document.getElementById("event-once-date-input").value = dateKey(date);
  }
}

function openAdjustModal() { document.getElementById("adjust-modal").style.display = ""; }
function closeAdjustModal() { document.getElementById("adjust-modal").style.display = "none"; }
async function adjustSchedule(isWorkToday) {
  const today = normalizeDate(new Date());
  baseDate = isWorkToday ? today : addDays(today, 1);
  overrides = {};
  const update = { baseDate: baseDate.getTime(), overrides: {} };
  saveToCache(); updateUI(); closeAdjustModal();
  await saveToFirestore(update);
  showToast("일정이 재조정됐어요!");
}

function openPeriodModal() {
  rangeStart = null; rangeEnd = null; rangeMonth = new Date();
  renderRangeCalendar(); updateRangeDisplay();
  document.getElementById("period-modal").style.display = "";
}
function closePeriodModal() {
  document.getElementById("period-modal").style.display = "none";
  rangeStart = null; rangeEnd = null;
}
function renderRangeCalendar() {
  const y = rangeMonth.getFullYear(); const m = rangeMonth.getMonth();
  document.getElementById("range-cal-title").textContent = `${y}년 ${m+1}월`;
  const grid = document.getElementById("range-cal-grid");
  grid.innerHTML = "";
  const startDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m+1, 0).getDate();
  for (let i = 0; i < startDay; i++) {
    const el = document.createElement("div"); el.className = "range-day empty"; grid.appendChild(el);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(y, m, d); const key = dateKey(date);
    const el = document.createElement("div"); el.className = "range-day"; el.textContent = d;
    if (rangeStart && rangeEnd) {
      const sk = dateKey(rangeStart); const ek = dateKey(rangeEnd);
      if (key === sk) el.classList.add("range-start");
      else if (key === ek) el.classList.add("range-end");
      else if (key > sk && key < ek) el.classList.add("range-mid");
    } else if (rangeStart && dateKey(rangeStart) === key) {
      el.classList.add("range-start", "range-end");
    }
    el.onclick = () => onRangeDayClick(date); grid.appendChild(el);
  }
}
function onRangeDayClick(date) {
  if (!rangeStart || (rangeStart && rangeEnd)) { rangeStart = normalizeDate(date); rangeEnd = null; }
  else { if (date < rangeStart) { rangeStart = normalizeDate(date); rangeEnd = null; } else rangeEnd = normalizeDate(date); }
  renderRangeCalendar(); updateRangeDisplay();
}
function updateRangeDisplay() {
  const el = document.getElementById("range-selected-display");
  if (!rangeStart) { el.textContent = "날짜를 선택하세요"; return; }
  const fmt = d => `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`;
  if (!rangeEnd || dateKey(rangeStart) === dateKey(rangeEnd)) { el.textContent = fmt(rangeStart); }
  else { el.textContent = `${fmt(rangeStart)} – ${fmt(rangeEnd)}  (${diffDays(rangeEnd, rangeStart)+1}일)`; }
}
function rangePrevMonth() { rangeMonth = new Date(rangeMonth.getFullYear(), rangeMonth.getMonth()-1, 1); renderRangeCalendar(); }
function rangeNextMonth() { rangeMonth = new Date(rangeMonth.getFullYear(), rangeMonth.getMonth()+1, 1); renderRangeCalendar(); }
async function savePeriod(type) {
  if (!rangeStart) { showToast("시작일을 선택하세요"); return; }
  const start = dateKey(rangeStart); const end = dateKey(rangeEnd || rangeStart);
  const period = { id: Date.now().toString(), start, end, type, ...myMeta() };
  periods.push(period);
  saveToCache(); renderCalendar(); renderPeriodList(); closePeriodModal();
  await saveToFirestore({ periods });
  showToast("기간 일정이 설정됐어요!");
}
async function deletePeriod(id) {
  periods = periods.filter(p => p.id !== id);
  saveToCache(); renderCalendar(); renderPeriodList();
  await saveToFirestore({ periods });
  showToast("삭제됐어요!");
}
function renderPeriodList() {
  const el = document.getElementById("period-list");
  if (!periods.length) { el.innerHTML = '<div class="card-empty">등록된 기간 일정이 없습니다.</div>'; return; }
  el.innerHTML = [...periods].sort((a,b) => a.start.localeCompare(b.start)).map(p => {
    const icon = p.type === "work" ? "💼" : "🏖️";
    const label = p.type === "work" ? "연속 근무" : "연속 휴무";
    const range = p.start === p.end ? formatDateShort(p.start) : `${formatDateShort(p.start)} – ${formatDateShort(p.end)}`;
    const byStr = p.by ? formatBy(p.by, p.at) : "";
    return `<div class="card-item"><span class="card-item-icon">${icon}</span><div class="card-item-body"><span class="card-item-title">${label}</span><span class="card-item-sub">${range}</span>${byStr ? `<span class="card-item-by">${byStr}</span>` : ""}</div><button class="card-item-delete" onclick="deletePeriod('${p.id}')">✕</button></div>`;
  }).join("");
}

function openEventModal(evId = null) {
  editingEventId = evId;
  document.getElementById("event-modal-title").textContent = evId ? "이벤트 수정" : "이벤트 추가";
  document.getElementById("event-modal-save-btn").textContent = evId ? "수정" : "저장";
  document.getElementById("event-delete-btn").style.display = evId ? "" : "none";

  if (evId) {
    const ev = events.find(e => e.id === evId);
    if (ev) {
      document.getElementById("event-title-input").value = ev.title;
      selectedEventEmoji = ev.emoji || "🎂";
      selectedRecurrence = ev.recurrence || "yearly";
      selectedWeekday = ev.weekday || 0;
      setRecurrence(selectedRecurrence);
      document.querySelectorAll(".weekday-btn").forEach((btn, i) => btn.classList.toggle("active", i === selectedWeekday));
      if (selectedRecurrence === "once") {
        document.getElementById("event-once-date-input").value = ev.date || "";
      } else if (selectedRecurrence === "yearly") {
        const pad = n => String(n).padStart(2, "0");
        document.getElementById("event-date-input").value = ev.month ? `2000-${pad(ev.month)}-${pad(ev.day)}` : "";
      } else if (selectedRecurrence === "monthly") {
        document.getElementById("event-monthday-input").value = ev.monthDay || "";
      }
      document.getElementById("event-time-input").value = ev.time || "";
      document.getElementById("event-memo-input").value = ev.memo || "";
    }
  } else {
    document.getElementById("event-title-input").value = "";
    document.getElementById("event-date-input").value = "";
    document.getElementById("event-once-date-input").value = "";
    document.getElementById("event-monthday-input").value = "";
    document.getElementById("event-time-input").value = "";
    document.getElementById("event-memo-input").value = "";
    selectedEventEmoji = "🎂"; selectedRecurrence = "yearly"; selectedWeekday = 0;
    setRecurrence("yearly");
    document.querySelectorAll(".weekday-btn").forEach((btn, i) => btn.classList.toggle("active", i === 0));
  }
  buildEmojiPicker();
  document.getElementById("event-modal").style.display = "";
}
function closeEventModal() { editingEventId = null; document.getElementById("event-modal").style.display = "none"; }
function buildEmojiPicker() {
  const picker = document.getElementById("emoji-picker"); if (!picker) return;
  picker.innerHTML = emojiPickerHTML(selectedEventEmoji, "selectEmoji");
  const customInput = document.getElementById("emoji-custom-input");
  if (customInput) customInput.value = selectedEventEmoji;
}
function selectEmoji(e) { selectedEventEmoji = e; buildEmojiPicker(); }
// 입력값에서 첫 번째 이모지(그림문자)만 추출. 글자/숫자는 무시.
function firstEmoji(str) {
  const test = /\p{Extended_Pictographic}/u;
  try {
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      for (const { segment } of new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(str)) {
        if (test.test(segment)) return segment;
      }
      return "";
    }
  } catch(e) {}
  for (const ch of str) if (test.test(ch)) return ch;
  return "";
}
function onCustomEmojiInput(val) {
  const e = firstEmoji(val);
  if (e) selectedEventEmoji = e;
  // 이모지가 아니면 selectedEventEmoji 유지 → buildEmojiPicker가 입력란을 되돌려 글자 입력 차단
  buildEmojiPicker();
}

async function saveEvent() {
  const title = document.getElementById("event-title-input").value.trim();
  if (!title) { showToast("이름을 입력해주세요"); return; }
  const isEdit = !!editingEventId;
  const original = isEdit ? events.find(e => e.id === editingEventId) : null;
  let ev = {
    id: isEdit ? editingEventId : Date.now().toString(),
    title,
    emoji: selectedEventEmoji,
    recurrence: selectedRecurrence,
    ...(original ? { by: original.by, at: original.at } : myMeta())
  };
  if (selectedRecurrence === "once") {
    const dateVal = document.getElementById("event-once-date-input").value;
    if (!dateVal) { showToast("날짜를 입력해주세요"); return; }
    ev.date = dateVal;
  } else if (selectedRecurrence === "yearly") {
    const dateVal = document.getElementById("event-date-input").value;
    if (!dateVal) { showToast("날짜를 입력해주세요"); return; }
    const [, ms, ds] = dateVal.split("-");
    ev.month = Number(ms); ev.day = Number(ds);
  } else if (selectedRecurrence === "weekly") {
    ev.weekday = selectedWeekday;
  } else if (selectedRecurrence === "monthly") {
    const dayVal = Number(document.getElementById("event-monthday-input").value);
    if (!dayVal || dayVal < 1 || dayVal > 31) { showToast("날짜를 1~31 사이로 입력해주세요"); return; }
    ev.monthDay = dayVal;
  }
  ev.time = document.getElementById("event-time-input").value || null;
  ev.memo = document.getElementById("event-memo-input").value.trim();
  if (isEdit) {
    events = events.map(e => e.id === editingEventId ? ev : e);
  } else {
    events.push(ev);
  }
  saveToCache(); renderCalendar(); renderEventList(); updateHome(); closeEventModal();
  await saveToFirestore({ events });
  scheduleLocalReminders();
  showToast(isEdit ? "이벤트가 수정됐어요!" : "이벤트가 등록됐어요!");
}
async function deleteEvent(id) {
  events = events.filter(e => e.id !== id);
  saveToCache(); renderCalendar(); renderEventList(); updateHome();
  await saveToFirestore({ events });
  scheduleLocalReminders();
  showToast("삭제됐어요!");
}
function deleteEventFromModal() {
  if (!editingEventId) return;
  if (!confirm("이 이벤트를 삭제할까요?")) return;
  deleteEvent(editingEventId);
  closeEventModal();
}
function renderEventList() {
  const el = document.getElementById("event-list");
  if (!events.length) { el.innerHTML = '<div class="card-empty">등록된 이벤트가 없습니다.</div>'; return; }
  const today = normalizeDate(new Date());
  el.innerHTML = [...events].sort((a, b) => diffDays(getNextOccurrence(a, today), getNextOccurrence(b, today))).map(ev => {
    const recLabel = ev.recurrence === "once"
      ? (() => { const [y,m,d] = ev.date.split("-"); return `${y}년 ${Number(m)}월 ${Number(d)}일`; })()
      : !ev.recurrence || ev.recurrence === "yearly" ? `매년 ${ev.month}월 ${ev.day}일`
      : ev.recurrence === "weekly" ? `매주 ${KO_WEEKDAYS[ev.weekday]}요일`
      : `매월 ${ev.monthDay}일`;
    const byStr = ev.by ? formatBy(ev.by, ev.at) : "";
    return `<div class="card-item"><span class="card-item-icon">${ev.emoji}</span><div class="card-item-body"><span class="card-item-title">${ev.title}</span><span class="card-item-sub">${recLabel}</span>${byStr ? `<span class="card-item-by">${byStr}</span>` : ""}</div><div class="card-item-actions"><button class="card-item-edit" onclick="openEventModal('${ev.id}')">✏️</button><button class="card-item-delete" onclick="deleteEvent('${ev.id}')">✕</button></div></div>`;
  }).join("");
}

function renderMemberList() {
  const el = document.getElementById("member-list");
  if (!members.length) { el.innerHTML = '<div class="card-empty">불러오는 중...</div>'; return; }
  const myId = getDeviceId();
  el.innerHTML = members.map(m => {
    const isMe = m.deviceId === myId;
    const isHost = localStorage.getItem("v2_is_host") === "true" && isMe;
    return `<div class="member-item">
      <span class="member-avatar">${isHost ? "👑" : "👤"}</span>
      <div class="member-info">
        <span class="member-name">${m.name}</span>
        ${isHost ? `<span class="member-badge">방장</span>` : ""}
        ${isMe ? `<span class="member-badge member-me-badge">내 기기</span>` : ""}
      </div>
      ${isMe ? `<button class="member-edit-btn" onclick="openNickModal()">✏️</button>` : ""}
    </div>`;
  }).join("");
}

function openNickModal() {
  document.getElementById("nick-input").value = getMyName();
  document.getElementById("nick-modal").style.display = "";
}
function closeNickModal() { document.getElementById("nick-modal").style.display = "none"; }

async function saveNickname() {
  const newName = document.getElementById("nick-input").value.trim();
  if (!newName) { showToast("이름을 입력해주세요"); return; }
  localStorage.setItem("v2_user_name", newName);
  const uid = firebase.auth().currentUser?.uid;
  if (uid && db) {
    try { await db.collection("memberships").doc(uid).update({ userName: newName }); } catch(e) {}
    const myId = getDeviceId();
    const updated = members.map(m => m.deviceId === myId ? { ...m, name: newName } : m);
    members = updated;
    await saveToFirestore({ members });
  }
  closeNickModal();
  renderMemberList();
  showToast("닉네임이 변경됐어요!");
}

async function resetSchedule() {
  if (!confirm("모든 데이터를 삭제하고 처음부터 시작할까요?")) return;
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  if (chatUnsub) { chatUnsub(); chatUnsub = null; }
  const uid = firebase.auth().currentUser?.uid;
  if (uid && db) { try { await db.collection("memberships").doc(uid).delete(); } catch(e) {} }
  ["v2_setup_done","v2_room_code","v2_is_host","v2_base_date","v2_overrides",
   "v2_periods","v2_notes","v2_events","v2_members","v2_personal_schedules",
   "v2_notif_asked","v2_notif_sent","v2_weather_cache"].forEach(k => localStorage.removeItem(k));
  baseDate = null; overrides = {}; periods = []; notes = {}; events = []; members = []; personalSchedules = []; weatherData = {};
  db = null; roomDoc = null;
  showView("view-setup");
  document.getElementById("setup-step-name").style.display = "";
  document.getElementById("setup-step-group").style.display = "none";
  document.getElementById("setup-step-code-show").style.display = "none";
  document.getElementById("setup-step-code-join").style.display = "none";
  const savedName = localStorage.getItem("v2_user_name");
  if (savedName) document.getElementById("setup-name-input").value = savedName;
}

function switchTab(tab) {
  document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
  document.getElementById("tab-" + tab).classList.add("active");
  document.querySelector(`.nav-item[data-tab="${tab}"]`).classList.add("active");
}

function formatDateShort(key) { const [, m, d] = key.split("-"); return `${Number(m)}월 ${Number(d)}일`; }

function hasFinalConsonant(s) {
  if (!s) return false;
  const code = s.charCodeAt(s.length - 1);
  if (code < 0xAC00 || code > 0xD7A3) return false;
  return ((code - 0xAC00) % 28) > 0;
}
function subjectParticle(name) { return hasFinalConsonant(name) ? "이" : "가"; }
function formatActor(by) {
  if (!by) return "누군가";
  return by === getMyName() ? "내가" : `${by}${subjectParticle(by)}`;
}

function formatBy(by, at) {
  const who = by === getMyName() ? "내가" : `${by}${subjectParticle(by)}`;
  if (!at) return `${who} 추가`;
  const today = new Date(); today.setHours(0,0,0,0);
  const atDate = new Date(at); atDate.setHours(0,0,0,0);
  const dayDiff = Math.floor((today - atDate) / 86400000);
  let timeStr;
  if (dayDiff === 0) {
    const d = new Date(at); const h = d.getHours(); const min = String(d.getMinutes()).padStart(2,"0");
    timeStr = `${h < 12 ? "오전" : "오후"} ${h > 12 ? h-12 : h || 12}:${min}`;
  } else if (dayDiff === 1) { timeStr = "어제"; }
  else { const d = new Date(at); timeStr = `${d.getMonth()+1}월 ${d.getDate()}일`; }
  return `${who} 추가 · ${timeStr}`;
}

function formatTimeAgo(at) {
  const today = new Date(); today.setHours(0,0,0,0);
  const atDate = new Date(at); atDate.setHours(0,0,0,0);
  const dayDiff = Math.floor((today - atDate) / 86400000);
  if (dayDiff === 0) {
    const d = new Date(at); const h = d.getHours(); const min = String(d.getMinutes()).padStart(2,"0");
    return `${h < 12 ? "오전" : "오후"} ${h > 12 ? h-12 : h || 12}:${min}`;
  }
  if (dayDiff === 1) return "어제";
  if (dayDiff < 7) return `${dayDiff}일 전`;
  const d = new Date(at); return `${d.getMonth()+1}월 ${d.getDate()}일`;
}

function showToast(msg) {
  const existing = document.querySelector(".toast"); if (existing) existing.remove();
  const el = document.createElement("div"); el.className = "toast"; el.textContent = msg;
  document.body.appendChild(el); setTimeout(() => el.remove(), 2500);
}

if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
