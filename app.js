// ===== FIREBASE CONFIG =====
const firebaseConfig = {
  apiKey: "AIzaSyBmF43ThMFz9tN2A90zmD_K7ybkv2gLMIU",
  authDomain: "dad-work-schedule.firebaseapp.com",
  projectId: "dad-work-schedule",
  storageBucket: "dad-work-schedule.firebasestorage.app",
  messagingSenderId: "452426155762",
  appId: "1:452426155762:web:8fa302a7acde767e4bb26b",
  measurementId: "G-VQZPFZVXFF"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const FAMILY_ID = "default_family";
const familyDoc = db.collection("families").doc(FAMILY_ID);

// ===== STATE =====
let baseDate = null;
let overrides = {}; // { "2026-04-28": true/false, ... }
let calendarMonth = new Date();
let selectedCalDay = new Date();

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  // Try loading from cache first
  loadFromCache();

  // Listen for real-time updates
  familyDoc.onSnapshot((doc) => {
    if (doc.exists) {
      const data = doc.data();
      baseDate = data.baseDate.toDate();
      overrides = data.overrides || {};
      saveToCache();
      updateUI();
    }
  }, (err) => {
    console.log("Firestore error, using cache:", err);
  });
});

// ===== CACHE (localStorage) =====
function saveToCache() {
  if (baseDate) {
    localStorage.setItem("baseDate", baseDate.getTime().toString());
    localStorage.setItem("overrides", JSON.stringify(overrides));
    localStorage.setItem("setup_complete", "true");
  }
}

function loadFromCache() {
  const cached = localStorage.getItem("baseDate");
  const cachedOverrides = localStorage.getItem("overrides");
  const setupDone = localStorage.getItem("setup_complete");

  if (cached) {
    baseDate = new Date(parseInt(cached));
    overrides = cachedOverrides ? JSON.parse(cachedOverrides) : {};
  }

  if (setupDone === "true" && baseDate) {
    showApp();
    updateUI();
  } else {
    showSetup();
  }
}

// ===== VIEWS =====
function showSetup() {
  document.getElementById("view-setup").style.display = "";
  document.getElementById("view-app").style.display = "none";
}

function showApp() {
  document.getElementById("view-setup").style.display = "none";
  document.getElementById("view-app").style.display = "flex";
}

// ===== SETUP =====
function handleSetup(isWorkToday) {
  const today = normalizeDate(new Date());

  if (isWorkToday) {
    // Today is work day → baseDate = today (diff=0, even)
    baseDate = today;
  } else {
    // Today is rest day → baseDate = yesterday (diff=1, odd)
    baseDate = new Date(today);
    baseDate.setDate(baseDate.getDate() - 1);
  }

  overrides = {};

  // Save to Firestore
  familyDoc.set({
    baseDate: firebase.firestore.Timestamp.fromDate(baseDate),
    lastUpdated: firebase.firestore.Timestamp.now(),
    overrides: {}
  }).catch(err => console.error("Setup save error:", err));

  // Save locally
  localStorage.setItem("setup_complete", "true");
  saveToCache();
  showApp();
  updateUI();
  showToast("설정이 완료되었습니다! ✅");
}

