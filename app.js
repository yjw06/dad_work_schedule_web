const firebaseConfig = {
  apiKey: "AIzaSyBmF43ThMFz9tN2A90zmD_K7ybkv2gLMIU",
  authDomain: "dad-work-schedule.firebaseapp.com",
  projectId: "dad-work-schedule",
  storageBucket: "dad-work-schedule.firebasestorage.app",
  messagingSenderId: "452426155762",
  appId: "1:452426155762:web:8fa302a7acde767e4bb26b"
};

const EMOJI_OPTIONS = ["🎂","🎉","🎊","🏥","✈️","🎓","💒","🎁","🎃","🎄","🏖️","💪","🌸","🍽️","🎵","⭐"];
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

// 기기 고유 ID (최초 생성 후 영구 보존)
function getDeviceId() {
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
  if (!db) {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
  }
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
  getDeviceId();
  buildEmojiPicker();
  if (!isSetupDone()) { showView("view-setup"); return; }
  startApp();
});

function showView(id) {
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
  const alreadyMember = (data.members || []).some(m => m.deviceId === deviceId);
  if (!alreadyMember) {
    await db.collection("rooms").doc(input).update({
      members: firebase.firestore.FieldValue.arrayUnion({ deviceId, name, joinedAt: Date.now() })
    });
  }
  localStorage.setItem("v2_room_code", input);
  localStorage.setItem("v2_setup_done", "true");
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
  if (!localStorage.getItem("v2_notif_asked")) {
    setTimeout(() => {
      if ("Notification" in window && Notification.permission === "default") {
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

function updateUI() {
  updateHome();
  renderCalendar();
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
  const todayKey = dateKey(today);
  const noteData = notes[todayKey];
  const memoCard = document.getElementById("home-memo-card");
  if (noteData) {
    const text = typeof noteData === "string" ? noteData : noteData.text;
    const by = typeof noteData === "object" ? noteData.by : null;
    if (text) {
      memoCard.style.display = "";
      document.getElementById("home-memo-text").textContent = text;
      document.getElementById("home-memo-by").textContent = by ? formatBy(by) : "";
    } else { memoCard.style.display = "none"; }
  } else { memoCard.style.display = "none"; }
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
    const hasPS = personalSchedules.some(ps => ps.date === key);
    html += `<div class="week-day ${work ? "work" : "rest"}${isToday ? " today" : ""}" onclick="openBottomSheetFromKey('${key}')">
      <span class="week-day-label ${labelCls}">${KO_WEEKDAYS[i]}</span>
      <span class="week-day-num">${d.getDate()}</span>
      <span class="week-day-icon">${work ? "💼" : "🏠"}${hasPS ? "·" : ""}</span>
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
    activities.push({ icon: ev.emoji, text: `${formatActor(ev.by)} 이벤트 "${ev.title}" 추가`, at: ev.at });
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
  list.innerHTML = activities.slice(0, 6).map(a => `
    <div class="activity-item">
      <span class="activity-icon">${a.icon}</span>
      <div class="activity-body">
        <div class="activity-text">${a.text}</div>
        <div class="activity-time">${formatTimeAgo(a.at)}</div>
      </div>
    </div>`).join("");
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
    if (personalSchedules.some(ps => ps.date === key)) {
      const dot = document.createElement("span"); dot.className = "dot dot-personal"; dots.appendChild(dot);
    }
    el.appendChild(dots); grid.appendChild(el);
  }
}
function changeMonth(dir) {
  calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + dir, 1);
  renderCalendar();
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
  const noteData = notes[key];
  const memoText = noteData ? (typeof noteData === "string" ? noteData : noteData.text) : "";
  const memoBy = noteData && typeof noteData === "object" ? noteData.by : null;
  const memoAt = noteData && typeof noteData === "object" ? noteData.at : null;
  document.getElementById("bs-memo-input").value = memoText || "";
  document.getElementById("bs-memo-by").textContent = memoBy ? formatBy(memoBy, memoAt) : "";
  const dayEvents = events.filter(ev => eventMatchesDate(ev, d));
  const evSection = document.getElementById("bs-events-section");
  if (dayEvents.length) {
    evSection.innerHTML = `<div class="bs-section-title">📌 이벤트</div>` +
      dayEvents.map(ev => `<div class="bs-event-item"><span class="bs-event-emoji">${ev.emoji}</span><span class="bs-event-title">${ev.title}</span></div>`).join("");
  } else { evSection.innerHTML = ""; }
  renderBsPersonalSchedules(key);
  subscribeChat(key);
  document.getElementById("bs-overlay").classList.add("show");
  document.getElementById("bottom-sheet").classList.add("show");
}
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
  picker.innerHTML = EMOJI_OPTIONS.map(e =>
    `<div class="emoji-option ${e === selectedPersonalEmoji ? "selected" : ""}" onclick="selectPersonalEmoji('${e}')">${e}</div>`
  ).join("");
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

function openEventModal() {
  document.getElementById("event-title-input").value = "";
  document.getElementById("event-date-input").value = "";
  document.getElementById("event-once-date-input").value = "";
  document.getElementById("event-monthday-input").value = "";
  selectedEventEmoji = "🎂"; selectedRecurrence = "yearly"; selectedWeekday = 0;
  buildEmojiPicker(); setRecurrence("yearly");
  document.querySelectorAll(".weekday-btn").forEach((btn, i) => btn.classList.toggle("active", i === 0));
  document.getElementById("event-modal").style.display = "";
}
function closeEventModal() { document.getElementById("event-modal").style.display = "none"; }
function buildEmojiPicker() {
  const picker = document.getElementById("emoji-picker"); if (!picker) return;
  picker.innerHTML = EMOJI_OPTIONS.map(e =>
    `<div class="emoji-option ${e === selectedEventEmoji ? "selected" : ""}" onclick="selectEmoji('${e}')">${e}</div>`
  ).join("");
}
function selectEmoji(e) { selectedEventEmoji = e; buildEmojiPicker(); }

async function saveEvent() {
  const title = document.getElementById("event-title-input").value.trim();
  if (!title) { showToast("이름을 입력해주세요"); return; }
  let ev = { id: Date.now().toString(), title, emoji: selectedEventEmoji, recurrence: selectedRecurrence, ...myMeta() };
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
  events.push(ev); saveToCache(); renderCalendar(); renderEventList(); updateHome(); closeEventModal();
  await saveToFirestore({ events });
  showToast("이벤트가 등록됐어요!");
}
async function deleteEvent(id) {
  events = events.filter(e => e.id !== id);
  saveToCache(); renderCalendar(); renderEventList(); updateHome();
  await saveToFirestore({ events });
  showToast("삭제됐어요!");
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
    return `<div class="card-item"><span class="card-item-icon">${ev.emoji}</span><div class="card-item-body"><span class="card-item-title">${ev.title}</span><span class="card-item-sub">${recLabel}</span>${byStr ? `<span class="card-item-by">${byStr}</span>` : ""}</div><button class="card-item-delete" onclick="deleteEvent('${ev.id}')">✕</button></div>`;
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
    </div>`;
  }).join("");
}

async function resetSchedule() {
  if (!confirm("모든 데이터를 삭제하고 처음부터 시작할까요?")) return;
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  if (chatUnsub) { chatUnsub(); chatUnsub = null; }
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
