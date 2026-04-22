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
let periods = []; // { id: "123", start: "2026-05-01", end: "2026-05-03", type: "rest" }
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
      periods = data.periods || [];
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
    localStorage.setItem("periods", JSON.stringify(periods));
    localStorage.setItem("setup_complete", "true");
  }
}

function loadFromCache() {
  const cached = localStorage.getItem("baseDate");
  const cachedOverrides = localStorage.getItem("overrides");
  const cachedPeriods = localStorage.getItem("periods");
  const setupDone = localStorage.getItem("setup_complete");

  if (cached) {
    baseDate = new Date(parseInt(cached));
    overrides = cachedOverrides ? JSON.parse(cachedOverrides) : {};
    periods = cachedPeriods ? JSON.parse(cachedPeriods) : [];
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
  periods = [];

  // Save to Firestore
  familyDoc.set({
    baseDate: firebase.firestore.Timestamp.fromDate(baseDate),
    lastUpdated: firebase.firestore.Timestamp.now(),
    overrides: {},
    periods: []
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

  const key = dateKey(date);

  // 1. 단일 날짜 오버라이드
  if (overrides && overrides.hasOwnProperty(key)) {
    return overrides[key];
  }

  // 2. 기간 일정 (periods) 적용에 따른 effectiveBaseDate 계산
  let effectiveBaseDate = baseDate;
  
  if (periods && periods.length > 0) {
    // 종료일 기준으로 정렬
    const sorted = [...periods].sort((a, b) => a.end.localeCompare(b.end));
    
    for (const p of sorted) {
      if (key >= p.start && key <= p.end) {
        // 기간 안이라면 설정된 상태 반환
        return p.type === "work";
      }
      
      if (key > p.end) {
        // 이 기간이 끝난 후의 날짜라면 baseDate를 새로 설정 (새로운 패턴 시작)
        if (p.type === "rest") {
          // 휴무가 끝난 다음 날은 근무
          const d = new Date(p.end);
          d.setDate(d.getDate() + 1);
          effectiveBaseDate = d;
        } else {
          // 근무가 끝난 다음 날은 휴무
          effectiveBaseDate = new Date(p.end); // end를 baseDate로 잡으면 end+1은 diff 1이 되어 휴무가 됨
        }
      }
    }
  }

  // 3. effectiveBaseDate를 기준으로 근무/휴무 계산
  const normBase = normalizeDate(effectiveBaseDate);
  const normDate = normalizeDate(date);
  const diffMs = normDate.getTime() - normBase.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
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

  // Clear all overrides and periods when readjusting
  overrides = {};
  periods = [];

  // Save to Firestore
  familyDoc.set({
    baseDate: firebase.firestore.Timestamp.fromDate(baseDate),
    lastUpdated: firebase.firestore.Timestamp.now(),
    overrides: {},
    periods: []
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
  periods = [];

  // Clear Firestore
  familyDoc.delete().catch(err => console.error("Delete error:", err));

  // Clear cache
  localStorage.removeItem("baseDate");
  localStorage.removeItem("overrides");
  localStorage.removeItem("periods");
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

// ===== PERIOD MANAGEMENT =====
function openPeriodModal() {
  const todayStr = dateKey(new Date());
  document.getElementById("period-start").value = todayStr;
  document.getElementById("period-end").value = todayStr;
  document.getElementById("period-modal").style.display = "flex";
}

function closePeriodModal() {
  document.getElementById("period-modal").style.display = "none";
}

function savePeriod(type) {
  const start = document.getElementById("period-start").value;
  const end = document.getElementById("period-end").value;

  if (!start || !end) {
    alert("시작일과 종료일을 모두 선택해주세요.");
    return;
  }

  if (start > end) {
    alert("종료일이 시작일보다 빠를 수 없습니다.");
    return;
  }

  const newPeriod = {
    id: Date.now().toString(),
    start: start,
    end: end,
    type: type
  };

  periods.push(newPeriod);

  // Save to Firebase
  familyDoc.update({
    periods: periods,
    lastUpdated: firebase.firestore.Timestamp.now()
  }).catch(err => console.error("Save period error:", err));

  saveToCache();
  closePeriodModal();
  updateUI();
  renderPeriodList(); // Update settings list
  showToast("기간 일정이 등록되었습니다! ✅");
}

function deletePeriod(id) {
  if (!confirm("이 예외 일정을 삭제하시겠습니까?")) return;

  periods = periods.filter(p => p.id !== id);

  familyDoc.update({
    periods: periods,
    lastUpdated: firebase.firestore.Timestamp.now()
  }).catch(err => console.error("Delete period error:", err));

  saveToCache();
  updateUI();
  renderPeriodList();
  showToast("삭제되었습니다.");
}

function renderPeriodList() {
  const container = document.getElementById("period-list");
  if (!container) return; // Might not be on settings tab

  if (periods.length === 0) {
    container.innerHTML = '<div class="settings-item-sub">등록된 기간 일정이 없습니다.</div>';
    return;
  }

  container.innerHTML = "";
  // Sort by start date
  const sorted = [...periods].sort((a, b) => a.start.localeCompare(b.start));

  sorted.forEach(p => {
    const item = document.createElement("div");
    item.className = "settings-item";
    
    const icon = p.type === "work" ? "💼" : "🏠";
    const label = p.type === "work" ? "연속 근무" : "휴가/연속 휴무";
    
    item.innerHTML = `
      <span class="settings-item-icon">${icon}</span>
      <div style="flex:1;">
        <span class="settings-item-title">${label}</span>
        <span class="settings-item-sub">${p.start} ~ ${p.end}</span>
      </div>
      <button onclick="deletePeriod('${p.id}')" style="background:none;border:none;color:#e74c3c;font-size:1.2rem;cursor:pointer;">❌</button>
    `;
    container.appendChild(item);
  });
}

// Hook into switchTab to update settings list when opened
const originalSwitchTab = switchTab;
switchTab = function(tab) {
  originalSwitchTab(tab);
  if (tab === "settings") {
    renderPeriodList();
  }
};