// ===== SCHEDULE LOGIC =====
function normalizeDate(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dateKey(d) {
  const nd = normalizeDate(d);
  const y = nd.getFullYear();
  const m = String(nd.getMonth() + 1).padStart(2, "0");
  const day = String(nd.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isWorkDay(date) {
  if (!baseDate) return false;

  // Check overrides first
  const key = dateKey(date);
  if (overrides.hasOwnProperty(key)) {
    return overrides[key];
  }

  // Default pattern: even difference = work day
  const normBase = normalizeDate(baseDate);
  const normDate = normalizeDate(date);
  const diffMs = normDate.getTime() - normBase.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  // Handle negative modulo correctly
  return ((diffDays % 2) + 2) % 2 === 0;
}

// ===== TAB NAVIGATION =====
function switchTab(tab) {
  // Update tab content
  document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
  document.getElementById(`tab-${tab}`).classList.add("active");

  // Update nav buttons
  document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
  document.querySelector(`.nav-item[data-tab="${tab}"]`).classList.add("active");

  // Render calendar if switching to it
  if (tab === "calendar") {
    renderCalendar();
  }
}

// ===== UPDATE UI =====
function updateUI() {
  if (!baseDate) return;
  updateHome();
  renderCalendar();
  updateSelectedDayInfo();
}

// ===== HOME =====
function updateHome() {
  const now = new Date();
  const work = isWorkDay(now);

  // Date display
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${days[now.getDay()]}요일`;
  document.getElementById("home-date").textContent = dateStr;

  // Full screen background color
  const bg = document.getElementById("home-bg");
  bg.className = `home-fullscreen ${work ? "work" : "rest"}`;

  // Big icon + label
  document.getElementById("home-icon").textContent = work ? "💼" : "🏠";
  document.getElementById("home-label").textContent = work ? "근무일" : "휴무일";
  document.getElementById("home-desc").textContent = work ? "오늘은 근무하는 날입니다" : "오늘은 쉬는 날입니다";

  // Tomorrow info
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowWork = isWorkDay(tomorrow);
  document.getElementById("home-tomorrow").textContent = 
    tomorrowWork ? "내일은 근무일 💼" : "내일은 휴무일 🏠";
}

// ===== CALENDAR =====
function changeMonth(delta) {
  calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + delta, 1);
  renderCalendar();
}

function renderCalendar() {
  if (!baseDate) return;

  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();

  // Title
  document.getElementById("cal-title").textContent = `${year}년 ${month + 1}월`;

  // Grid
  const grid = document.getElementById("cal-grid");
  grid.innerHTML = "";

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const lastDate = new Date(year, month + 1, 0).getDate();
  const today = normalizeDate(new Date());

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.className = "cal-day empty";
    grid.appendChild(empty);
  }

  // Day cells
  for (let d = 1; d <= lastDate; d++) {
    const date = new Date(year, month, d);
    const work = isWorkDay(date);
    const isToday = date.getTime() === today.getTime();
    const isSelected = date.getTime() === normalizeDate(selectedCalDay).getTime();

    const btn = document.createElement("button");
    btn.className = "cal-day";
    btn.classList.add(work ? "work" : "rest");
    if (isToday) btn.classList.add("today");
    if (isSelected) btn.classList.add("selected");
    btn.textContent = d;
    btn.onclick = () => selectCalDay(date);
    grid.appendChild(btn);
  }
}

function selectCalDay(date) {
  selectedCalDay = date;
  renderCalendar();
  updateSelectedDayInfo();
}

function updateSelectedDayInfo() {
  if (!baseDate) return;

  const info = document.getElementById("cal-selected-info");
  const work = isWorkDay(selectedCalDay);

  info.style.display = "flex";
  info.className = `cal-selected-info ${work ? "work" : "rest"}`;

  document.getElementById("cal-sel-icon").textContent = work ? "💼" : "🏠";

  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const d = selectedCalDay;
  document.getElementById("cal-sel-date").textContent =
    `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
  document.getElementById("cal-sel-status").textContent = work ? "근무일" : "휴무일";
}

// ===== ADJUST SCHEDULE =====
function openAdjustModal() {
  document.getElementById("adjust-modal").style.display = "flex";
}

function closeAdjustModal() {
  document.getElementById("adjust-modal").style.display = "none";
}

function adjustSchedule(isWorkToday) {
  const today = normalizeDate(new Date());

  if (isWorkToday) {
    baseDate = today;
  } else {
    baseDate = new Date(today);
    baseDate.setDate(baseDate.getDate() - 1);
  }

  // Clear all overrides when readjusting
  overrides = {};

  // Save to Firestore
  familyDoc.set({
    baseDate: firebase.firestore.Timestamp.fromDate(baseDate),
    lastUpdated: firebase.firestore.Timestamp.now(),
    overrides: {}
  }).catch(err => console.error("Adjust save error:", err));

  saveToCache();
  closeAdjustModal();
  updateUI();
  showToast("일정이 재조정되었습니다! ✅");
}

// ===== RESET =====
function resetSchedule() {
  if (!confirm("모든 일정 데이터를 초기화하고\n처음부터 다시 설정하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.")) {
    return;
  }

  baseDate = null;
  overrides = {};

  // Clear Firestore
  familyDoc.delete().catch(err => console.error("Delete error:", err));

  // Clear cache
  localStorage.removeItem("baseDate");
  localStorage.removeItem("overrides");
  localStorage.removeItem("setup_complete");

  showSetup();
  showToast("초기화되었습니다");
}

// ===== TOAST =====
function showToast(message) {
  // Remove existing toast
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ===== SERVICE WORKER =====
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
