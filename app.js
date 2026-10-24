const firebaseConfig = {
  apiKey: "AIzaSyBmF43ThMFz9tN2A90zmD_K7ybkv2gLMIU",
  authDomain: "dad-work-schedule.firebaseapp.com",
  projectId: "dad-work-schedule",
  storageBucket: "dad-work-schedule.firebasestorage.app",
  messagingSenderId: "452426155762",
  appId: "1:452426155762:web:8fa302a7acde767e4bb26b"
};

const EMOJI_OPTIONS = ["🎂","🎉","🎊","🏥","✈️","🎓","💒","🎁","🎃","🎄","🏖️","💪","🌸","🍽️","🎵","⭐"];
const DEFAULT_EVENT_EMOJI = "📅";
const KO_WEEKDAYS = ["일","월","화","수","목","금","토"];

// 이벤트 이름에 키워드가 들어 있으면 이모지 자동 선택 — 위에 있는 줄이 먼저
// (결혼기념일 → 결혼, 동물병원 → 병원처럼 구체적인 단어가 먼저 오도록)
const EMOJI_KEYWORDS = [
  ["💕", ["결혼기념일", "기념일", "데이트"]],
  ["🎂", ["생일", "생신", "생파", "환갑", "회갑", "칠순", "팔순"]],
  ["👶", ["돌잔치", "백일"]],
  ["💒", ["결혼", "웨딩", "청첩장", "상견례"]],
  ["🖤", ["장례", "조문", "문상", "발인"]],
  ["🕯️", ["제사", "기일", "추도"]],
  ["⛪", ["교회", "예배", "성당", "미사"]],
  ["🙏", ["성묘", "벌초", "법회"]],
  ["💐", ["어버이날", "스승의날"]],
  ["🧸", ["어린이날"]],
  ["🧧", ["설날", "구정", "세배", "명절"]],
  ["🌕", ["추석", "한가위"]],
  ["🎄", ["크리스마스", "성탄"]],
  ["🎃", ["할로윈", "핼러윈"]],
  ["🏃", ["운동회", "마라톤", "러닝", "조깅", "달리기"]],
  ["🦷", ["치과", "임플란트", "스케일링", "교정"]],
  ["👓", ["안과", "안경"]],
  ["🐶", ["동물병원", "강아지", "반려견", "애견"]],
  ["💉", ["예방접종", "접종", "백신", "주사"]],
  ["💊", ["약국", "처방"]],
  ["🏥", ["병원", "진료", "검진", "수술", "입원", "퇴원", "한의원", "내과", "외과", "소아과", "피부과", "이비인후과", "물리치료", "도수치료"]],
  ["💇", ["미용실", "헤어", "이발", "염색", "파마", "커트", "컷트"]],
  ["💅", ["네일"]],
  ["💆", ["마사지", "찜질"]],
  ["⛳", ["골프", "라운딩"]],
  ["🥾", ["등산", "산행", "트레킹", "둘레길"]],
  ["🎣", ["낚시"]],
  ["🏕️", ["캠핑", "글램핑"]],
  ["🏊", ["수영"]],
  ["🧘", ["요가", "필라테스"]],
  ["💪", ["헬스", "운동", "피티", "크로스핏"]],
  ["⚽", ["축구", "풋살"]],
  ["⚾", ["야구"]],
  ["🏀", ["농구"]],
  ["🏐", ["배구"]],
  ["🎾", ["테니스"]],
  ["🏓", ["탁구"]],
  ["🏸", ["배드민턴"]],
  ["🎳", ["볼링"]],
  ["🎱", ["당구"]],
  ["🚴", ["자전거", "라이딩"]],
  ["⛷️", ["스키", "스노보드"]],
  ["🚶", ["산책", "걷기"]],
  ["🎓", ["졸업"]],
  ["🏫", ["입학", "개학", "학부모", "학교", "유치원", "어린이집", "청소년"]],
  ["👔", ["면접"]],
  ["📝", ["수능", "시험", "모의고사", "자격증"]],
  ["📚", ["학원", "과외", "공부", "도서관", "독서"]],
  ["🎤", ["노래방", "발표회", "재롱잔치", "학예회"]],
  ["🎬", ["영화"]],
  ["🎵", ["콘서트", "음악회", "피아노", "합창"]],
  ["🎭", ["공연", "뮤지컬", "연극"]],
  ["🖼️", ["전시", "미술관", "박물관"]],
  ["🧺", ["소풍", "피크닉"]],
  ["🚌", ["체험학습", "현장학습", "수학여행"]],
  ["🏖️", ["휴가", "바다", "해수욕", "물놀이", "계곡"]],
  ["✈️", ["여행", "해외", "공항", "비행기", "출국", "입국"]],
  ["🚄", ["기차", "ktx", "srt"]],
  ["🚗", ["드라이브", "세차", "자동차", "정비", "타이어", "엔진오일"]],
  ["🍻", ["회식", "송년회", "망년회", "신년회", "술약속", "술자리", "호프"]],
  ["🧳", ["출장"]],
  ["💼", ["회의", "미팅", "워크숍", "세미나", "회사", "출근", "근무", "특근", "야근", "당직", "교육"]],
  ["💰", ["월급", "급여", "보너스", "상여금", "용돈"]],
  ["💸", ["카드값", "카드대금", "공과금", "관리비", "세금", "보험료", "납부", "대출", "월세", "전기세", "가스비"]],
  ["🏦", ["은행", "적금", "예금"]],
  ["🗳️", ["투표", "선거"]],
  ["🥬", ["김장"]],
  ["🛒", ["장보기", "마트", "코스트코", "트레이더스", "시장보기"]],
  ["🛍️", ["쇼핑", "백화점", "아울렛"]],
  ["☕", ["카페", "커피"]],
  ["🍽️", ["외식", "식사", "저녁", "점심", "아침", "맛집", "브런치", "뷔페", "한정식", "고기"]],
  ["🏠", ["집들이"]],
  ["📦", ["이사", "이삿짐", "택배"]],
  ["🧹", ["청소", "분리수거"]],
  ["🔧", ["수리", "고장", "설치"]],
  ["🎁", ["선물"]],
  ["🎉", ["파티", "축하", "잔치"]],
  ["👥", ["동창회", "동문회", "계모임", "동호회", "반상회", "모임"]],
  ["🤝", ["약속", "만남"]],
];
// 키워드를 찾기 전에 지우는 단어 (스마트폰이 '마트'로 잘못 잡히지 않게)
const EMOJI_IGNORE_WORDS = ["스마트"];
// 가족이 고른 이모지를 기억할 때 이름에서 빼는 단어 ("엄마 계모임" → "계모임")
const TITLE_STOPWORDS = ["엄마", "아빠", "어머니", "아버지", "할머니", "할아버지", "외할머니", "외할아버지",
  "우리", "가족", "나", "내", "오늘", "내일", "이번주", "다음주", "주말", "매주", "매월", "매년",
  "월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"];

// 공휴일 — 설·추석·부처님오신날(음력)과 대체공휴일·선거일이 해마다 달라서 연도별로 적어둠
// 우주항공청 월력요항 기준 (다음 해 목록은 보통 6월 말 발표). 2026년부터 노동절·제헌절도 공휴일
const HOLIDAYS_BY_YEAR = {
  2025: {
    "01-01": "신정", "01-27": "임시공휴일", "01-28": "설날 연휴", "01-29": "설날", "01-30": "설날 연휴",
    "03-01": "삼일절", "03-03": "대체공휴일", "05-05": "어린이날·부처님오신날", "05-06": "대체공휴일",
    "06-03": "대통령 선거일", "06-06": "현충일", "08-15": "광복절", "10-03": "개천절",
    "10-05": "추석 연휴", "10-06": "추석", "10-07": "추석 연휴", "10-08": "대체공휴일", "10-09": "한글날", "12-25": "성탄절",
  },
  2026: {
    "01-01": "신정", "02-16": "설날 연휴", "02-17": "설날", "02-18": "설날 연휴",
    "03-01": "삼일절", "03-02": "대체공휴일", "05-01": "노동절", "05-05": "어린이날",
    "05-24": "부처님오신날", "05-25": "대체공휴일", "06-03": "지방선거일", "06-06": "현충일", "07-17": "제헌절",
    "08-15": "광복절", "08-17": "대체공휴일", "09-24": "추석 연휴", "09-25": "추석", "09-26": "추석 연휴",
    "10-03": "개천절", "10-05": "대체공휴일", "10-09": "한글날", "12-25": "성탄절",
  },
  2027: {
    "01-01": "신정", "02-06": "설날 연휴", "02-07": "설날", "02-08": "설날 연휴", "02-09": "대체공휴일",
    "03-01": "삼일절", "05-01": "노동절", "05-03": "대체공휴일", "05-05": "어린이날", "05-13": "부처님오신날",
    "06-06": "현충일", "07-17": "제헌절", "07-19": "대체공휴일", "08-15": "광복절", "08-16": "대체공휴일",
    "09-14": "추석 연휴", "09-15": "추석", "09-16": "추석 연휴", "10-03": "개천절", "10-04": "대체공휴일",
    "10-09": "한글날", "10-11": "대체공휴일", "12-25": "성탄절", "12-27": "대체공휴일",
  },
};
// 목록에 없는 해는 날짜가 고정된 공휴일만 (음력 명절·대체공휴일은 빠짐)
const FIXED_HOLIDAYS = {
  "01-01": "신정", "03-01": "삼일절", "05-01": "노동절", "05-05": "어린이날", "06-06": "현충일",
  "07-17": "제헌절", "08-15": "광복절", "10-03": "개천절", "10-09": "한글날", "12-25": "성탄절",
};

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
let hostId = null;
let emojiMemory = {};
let chatIndex = {}; // 날짜별 마지막 대화 { "2026-10-24": { at, by, byId, text } }
let weatherData = {};

let calendarMonth = new Date();
let bottomSheetDate = null;
let bsMemoAt = null;
let selectedEventEmoji = DEFAULT_EVENT_EMOJI;
let eventEmojiAuto = true;     // 이름을 바꾸면 이모지도 자동으로 바뀌는지
let eventEmojiTouched = false; // 이번에 이모지를 직접 골랐는지 (기억 대상)
let selectedWho = new Set();   // 이벤트 '누구 일정' (멤버 deviceId)
let isFirstSnapshot = true;
let roomChecked = false;

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
// 가족이 같은 순간에 저장해도 id가 겹치지 않게 시간 뒤에 무작위 글자를 붙임
function newId() { return Date.now().toString() + Math.random().toString(36).slice(2, 6); }

function initFirebase() {
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  if (!db) {
    db = firebase.firestore();
    // 오프라인에서 저장한 내용도 기기에 남겨뒀다가 연결되면 자동 전송
    db.enablePersistence({ synchronizeTabs: true }).catch(e => console.warn("Offline persistence unavailable", e.code));
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
function parseKey(key) { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d); }
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
// 31일·2월 29일처럼 그 달에 없는 날은 그 달 마지막 날로
function clampedDate(y, m, day) { return new Date(y, m, Math.min(day, daysInMonth(y, m))); }

// ===== 음력 (한국천문연구원 기준 — vendor/korean-lunar-calendar.min.js, 2050년까지) =====
const lunarConverter = typeof KoreanLunarCalendar === "function" ? new KoreanLunarCalendar() : null;
const lunarCache = {};
// 양력 날짜 → 음력 { year, month, day, leap } (변환할 수 없으면 null)
function toLunar(date) {
  const key = dateKey(date);
  if (key in lunarCache) return lunarCache[key];
  let result = null;
  if (lunarConverter && lunarConverter.setSolarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())) {
    const l = lunarConverter.getLunarCalendar();
    result = { year: l.year, month: l.month, day: l.day, leap: l.intercalation };
  }
  return (lunarCache[key] = result);
}
// 음력 y년 m월 d일(윤달 아님) → 양력 Date. 30일이 없는 해엔 29일로
function lunarToSolar(y, m, d) {
  if (!lunarConverter) return null;
  if (!lunarConverter.setLunarDate(y, m, d, false) && !(d === 30 && lunarConverter.setLunarDate(y, m, 29, false))) return null;
  const s = lunarConverter.getSolarCalendar();
  return new Date(s.year, s.month - 1, s.day);
}
function formatLunar(l) { return `음력 ${l.leap ? "윤" : ""}${l.month}월 ${l.day}일`; }

// 연도별 공휴일 { "MM-DD": 이름 } — 표가 없는 해는 고정 공휴일 + 음력 명절(대체공휴일은 빠짐)
const holidayYearCache = {};
function holidaysForYear(year) {
  if (HOLIDAYS_BY_YEAR[year]) return HOLIDAYS_BY_YEAR[year];
  if (holidayYearCache[year]) return holidayYearCache[year];
  const map = {};
  for (const [md, name] of Object.entries(FIXED_HOLIDAYS)) {
    if ((md === "05-01" || md === "07-17") && year < 2026) continue;
    map[md] = name;
  }
  const add = (date, name) => {
    if (!date) return;
    const md = dateKey(date).slice(5);
    map[md] = map[md] ? `${map[md]}·${name}` : name;
  };
  const seol = lunarToSolar(year, 1, 1), chuseok = lunarToSolar(year, 8, 15);
  if (seol) { add(addDays(seol, -1), "설날 연휴"); add(seol, "설날"); add(addDays(seol, 1), "설날 연휴"); }
  add(lunarToSolar(year, 4, 8), "부처님오신날");
  if (chuseok) { add(addDays(chuseok, -1), "추석 연휴"); add(chuseok, "추석"); add(addDays(chuseok, 1), "추석 연휴"); }
  return (holidayYearCache[year] = map);
}
// "2026-10-03" → "개천절" (공휴일이 아니면 null)
function getHoliday(key) {
  return holidaysForYear(Number(key.slice(0, 4)))[key.slice(5)] || null;
}

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
  if (ev.recurrence === "once") {
    const key = dateKey(date);
    return key >= ev.date && key <= (ev.endDate || ev.date); // 며칠짜리면 기간 안 모든 날
  }
  const lastDay = daysInMonth(date.getFullYear(), date.getMonth());
  if (!ev.recurrence || ev.recurrence === "yearly") return ev.month === date.getMonth()+1 && Math.min(ev.day, lastDay) === date.getDate();
  if (ev.recurrence === "weekly") return ev.weekday === date.getDay();
  if (ev.recurrence === "monthly") return Math.min(ev.monthDay, lastDay) === date.getDate();
  if (ev.recurrence === "lunar") {
    const l = toLunar(date);
    if (!l || l.leap || l.month !== ev.lunarMonth) return false;
    if (l.day === ev.lunarDay) return true;
    // 음력 30일이 없는 해엔 29일에
    const fallback = ev.lunarDay === 30 && l.day === 29 ? lunarToSolar(l.year, l.month, 30) : null;
    return !!fallback && dateKey(fallback) === dateKey(date);
  }
  return false;
}

function getNextOccurrence(ev, today) {
  if (ev.recurrence === "once") {
    const start = parseKey(ev.date);
    // 며칠짜리 이벤트가 진행 중이면 오늘
    if (ev.endDate && today >= start && today <= parseKey(ev.endDate)) return normalizeDate(today);
    return start;
  }
  if (!ev.recurrence || ev.recurrence === "yearly") {
    const y = today.getFullYear();
    let d = clampedDate(y, (ev.month||1)-1, ev.day||1);
    if (normalizeDate(d) < today) d = clampedDate(y+1, (ev.month||1)-1, ev.day||1);
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
    let d = clampedDate(today.getFullYear(), today.getMonth(), day);
    if (normalizeDate(d) < today) d = clampedDate(today.getFullYear(), today.getMonth()+1, day);
    return normalizeDate(d);
  }
  if (ev.recurrence === "lunar") {
    const ly = toLunar(today)?.year ?? today.getFullYear();
    for (const y of [ly, ly + 1, ly + 2]) {
      const d = lunarToSolar(y, ev.lunarMonth, ev.lunarDay);
      if (d && normalizeDate(d) >= today) return normalizeDate(d);
    }
  }
  return today;
}

// 여러 개를 넘기면 한 번에 저장 (배열에서 옛 항목 빼고 새 항목 넣기 등)
// 배열은 통째로 덮어쓰지 않고 arrayUnion/arrayRemove로 바꿔서 가족이 동시에 고쳐도 안 사라짐
// ===== 이벤트 표시용 =====
// "07:30" → "오전 7:30"
function formatTime(t) {
  const [h, m] = t.split(":").map(Number);
  return `${h < 12 ? "오전" : "오후"} ${h % 12 || 12}:${String(m).padStart(2, "0")}`;
}
function sortedMembers() { return [...members].sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0)); }
function eventWhoNames(ev) { return (ev.who || []).map(id => members.find(m => m.deviceId === id)?.name).filter(Boolean); }
// "오전 7:00 · ○○CC · 아빠" (없는 건 빼고)
function eventDetailText(ev) {
  return [ev.time ? formatTime(ev.time) : "", ev.place || "", eventWhoNames(ev).join("·")].filter(Boolean).join(" · ");
}
// 며칠짜리 이벤트: "10월 3일 ~ 10월 6일 (4일)"
function formatRange(ev, withYear) {
  const s = parseKey(ev.date), e = parseKey(ev.endDate);
  return `${withYear ? s.getFullYear() + "년 " : ""}${s.getMonth()+1}월 ${s.getDate()}일 ~ ${e.getMonth()+1}월 ${e.getDate()}일 (${diffDays(e, s) + 1}일)`;
}

function saveToFirestore(...updates) {
  if (!roomDoc) return Promise.resolve();
  if (!navigator.onLine) showToast("📴 오프라인 — 연결되면 자동으로 저장돼요");
  let write;
  if (updates.length === 1) {
    write = roomDoc.update(updates[0]);
  } else {
    const batch = db.batch();
    updates.forEach(u => batch.update(roomDoc, u));
    write = batch.commit();
  }
  return write.catch(e => {
    console.error("Firestore write error", e);
    showToast("저장하지 못했어요. 다시 시도해주세요");
  });
}

// Firestore는 undefined 값을 거부해서 미리 빼둠
function compact(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

function saveToCache() {
  localStorage.setItem("v2_base_date", baseDate ? baseDate.getTime() : "");
  localStorage.setItem("v2_overrides", JSON.stringify(overrides));
  localStorage.setItem("v2_periods", JSON.stringify(periods));
  localStorage.setItem("v2_notes", JSON.stringify(notes));
  localStorage.setItem("v2_events", JSON.stringify(events));
  localStorage.setItem("v2_members", JSON.stringify(members));
  localStorage.setItem("v2_host_id", hostId || "");
  localStorage.setItem("v2_emoji_memory", JSON.stringify(emojiMemory));
  localStorage.setItem("v2_chat_index", JSON.stringify(chatIndex));
}
function loadFromCache() {
  const bd = localStorage.getItem("v2_base_date");
  baseDate = bd ? new Date(Number(bd)) : normalizeDate(new Date());
  overrides = JSON.parse(localStorage.getItem("v2_overrides") || "{}");
  periods = JSON.parse(localStorage.getItem("v2_periods") || "[]");
  notes = JSON.parse(localStorage.getItem("v2_notes") || "{}");
  events = JSON.parse(localStorage.getItem("v2_events") || "[]");
  members = JSON.parse(localStorage.getItem("v2_members") || "[]");
  hostId = localStorage.getItem("v2_host_id") || null;
  emojiMemory = JSON.parse(localStorage.getItem("v2_emoji_memory") || "{}");
  chatIndex = JSON.parse(localStorage.getItem("v2_chat_index") || "{}");
  const wc = JSON.parse(localStorage.getItem("v2_weather_cache") || "null");
  if (wc && Date.now() - wc.fetchedAt < 3600000) weatherData = wc.data || {};
}

// 방(가족 그룹) 관련 기기 저장값 — 그룹을 나가거나 로그아웃하면 지움
const ROOM_CACHE_KEYS = ["v2_setup_done", "v2_room_code", "v2_is_host", "v2_host_id", "v2_base_date",
  "v2_overrides", "v2_periods", "v2_notes", "v2_events", "v2_members", "v2_personal_schedules",
  "v2_emoji_memory", "v2_notif_sent", "v2_chat_index", "v2_chat_read"];
function clearRoomData() {
  ROOM_CACHE_KEYS.forEach(k => localStorage.removeItem(k));
  // 백그라운드 알림 목록도 지워서 다른 사람·다른 그룹 알림이 뜨지 않게
  if ("caches" in window) caches.delete(DATA_CACHE).catch(() => {});
  baseDate = null; overrides = {}; periods = []; notes = {}; events = []; members = []; hostId = null; emojiMemory = {}; chatIndex = {};
}
// 로그아웃·계정 변경: 방 정보에 더해 이름과 계정 정보까지 지움
function clearUserData() {
  clearRoomData();
  ["v2_user_name", "v2_owner_uid", "v2_device_id"].forEach(k => localStorage.removeItem(k));
}
function stopRoomListeners() {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  if (chatUnsub) { chatUnsub(); chatUnsub = null; }
  roomDoc = null;
  isFirstSnapshot = true;
  roomChecked = false;
}

// ===== 큰 글씨 (이 기기에만 저장) =====
function applyLargeText() {
  const on = localStorage.getItem("v2_large_text") === "true";
  document.documentElement.classList.toggle("large-text", on);
  const toggle = document.getElementById("large-text-toggle");
  if (toggle) toggle.checked = on;
}
function setLargeText(on) {
  localStorage.setItem("v2_large_text", on ? "true" : "false");
  applyLargeText();
}

// ===== 앱 설치: 안드로이드 크롬은 설치 창, 아이폰은 안내 문구 =====
let installPromptEvent = null;
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  installPromptEvent = e;
  renderInstallUI();
});
window.addEventListener("appinstalled", () => {
  installPromptEvent = null;
  renderInstallUI();
  showToast("앱으로 설치됐어요! 홈 화면에서 열어보세요");
});
function isStandalone() { return window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true; }
function renderInstallUI() {
  const title = document.getElementById("install-item-title"), sub = document.getElementById("install-item-sub");
  if (!title) return;
  if (isStandalone()) { title.textContent = "앱으로 사용 중"; sub.textContent = "홈 화면의 아이콘으로 열고 있어요"; }
  else if (installPromptEvent) { title.textContent = "앱으로 설치하기"; sub.textContent = "누르면 홈 화면에 앱으로 설치돼요"; }
  else if (/iPhone|iPad|iPod/.test(navigator.userAgent)) { title.textContent = "홈 화면에 추가"; sub.textContent = "사파리 아래쪽 공유 버튼 → '홈 화면에 추가'"; }
  else { title.textContent = "홈 화면에 추가"; sub.textContent = "브라우저 메뉴(⋮) → '앱 설치' 또는 '홈 화면에 추가'"; }
  document.getElementById("install-item").classList.toggle("card-item-clickable", !!installPromptEvent);
  document.getElementById("install-banner").style.display =
    installPromptEvent && !isStandalone() && localStorage.getItem("v2_install_dismissed") !== "true" ? "" : "none";
}
async function installApp() {
  if (!installPromptEvent) return;
  installPromptEvent.prompt();
  try { await installPromptEvent.userChoice; } catch(e) {}
  installPromptEvent = null;
  renderInstallUI();
}
function dismissInstallBanner() {
  localStorage.setItem("v2_install_dismissed", "true");
  renderInstallUI();
}

document.addEventListener("DOMContentLoaded", () => {
  applyLargeText();
  renderInstallUI();
  handleInAppBrowser();
  captureInviteCode();
  initFirebase();
  buildEmojiPicker();
  buildLunarSelects();
  firebase.auth().onAuthStateChanged(handleAuthState);
});

// 앱을 다시 열면(백그라운드 → 화면) 날짜가 바뀌었을 수 있으니 새로 그리고 다가오는 이벤트 알림 확인
document.addEventListener("visibilitychange", () => {
  if (document.hidden || !roomDoc) return;
  updateUI();
  checkUpcomingNotifications();
});

function handleAuthState(user) {
  if (!user) {
    document.getElementById("invite-notice").style.display = getPendingJoin() ? "" : "none";
    showView("view-login");
    return;
  }
  // 같은 기기에서 다른 계정으로 로그인하면 이전 사람의 방·이름을 쓰지 않도록 지움
  const ownerUid = localStorage.getItem("v2_owner_uid");
  if (ownerUid && ownerUid !== user.uid) clearUserData();
  localStorage.setItem("v2_owner_uid", user.uid);
  localStorage.setItem("v2_device_id", user.uid);
  const sub = document.getElementById("card-account-sub");
  if (sub) sub.textContent = user.email || "Google 계정에서 로그아웃";
  if (isSetupDone() && getRoomCode()) { startApp(); return; }
  // 로컬에 방 정보 없으면 Firestore에서 조회
  db.collection("memberships").doc(user.uid).get().then(snap => {
    if (snap.exists && snap.data().roomCode) {
      const { roomCode, userName } = snap.data();
      localStorage.setItem("v2_room_code", roomCode);
      localStorage.setItem("v2_setup_done", "true");
      localStorage.setItem("v2_user_name", userName || localStorage.getItem("v2_user_name") || user.displayName || "나");
      startApp();
    } else {
      showSetupView(user);
    }
  }).catch(() => showSetupView(user));
}

function showSetupView(user) {
  ["setup-step-group", "setup-step-code-show", "setup-step-code-join"].forEach(id => {
    document.getElementById(id).style.display = "none";
  });
  document.getElementById("setup-step-name").style.display = "";
  const nameInput = document.getElementById("setup-name-input");
  if (nameInput && !nameInput.value) nameInput.value = localStorage.getItem("v2_user_name") || user?.displayName || "";
  showView("view-setup");
}

async function signInWithGoogle() {
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
  stopRoomListeners();
  clearUserData();
  document.getElementById("setup-name-input").value = "";
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
  // 초대 링크로 들어왔으면 그룹 선택 없이 코드가 채워진 참여 화면으로
  if (getPendingJoin()) { showJoinStep(getPendingJoin()); return; }
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
  localStorage.removeItem("v2_pending_join");
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
      baseDate: now, overrides: {}, periods: [], notes: {}, events: [], emojiMemory: {}
    });
    localStorage.setItem("v2_room_code", code);
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

// ===== 초대 링크 =====
// 카카오톡 같은 앱 안 브라우저에서는 구글 로그인이 막혀 있어서(구글 정책) 바깥 브라우저로 다시 열기
function handleInAppBrowser() {
  const ua = navigator.userAgent;
  if (/KAKAOTALK/i.test(ua)) {
    location.href = "kakaotalk://web/openExternal?url=" + encodeURIComponent(location.href);
  } else if (!/NAVER\(inapp|Instagram|FBAN|FBAV|Line\/|DaumApps|BAND\//i.test(ua)) {
    return;
  }
  document.getElementById("inapp-notice").style.display = "";
}

// 초대 링크(?join=코드)로 열었으면 로그인하는 동안 잊지 않게 코드를 저장하고 주소창에서는 지움
function captureInviteCode() {
  const params = new URLSearchParams(location.search);
  if (!params.has("join")) return;
  const code = params.get("join").trim().toUpperCase();
  if (/^[A-Z0-9]{4,8}$/.test(code)) localStorage.setItem("v2_pending_join", code);
  params.delete("join");
  const qs = params.toString();
  history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
}
function getPendingJoin() { return localStorage.getItem("v2_pending_join"); }
function getInviteLink(code) { return `${location.origin}${location.pathname}?join=${code}`; }

// 휴대폰은 공유 창(카카오톡 등)을 띄우고, 안 되면 링크를 복사
async function shareInvite() {
  const code = getRoomCode() || document.getElementById("setup-generated-code")?.textContent || "";
  if (!code) return;
  const url = getInviteLink(code);
  const text = `아빠 스케줄 가족 그룹에 초대해요 👨‍👩‍👧\n링크를 누르고 구글로 로그인하면 바로 참여돼요. (그룹 코드: ${code})`;
  if (navigator.share) {
    try { await navigator.share({ title: "아빠 스케줄", text, url }); return; }
    catch(e) { if (e.name === "AbortError") return; }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    showToast("초대 링크를 복사했어요 📋");
  } catch(e) {
    prompt("아래 링크를 복사해서 가족에게 보내주세요", url);
  }
}

function showJoinStep(code) {
  ["setup-step-name", "setup-step-group", "setup-step-code-show"].forEach(id => {
    document.getElementById(id).style.display = "none";
  });
  document.getElementById("setup-join-title").textContent = "🎉 초대받은 가족 그룹에 참여해요";
  document.getElementById("setup-join-code-input").value = code;
  document.getElementById("setup-join-error").style.display = "none";
  document.getElementById("setup-step-code-join").style.display = "";
  showView("view-setup");
}

// 이미 그룹에 들어와 있는데 초대 링크를 열었을 때
function handlePendingInvite() {
  const code = getPendingJoin();
  if (!code) return;
  localStorage.removeItem("v2_pending_join");
  if (code === getRoomCode()) { showToast("이미 이 가족 그룹에 들어와 있어요"); return; }
  if (!confirm(`다른 가족 그룹(코드 ${code})에 초대받았어요.\n지금 그룹을 나가고 새 그룹에 참여할까요?`)) return;
  leaveCurrentGroup();
  showJoinStep(code);
  joinGroup();
}

function finishSetupAsHost() {
  localStorage.setItem("v2_setup_done", "true");
  startApp();
}

function showJoinInput() {
  document.getElementById("setup-join-title").textContent = "받은 코드를 입력해주세요";
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
  try {
    await ensureSelfInMembers(db.collection("rooms").doc(input), snap.data());
    await db.collection("memberships").doc(deviceId).set({ roomCode: input, userName: name });
  } catch(e) {
    console.error("joinGroup error:", e);
    showToast("참여하지 못했어요. 다시 시도해주세요.");
    return;
  }
  localStorage.setItem("v2_room_code", input);
  localStorage.setItem("v2_setup_done", "true");
  localStorage.removeItem("v2_pending_join");
  startApp();
}

// 멤버 목록에 내가 없으면 넣기 — 같은 이름이 있으면(구글 로그인 전 기기 ID) 그 자리를 내 계정으로 교체
function ensureSelfInMembers(ref, data) {
  const myId = getDeviceId();
  const list = data.members || [];
  if (list.some(m => m.deviceId === myId)) return Promise.resolve();
  const idx = list.findIndex(m => m.name === getMyName());
  if (idx < 0) {
    return ref.update({
      members: firebase.firestore.FieldValue.arrayUnion({ deviceId: myId, name: getMyName(), joinedAt: Date.now() })
    });
  }
  const update = { members: list.map((m, i) => i === idx ? { ...m, deviceId: myId } : m) };
  if (data.hostDeviceId === list[idx].deviceId) update.hostDeviceId = myId;
  return ref.update(update);
}

// 앱을 열 때 한 번, 서버의 최신 방 데이터로: 멤버 목록 확인 + 예전 버전의 방장 표시(이 기기에만 저장) 옮기기
function checkRoomOnce() {
  const ref = roomDoc;
  ref.get({ source: "server" }).then(snap => {
    // 받아오는 사이에 그룹을 나갔으면(초대 링크로 옮김 등) 예전 그룹에 다시 넣지 않음
    if (!snap.exists || roomDoc !== ref) return;
    const data = snap.data();
    const work = [ensureSelfInMembers(ref, data)];
    if (localStorage.getItem("v2_is_host") === "true") {
      if (data.hostDeviceId !== getDeviceId()) work.push(ref.update({ hostDeviceId: getDeviceId() }));
      localStorage.removeItem("v2_is_host");
    }
    return Promise.all(work);
  }).catch(e => console.warn("Room check skipped", e.code || e));
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
  checkUpcomingNotifications();
  registerBackgroundReminders();
  setTimeout(handlePendingInvite, 300);
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
    const prev = JSON.stringify({ baseDate, overrides, periods, notes, events, members });
    baseDate = data.baseDate ? new Date(data.baseDate) : normalizeDate(new Date());
    overrides = data.overrides || {};
    periods = data.periods || [];
    notes = data.notes || {};
    events = data.events || [];
    members = data.members || [];
    hostId = data.hostDeviceId || null;
    emojiMemory = data.emojiMemory || {};
    const prevChat = chatIndex;
    chatIndex = data.chatIndex || {};
    // 이 기기에서 처음 보는 거면 지금까지의 대화는 읽은 걸로 시작
    if (localStorage.getItem("v2_chat_read") === null) {
      localStorage.setItem("v2_chat_read", JSON.stringify(Object.fromEntries(Object.entries(chatIndex).map(([k, c]) => [k, c.at]))));
    }
    saveToCache();
    updateUI();
    renderMemberList();
    // 내가 방금 바꾼 것(hasPendingWrites)은 알리지 않음
    if (!isFirstSnapshot && !snap.metadata.hasPendingWrites && document.hidden) {
      const curr = JSON.stringify({ baseDate, overrides, periods, notes, events, members });
      if (prev !== curr) sendNotification("📅 일정이 업데이트됐어요!", "가족이 일정을 변경했습니다.");
      for (const [key, c] of Object.entries(chatIndex)) {
        if (c.byId !== getDeviceId() && c.at > (prevChat[key]?.at || 0)) sendNotification(`💬 ${c.by || "가족"}`, `${formatDateShort(key)} · ${c.text}`);
      }
    }
    checkUpcomingNotifications();
    isFirstSnapshot = false;
    if (!roomChecked) { roomChecked = true; checkRoomOnce(); }
  }, e => console.error("Firestore listen error", e));
}

function canNotify() { return "Notification" in window && Notification.permission === "granted"; }

function allowNotifications() {
  if (!("Notification" in window)) { dismissNotifBanner(); return; }
  Notification.requestPermission().then(p => {
    dismissNotifBanner();
    if (p === "granted") { checkUpcomingNotifications(); registerBackgroundReminders(); }
  });
}
function dismissNotifBanner() { document.getElementById("notif-banner").style.display = "none"; }
// 안드로이드 크롬은 new Notification()을 막아서 서비스 워커로 띄우고, 안 되면(데스크톱 등) 직접 띄움
async function sendNotification(title, body) {
  if (!canNotify()) return;
  const options = { body, icon: "./assets/icons/icon-192.png", badge: "./assets/icons/icon-192.png" };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) { await reg.showNotification(title, options); return; }
  } catch(e) {}
  try { new Notification(title, options); } catch(e) {}
}

// ===== 앱이 꺼져 있어도 알림 =====
// 앞으로 보낼 알림 목록을 캐시에 적어두면, 서비스 워커가 '주기적 백그라운드 동기화'(설치한 앱 + 안드로이드 크롬,
// 하루 한두 번)로 깨어나 보여줌. 보낸 기록은 앱과 서비스 워커가 함께 써서 같은 알림이 두 번 뜨지 않게 함
const DATA_CACHE = "dad-schedule-data";
async function readDataCache(name, fallback) {
  try {
    const res = await (await caches.open(DATA_CACHE)).match(`./__${name}.json`);
    return res ? await res.json() : fallback;
  } catch(e) { return fallback; }
}
async function writeDataCache(name, value) {
  try { await (await caches.open(DATA_CACHE)).put(`./__${name}.json`, new Response(JSON.stringify(value))); } catch(e) {}
}
// 앞으로 45일의 D-1·D-3 알림 (매주 반복은 D-1만, 며칠짜리는 시작하는 날 기준)
function upcomingReminders(days = 45) {
  const today = normalizeDate(new Date());
  const list = [];
  for (let i = 1; i <= days; i++) {
    const d = addDays(today, i);
    const key = dateKey(d);
    for (const ev of events) {
      if (ev.recurrence === "once" ? ev.date !== key : !eventMatchesDate(ev, d)) continue;
      for (const before of ev.recurrence === "weekly" ? [1] : [1, 3]) {
        if (before > i) continue; // 알림 날짜가 이미 지남
        list.push({
          key: `ev_${ev.id}_d${before}_${key}`, event: `${ev.id}_${key}`, date: key,
          notifyOn: dateKey(addDays(d, -before)), title: ev.title, emoji: ev.emoji, detail: eventDetailText(ev),
        });
      }
    }
  }
  return list;
}
async function registerBackgroundReminders() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (!reg?.periodicSync || !canNotify()) return;
    const perm = await navigator.permissions.query({ name: "periodic-background-sync" });
    if (perm.state === "granted") await reg.periodicSync.register("event-reminders", { minInterval: 12 * 60 * 60 * 1000 });
  } catch(e) {}
}

// 여러 번 동시에 불려도 같은 알림이 두 번 뜨지 않게 차례로 실행
let notifCheckQueue = Promise.resolve();
function checkUpcomingNotifications() {
  notifCheckQueue = notifCheckQueue.then(runNotificationCheck, runNotificationCheck);
  return notifCheckQueue;
}
async function runNotificationCheck() {
  if (!canNotify()) return;
  const today = normalizeDate(new Date());
  const todayKey = dateKey(today);
  // 서비스 워커가 백그라운드에서 보낸 것까지 합쳐서 확인
  const sent = { ...JSON.parse(localStorage.getItem("v2_notif_sent") || "{}"), ...(await readDataCache("sent", {})) };
  // 지난 날짜 기록은 정리
  for (const k in sent) if (!/\d{4}-\d{2}-\d{2}$/.test(k) || k.slice(-10) < todayKey) delete sent[k];
  for (const ev of events) {
    const nextDate = getNextOccurrence(ev, today);
    const diff = diffDays(nextDate, today);
    // 매주 반복은 3일 전 알림까지 하면 너무 잦아서 하루 전만
    if (diff === 1 || (diff === 3 && ev.recurrence !== "weekly")) {
      const key = `ev_${ev.id}_d${diff}_${dateKey(nextDate)}`;
      if (!sent[key]) {
        const detail = eventDetailText(ev);
        await sendNotification(
          `${ev.emoji} ${diff === 1 ? "내일" : "3일 후"} — ${ev.title}`,
          `${nextDate.getMonth()+1}월 ${nextDate.getDate()}일${detail ? " · " + detail : ""}`
        );
        sent[key] = true;
      }
    }
  }
  localStorage.setItem("v2_notif_sent", JSON.stringify(sent));
  await writeDataCache("sent", sent);
  await writeDataCache("reminders", { reminders: upcomingReminders() });
}

function updateUI() {
  updateHome();
  renderCalendar();
  renderMonthEventList();
  renderPeriodList();
  renderEventList();
  renderEmojiMemoryList();
}

function updateHome() {
  const today = normalizeDate(new Date());
  const tomorrow = addDays(today, 1);
  const isWork = isWorkDay(today);
  const isWorkTomorrow = isWorkDay(tomorrow);
  document.getElementById("home-date").textContent =
    `${today.getMonth()+1}월 ${today.getDate()}일 (${KO_WEEKDAYS[today.getDay()]})`;
  const todayKey = dateKey(today);
  const holidayToday = getHoliday(todayKey);
  const holidayTomorrow = getHoliday(dateKey(tomorrow));
  const card = document.getElementById("status-card");
  card.className = "status-card " + (isWork ? "work" : "rest");
  document.getElementById("status-icon").textContent = isWork ? "💼" : "🏠";
  document.getElementById("status-label").textContent = isWork ? "근무일" : "휴무일";
  document.getElementById("status-desc").textContent = isWork ? "오늘은 근무하는 날입니다" : "오늘은 쉬는 날입니다";
  const holidayPill = document.getElementById("status-holiday");
  holidayPill.style.display = holidayToday ? "" : "none";
  holidayPill.textContent = holidayToday ? `🇰🇷 ${holidayToday}` : "";
  document.getElementById("tomorrow-label").textContent = holidayTomorrow ? `내일 · ${holidayTomorrow}` : "내일";
  const badge = document.getElementById("tomorrow-badge");
  badge.className = "tomorrow-badge " + (isWorkTomorrow ? "work" : "rest");
  badge.textContent = isWorkTomorrow ? "근무 💼" : "휴무 🏠";
  renderHomeWeather(today, tomorrow);
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
  renderUnreadChats();
  renderNextEvent();
  renderTogetherDays();
  renderActivityFeed();
}

// ===== 다 같이 쉬는 날: 앞으로 60일 중 아빠가 쉬는 주말·공휴일 (최대 4개) =====
function togetherRestDays(limit = 4, range = 60) {
  const today = normalizeDate(new Date());
  const days = [];
  for (let i = 0; i <= range && days.length < limit; i++) {
    const d = addDays(today, i);
    const holiday = getHoliday(dateKey(d));
    if (!isWorkDay(d) && (d.getDay() === 0 || d.getDay() === 6 || holiday)) days.push({ d, holiday });
  }
  return days;
}
function renderTogetherDays() {
  const days = togetherRestDays();
  document.getElementById("together-card").style.display = days.length ? "" : "none";
  document.getElementById("together-list").innerHTML = days.map(({ d, holiday }) =>
    `<button class="together-chip" onclick="openBottomSheetFromKey('${dateKey(d)}')">${d.getMonth()+1}/${d.getDate()} (${KO_WEEKDAYS[d.getDay()]})${holiday ? `<span class="together-holiday">${escapeHtml(holiday)}</span>` : ""}</button>`
  ).join("");
}

function formatTemps(w) {
  return Number.isFinite(w.minTemp) ? `${w.maxTemp}° / ${w.minTemp}°` : `${w.maxTemp}°`;
}
// 비·눈 소식: 예보가 비/눈이거나 강수확률 60% 이상
function precipitationInfo(w) {
  if (!w) return null;
  const snow = (w.code >= 71 && w.code <= 77) || w.code === 85 || w.code === 86;
  const rain = (w.code >= 51 && w.code <= 67) || (w.code >= 80 && w.code <= 82) || w.code >= 95;
  if (!snow && !rain && !((w.rainProb ?? 0) >= 60)) return null;
  return { snow, prob: w.rainProb };
}
// 홈: 오늘·내일 날씨 + 비/눈 소식 (근무일이면 출근길 안내)
function renderHomeWeather(today, tomorrow) {
  const wToday = weatherData[dateKey(today)];
  const wTomorrow = weatherData[dateKey(tomorrow)];
  document.getElementById("status-weather").style.display = wToday ? "" : "none";
  if (wToday) {
    document.getElementById("status-weather-emoji").textContent = wToday.emoji;
    document.getElementById("status-weather-temp").textContent = formatTemps(wToday);
  }
  document.getElementById("tomorrow-weather").textContent = wTomorrow ? `${wTomorrow.emoji} ${wTomorrow.maxTemp}°` : "";
  const lines = [];
  for (const [d, label] of [[today, "오늘"], [tomorrow, "내일"]]) {
    const p = precipitationInfo(weatherData[dateKey(d)]);
    if (!p) continue;
    const work = isWorkDay(d);
    const tip = p.snow ? (work ? "출근길 미끄럼 조심하세요" : label === "오늘" ? "외출할 땐 미끄럼 조심하세요" : "")
      : label === "오늘" ? (work ? "출근길 우산 챙기세요" : "외출할 땐 우산 챙기세요")
      : (work ? "출근 전에 우산 챙겨두세요" : "");
    const prob = p.prob != null ? ` (${p.prob}%)` : "";
    lines.push(`${p.snow ? "❄️" : "☔"} ${label} ${p.snow ? "눈" : "비"} 소식${prob}${tip ? " · " + tip : ""}`);
  }
  const alertEl = document.getElementById("weather-alert");
  alertEl.style.display = lines.length ? "" : "none";
  alertEl.innerHTML = lines.map(l => `<div>${escapeHtml(l)}</div>`).join("");
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
    const holiday = getHoliday(key);
    // 이벤트가 있으면 이벤트를, 없으면 공휴일 이름을 보여줌
    const evBlock = dayEvs.length
      ? `<span class="week-day-event">${escapeHtml(dayEvs[0].emoji)}</span>
         <span class="week-day-event-name">${escapeHtml(dayEvs[0].title)}</span>`
      : holiday ? `<span class="week-day-event-name week-day-holiday">${escapeHtml(holiday)}</span>` : "";
    html += `<div class="week-day ${work ? "work" : "rest"}${isToday ? " today" : ""}${holiday ? " holiday" : ""}" onclick="openBottomSheetFromKey('${key}')">
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
  const nd = next.nextDate;
  const ongoing = next.recurrence === "once" && next.endDate && next.date < dateKey(nd);
  const when = next.endDate ? formatRange(next) : `${nd.getMonth()+1}월 ${nd.getDate()}일 (${KO_WEEKDAYS[nd.getDay()]})`;
  const detail = eventDetailText(next);
  document.getElementById("next-event-date").textContent = when + (detail ? ` · ${detail}` : "");
  document.getElementById("next-event-dday").textContent =
    ongoing ? "진행 중" : next.days === 0 ? "D-DAY" : `D-${next.days}`;
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
  if (!activities.length) { section.style.display = "none"; return; }
  activities.sort((a, b) => b.at - a.at);
  section.style.display = "";
  list.innerHTML = activities.slice(0, 6).map(a => `
    <div class="activity-item">
      <span class="activity-icon">${escapeHtml(a.icon)}</span>
      <div class="activity-body">
        <div class="activity-text">${escapeHtml(a.text)}</div>
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
  const lastDay = daysInMonth(y, m);
  const todayKey = dateKey(new Date());
  const unreadKeys = new Set(unreadChats().map(c => c.key));
  for (let i = 0; i < startDay; i++) {
    const el = document.createElement("div"); el.className = "cal-day empty"; grid.appendChild(el);
  }
  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(y, m, d);
    const key = dateKey(date);
    const work = isWorkDay(date);
    const el = document.createElement("div");
    el.className = `cal-day ${work ? "work" : "rest"}`;
    if (key === todayKey) el.classList.add("today");
    el.onclick = () => openBottomSheet(date);
    const num = document.createElement("div");
    num.className = "cal-day-num"; num.textContent = d; el.appendChild(num);
    const holiday = getHoliday(key);
    if (holiday) {
      el.classList.add("holiday");
      const h = document.createElement("div");
      h.className = "cal-day-holiday"; h.textContent = holiday; el.appendChild(h);
    }
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
    if (unreadKeys.has(key)) {
      const dot = document.createElement("span"); dot.className = "dot dot-chat"; dots.appendChild(dot);
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
  const rows = [];
  for (const ev of events) {
    const d = getNextOccurrence(ev, firstDay);
    if (d.getFullYear() === y && d.getMonth() === m) {
      rows.push({ ev, d });
    }
  }
  for (let day = 1; day <= daysInMonth(y, m); day++) {
    const holiday = getHoliday(dateKey(new Date(y, m, day)));
    if (holiday) rows.push({ holiday, d: new Date(y, m, day) });
  }
  if (!rows.length) { el.style.display = "none"; return; }
  rows.sort((a, b) => a.d - b.d || !!b.holiday - !!a.holiday);
  el.style.display = "";
  const dateText = d => `${d.getMonth()+1}월 ${d.getDate()}일 (${KO_WEEKDAYS[d.getDay()]})`;
  // 매주 반복은 날짜 하나 대신 "매주 ○요일"로 (누르면 이번 달 첫 번째 날로 이동)
  el.innerHTML = `<div class="cal-event-list-header">📅 이번 달 이벤트${rows.some(r => r.holiday) ? "·공휴일" : ""}</div>` +
    rows.map(({ ev, holiday, d }) =>
      `<div class="cal-event-row${holiday ? " cal-holiday-row" : ""}" onclick="openBottomSheet(new Date(${d.getFullYear()},${d.getMonth()},${d.getDate()}))">
        <span class="cal-event-emoji">${holiday ? "🇰🇷" : escapeHtml(ev.emoji)}</span>
        <span class="cal-event-date">${holiday ? dateText(d) : ev.recurrence === "weekly" ? `매주 ${KO_WEEKDAYS[d.getDay()]}요일` : ev.endDate ? formatRange(ev) : dateText(d)}</span>
        <span class="cal-event-title">${escapeHtml(holiday || ev.title)}</span>
      </div>`
    ).join("");
}

function openBottomSheet(date) {
  bottomSheetDate = normalizeDate(date);
  const key = dateKey(date);
  const work = isWorkDay(date);
  const d = normalizeDate(date);
  document.getElementById("bs-date-text").textContent = `${d.getMonth()+1}월 ${d.getDate()}일 (${KO_WEEKDAYS[d.getDay()]})`;
  const badge = document.getElementById("bs-status-badge");
  badge.className = "bs-status-badge " + (work ? "work" : "rest");
  badge.textContent = work ? "근무일 💼" : "휴무일 🏠";
  const holiday = getHoliday(key);
  const holidayBadge = document.getElementById("bs-holiday-badge");
  holidayBadge.style.display = holiday ? "" : "none";
  holidayBadge.textContent = holiday ? `🇰🇷 ${holiday}` : "";
  const lunar = toLunar(d);
  document.getElementById("bs-lunar-text").textContent = lunar ? formatLunar(lunar) : "";
  const w = weatherData[key];
  const rain = w && w.rainProb >= 30 ? ` · ☔ ${w.rainProb}%` : "";
  document.getElementById("bs-weather-badge").innerHTML = w
    ? `${escapeHtml(w.emoji)}<span class="bs-weather-temp">${escapeHtml(formatTemps(w) + rain)}</span>` : "";
  const noteData = notes[key];
  const memoText = noteData ? (typeof noteData === "string" ? noteData : noteData.text) : "";
  const memoBy = noteData && typeof noteData === "object" ? noteData.by : null;
  const memoAt = noteData && typeof noteData === "object" ? noteData.at : null;
  bsMemoAt = memoAt;
  document.getElementById("bs-memo-input").value = memoText || "";
  document.getElementById("bs-memo-by").textContent = memoBy ? formatBy(memoBy, memoAt) : "";
  const dayEvents = events.filter(ev => eventMatchesDate(ev, d));
  const evSection = document.getElementById("bs-events-section");
  evSection.innerHTML =
    `<div class="bs-section-header-row">
      <div class="bs-section-title">📅 이벤트</div>
      <button class="bs-personal-add-btn" onclick="openEventModalForDate()">+ 추가</button>
    </div>` +
    (dayEvents.length
      ? dayEvents.map(ev => {
          // 며칠짜리면 "4일 중 2일째"
          const span = ev.endDate ? `${diffDays(parseKey(ev.endDate), parseKey(ev.date)) + 1}일 중 ${diffDays(d, parseKey(ev.date)) + 1}일째` : "";
          const detail = [span, eventDetailText(ev)].filter(Boolean).join(" · ");
          return `<div class="bs-event-item"><span class="bs-event-emoji">${escapeHtml(ev.emoji)}</span><div class="bs-event-body"><span class="bs-event-title">${escapeHtml(ev.title)}${ev.recurrence === "lunar" ? ` <span class="bs-event-lunar">음력 ${ev.lunarMonth}.${ev.lunarDay}</span>` : ""}</span>${detail ? `<span class="bs-event-detail">${escapeHtml(detail)}</span>` : ""}</div></div>`;
        }).join("")
      : `<div class="bs-empty-hint">등록된 이벤트가 없어요</div>`);
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

function saveMemoFromSheet() {
  if (!bottomSheetDate) return;
  const key = dateKey(bottomSheetDate);
  // 시트를 연 뒤 다른 가족이 같은 날 메모를 바꿨으면 덮어쓰기 전에 물어봄
  const cur = notes[key];
  if (cur && typeof cur === "object" && cur.at !== bsMemoAt && cur.byId && cur.byId !== getDeviceId()) {
    if (!confirm(`${formatActor(cur.by)} 방금 이 날 메모를 바꿨어요:\n"${cur.text}"\n\n지금 쓴 내용으로 덮어쓸까요?`)) return;
  }
  const text = document.getElementById("bs-memo-input").value.trim();
  const val = text ? { text, ...myMeta() } : null;
  const update = {};
  update[`notes.${key}`] = val || firebase.firestore.FieldValue.delete();
  if (val) notes[key] = val; else delete notes[key];
  saveToCache(); updateUI(); closeBottomSheet();
  showToast("메모가 저장됐어요!");
  saveToFirestore(update);
}

function toggleSelectedDaySchedule() {
  if (!bottomSheetDate) return;
  const key = dateKey(bottomSheetDate);
  overrides[key] = !isWorkDay(bottomSheetDate);
  const update = {}; update[`overrides.${key}`] = overrides[key];
  saveToCache(); openBottomSheet(bottomSheetDate); renderCalendar(); updateHome();
  saveToFirestore(update);
}

async function fetchWeather() {
  const wc = JSON.parse(localStorage.getItem("v2_weather_cache") || "null");
  // v2: 최저기온·강수확률이 들어간 형식 (예전 형식이면 새로 받아옴)
  if (wc && wc.v === 2 && Date.now() - wc.fetchedAt < 3600000) { weatherData = wc.data || {}; renderCalendar(); updateHome(); return; }
  let lat = 37.5665, lon = 126.9780;
  try {
    const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 }));
    lat = pos.coords.latitude.toFixed(4); lon = pos.coords.longitude.toFixed(4);
  } catch(e) {}
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FSeoul&forecast_days=14`;
    const res = await fetch(url); const json = await res.json();
    const daily = json.daily || {};
    const nd = {};
    (daily.time || []).forEach((ds, i) => {
      const code = daily.weathercode[i];
      nd[ds] = {
        code, emoji: weatherCodeToEmoji(code),
        maxTemp: Math.round(daily.temperature_2m_max[i]),
        minTemp: Math.round(daily.temperature_2m_min?.[i]),
        rainProb: daily.precipitation_probability_max?.[i] ?? null,
      };
    });
    weatherData = nd;
    localStorage.setItem("v2_weather_cache", JSON.stringify({ v: 2, fetchedAt: Date.now(), data: nd }));
    renderCalendar(); updateHome();
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
    const msgs = snap.exists ? (snap.data().messages || []) : [];
    renderChatMessages(msgs);
    // 보고 있는 날짜의 대화는 읽은 걸로
    if (msgs.length) markChatRead(key, Math.max(...msgs.map(m => m.at || 0)));
  });
}

// ===== 새 대화 표시 =====
// 날짜별 마지막 대화는 방 문서의 chatIndex에, 어디까지 읽었는지는 이 기기에 저장
function getChatRead() { return JSON.parse(localStorage.getItem("v2_chat_read") || "{}"); }
function markChatRead(key, at) {
  const read = getChatRead();
  const latest = Math.max(at || 0, chatIndex[key]?.at || 0);
  if ((read[key] || 0) >= latest) return;
  read[key] = latest;
  localStorage.setItem("v2_chat_read", JSON.stringify(read));
  renderCalendar(); renderUnreadChats();
}
// 다른 가족이 보낸 안 읽은 대화 (최신순)
function unreadChats() {
  const read = getChatRead(), myId = getDeviceId();
  return Object.entries(chatIndex)
    .filter(([key, c]) => c && c.byId !== myId && c.at > (read[key] || 0))
    .map(([key, c]) => ({ key, ...c }))
    .sort((a, b) => b.at - a.at);
}
function renderUnreadChats() {
  const card = document.getElementById("chat-unread-card");
  const list = unreadChats();
  card.style.display = list.length ? "" : "none";
  document.getElementById("chat-unread-list").innerHTML = list.slice(0, 3).map(c => {
    const d = parseKey(c.key);
    return `<div class="chat-unread-item" onclick="openBottomSheetFromKey('${c.key}')">
      <span class="chat-unread-date">${d.getMonth()+1}월 ${d.getDate()}일 (${KO_WEEKDAYS[d.getDay()]})</span>
      <span class="chat-unread-text">${escapeHtml(c.by || "?")}: ${escapeHtml(c.text || "")}</span>
    </div>`;
  }).join("");
}

async function sendChatMessage() {
  if (!bottomSheetDate) return;
  const input = document.getElementById("bs-chat-input");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  const key = dateKey(bottomSheetDate);
  const msg = { id: newId(), text, ...myMeta() };
  // 가족이 새 대화를 알 수 있게 날짜별 마지막 대화를 방 문서에도 남김
  const summary = { at: msg.at, by: msg.by, byId: msg.byId, text: text.slice(0, 60) };
  chatIndex[key] = summary;
  markChatRead(key, msg.at);
  saveToFirestore({ [`chatIndex.${key}`]: summary });
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
  return String(str ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

function setRecurrence(type) {
  selectedRecurrence = type;
  ["once","yearly","weekly","monthly","lunar"].forEach(t => {
    document.getElementById("rec-" + t).classList.toggle("active", t === type);
    document.getElementById("rec-" + t + "-opts").style.display = t === type ? "" : "none";
  });
  if (type === "lunar") updateLunarPreview();
}

function buildLunarSelects() {
  const options = (n, unit) => Array.from({ length: n }, (_, i) => `<option value="${i + 1}">${i + 1}${unit}</option>`).join("");
  document.getElementById("event-lunar-month").innerHTML = options(12, "월");
  document.getElementById("event-lunar-day").innerHTML = options(30, "일");
}
function setLunarSelects(month, day) {
  document.getElementById("event-lunar-month").value = String(month);
  document.getElementById("event-lunar-day").value = String(day);
}
// 고른 음력 날짜가 양력으로 언제인지 미리 보여줌
function updateLunarPreview() {
  const ev = {
    recurrence: "lunar",
    lunarMonth: Number(document.getElementById("event-lunar-month").value),
    lunarDay: Number(document.getElementById("event-lunar-day").value),
  };
  const next = getNextOccurrence(ev, normalizeDate(new Date()));
  document.getElementById("lunar-preview").textContent = eventMatchesDate(ev, next)
    ? `👉 다음은 양력 ${next.getFullYear()}년 ${next.getMonth() + 1}월 ${next.getDate()}일 (${KO_WEEKDAYS[next.getDay()]})`
    : "음력 날짜를 계산할 수 없어요";
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
function adjustSchedule(isWorkToday) {
  const today = normalizeDate(new Date());
  baseDate = isWorkToday ? today : addDays(today, 1);
  overrides = {};
  const update = { baseDate: baseDate.getTime(), overrides: {} };
  saveToCache(); updateUI(); closeAdjustModal();
  showToast("일정이 재조정됐어요!");
  saveToFirestore(update);
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
  const lastDay = daysInMonth(y, m);
  for (let i = 0; i < startDay; i++) {
    const el = document.createElement("div"); el.className = "range-day empty"; grid.appendChild(el);
  }
  for (let d = 1; d <= lastDay; d++) {
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
function savePeriod(type) {
  if (!rangeStart) { showToast("시작일을 선택하세요"); return; }
  const start = dateKey(rangeStart); const end = dateKey(rangeEnd || rangeStart);
  const period = { id: newId(), start, end, type, ...myMeta() };
  periods.push(period);
  saveToCache(); renderCalendar(); renderPeriodList(); closePeriodModal(); updateHome();
  showToast("기간 일정이 설정됐어요!");
  saveToFirestore({ periods: firebase.firestore.FieldValue.arrayUnion(period) });
}
function deletePeriod(id) {
  const removed = periods.filter(p => p.id === id);
  if (!removed.length || !confirm("이 기간 일정을 삭제할까요?")) return;
  periods = periods.filter(p => p.id !== id);
  saveToCache(); renderCalendar(); renderPeriodList(); updateHome();
  showToast("삭제됐어요!");
  saveToFirestore({ periods: firebase.firestore.FieldValue.arrayRemove(...removed) });
}
function renderPeriodList() {
  const el = document.getElementById("period-list");
  if (!periods.length) { el.innerHTML = '<div class="card-empty">등록된 기간 일정이 없습니다.</div>'; return; }
  el.innerHTML = [...periods].sort((a,b) => a.start.localeCompare(b.start)).map(p => {
    const icon = p.type === "work" ? "💼" : "🏖️";
    const label = p.type === "work" ? "연속 근무" : "연속 휴무";
    const range = p.start === p.end ? formatDateShort(p.start) : `${formatDateShort(p.start)} – ${formatDateShort(p.end)}`;
    const byStr = p.by ? formatBy(p.by, p.at) : "";
    return `<div class="card-item"><span class="card-item-icon">${icon}</span><div class="card-item-body"><span class="card-item-title">${label}</span><span class="card-item-sub">${range}</span>${byStr ? `<span class="card-item-by">${escapeHtml(byStr)}</span>` : ""}</div><button class="card-item-delete" data-id="${escapeHtml(p.id)}" onclick="deletePeriod(this.dataset.id)">✕</button></div>`;
  }).join("");
}

function openEventModal(evId = null) {
  editingEventId = evId;
  document.getElementById("event-modal-title").textContent = evId ? "이벤트 수정" : "이벤트 추가";
  document.getElementById("event-modal-save-btn").textContent = evId ? "수정" : "저장";

  // 새 이벤트는 이름을 쓰는 대로 이모지가 자동으로 바뀌고, 수정할 땐 원래 이모지를 그대로 둠
  eventEmojiAuto = !evId;
  eventEmojiTouched = false;
  if (evId) {
    const ev = events.find(e => e.id === evId);
    if (ev) {
      document.getElementById("event-title-input").value = ev.title;
      selectedEventEmoji = ev.emoji || DEFAULT_EVENT_EMOJI;
      selectedRecurrence = ev.recurrence || "yearly";
      selectedWeekday = ev.weekday || 0;
      if (selectedRecurrence === "lunar") setLunarSelects(ev.lunarMonth, ev.lunarDay);
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
    }
  } else {
    document.getElementById("event-title-input").value = "";
    document.getElementById("event-date-input").value = "";
    document.getElementById("event-once-date-input").value = "";
    document.getElementById("event-monthday-input").value = "";
    // 음력 칸은 오늘의 음력 날짜로 시작
    const todayLunar = toLunar(new Date());
    setLunarSelects(todayLunar ? todayLunar.month : 1, todayLunar ? todayLunar.day : 1);
    selectedEventEmoji = DEFAULT_EVENT_EMOJI; selectedRecurrence = "yearly"; selectedWeekday = 0;
    setRecurrence("yearly");
    document.querySelectorAll(".weekday-btn").forEach((btn, i) => btn.classList.toggle("active", i === 0));
  }
  // 끝나는 날·시간·장소·누구 (선택 항목)
  const editing = evId ? events.find(e => e.id === evId) : null;
  document.getElementById("event-end-date-input").value = editing?.endDate || "";
  document.getElementById("event-time-input").value = editing?.time || "";
  document.getElementById("event-place-input").value = editing?.place || "";
  selectedWho = new Set(editing?.who || []);
  buildWhoPicker();
  buildEmojiPicker();
  updateEmojiHint();
  document.getElementById("event-modal").style.display = "";
}
function closeEventModal() { editingEventId = null; document.getElementById("event-modal").style.display = "none"; }
function buildWhoPicker() {
  document.getElementById("event-who-picker").innerHTML = sortedMembers().map(m =>
    `<button type="button" class="who-chip${selectedWho.has(m.deviceId) ? " selected" : ""}" data-id="${escapeHtml(m.deviceId)}" onclick="toggleWho(this.dataset.id)">${escapeHtml(m.name)}</button>`
  ).join("");
}
function toggleWho(id) {
  if (selectedWho.has(id)) selectedWho.delete(id); else selectedWho.add(id);
  buildWhoPicker();
}
function buildEmojiPicker() {
  const picker = document.getElementById("emoji-picker"); if (!picker) return;
  picker.innerHTML = EMOJI_OPTIONS.map(e =>
    `<div class="emoji-option ${e === selectedEventEmoji ? "selected" : ""}" onclick="selectEmoji('${e}')">${e}</div>`
  ).join("");
  const customInput = document.getElementById("emoji-custom-input");
  if (customInput) customInput.value = selectedEventEmoji;
}
function selectEmoji(e) {
  selectedEventEmoji = e;
  eventEmojiAuto = false; eventEmojiTouched = true;
  buildEmojiPicker(); updateEmojiHint();
}
function onCustomEmojiInput(e) {
  if (e.isComposing) return;
  const emoji = pickTypedEmoji(e.target.value, selectedEventEmoji);
  if (!emoji) return;
  selectedEventEmoji = emoji;
  eventEmojiAuto = false; eventEmojiTouched = true;
  buildEmojiPicker(); updateEmojiHint();
}
// 입력칸에 원래 이모지가 남아 있어도 새로 친 이모지를 고름 (👨‍👩‍👧처럼 여러 글자로 된 이모지도 하나로)
function pickTypedEmoji(value, current) {
  const parts = splitGraphemes(value).filter(p => p.trim());
  const typed = parts.filter(p => p !== current);
  return typed.length ? typed[typed.length - 1] : parts.length ? current : "";
}
function splitGraphemes(str) {
  if (window.Intl?.Segmenter) return [...new Intl.Segmenter("ko", { granularity: "grapheme" }).segment(str)].map(s => s.segment);
  return Array.from(str);
}

function onEventTitleInput() {
  if (eventEmojiAuto) {
    const s = suggestEmoji(document.getElementById("event-title-input").value);
    selectedEventEmoji = s ? s.emoji : DEFAULT_EVENT_EMOJI;
    buildEmojiPicker();
  }
  updateEmojiHint();
}
// 자동으로 골랐으면 이유를, 직접 고른 것과 추천이 다르면 추천 버튼을 보여줌
function updateEmojiHint() {
  const el = document.getElementById("emoji-suggest-hint");
  if (!el) return;
  const s = suggestEmoji(document.getElementById("event-title-input").value);
  el.classList.remove("clickable");
  el.onclick = null;
  if (!s || (!eventEmojiAuto && s.emoji === selectedEventEmoji)) { el.style.display = "none"; return; }
  el.style.display = "";
  if (eventEmojiAuto) {
    el.textContent = s.source === "family"
      ? `✨ ${s.by ? formatActor(s.by) : "가족이"} 전에 골랐던 아이콘이에요`
      : `✨ '${s.keyword}' 보고 골랐어요`;
  } else {
    el.textContent = `✨ 추천 ${s.emoji} — 누르면 바꿔요`;
    el.classList.add("clickable");
    el.onclick = () => {
      selectedEventEmoji = s.emoji;
      eventEmojiAuto = true; eventEmojiTouched = false;
      buildEmojiPicker(); updateEmojiHint();
    };
  }
}

function normalizeTitle(title) { return String(title).toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""); }
// 기억할 때 쓰는 단어: 사람·요일 같은 말을 뺀 이름 ("엄마 계모임" → "계모임")
function emojiMemoryWords(title) {
  const skip = new Set([...TITLE_STOPWORDS, ...members.map(m => m.name)]);
  return String(title).trim().split(/\s+/).filter(w => !skip.has(w));
}
function emojiMemoryKey(title) { return normalizeTitle(emojiMemoryWords(title).join("")).slice(0, 30); }
// 1) 가족이 전에 고른 이모지 (같은 이름 → 이름에 들어 있는 가장 긴 단어) 2) 기본 키워드 사전
function suggestEmoji(title) {
  const text = normalizeTitle(title);
  if (!text) return null;
  const key = emojiMemoryKey(title);
  let best = null;
  for (const [word, m] of Object.entries(emojiMemory)) {
    if (!m || !m.emoji) continue;
    if (word === key) return { emoji: m.emoji, by: m.by, keyword: word, source: "family" };
    if (word.length >= 2 && text.includes(word) && (!best || word.length > best.keyword.length)) {
      best = { emoji: m.emoji, by: m.by, keyword: word, source: "family" };
    }
  }
  if (best) return best;
  const cleaned = EMOJI_IGNORE_WORDS.reduce((t, w) => t.split(w).join(""), text);
  for (const [emoji, words] of EMOJI_KEYWORDS) {
    const keyword = words.find(w => cleaned.includes(w));
    if (keyword) return { emoji, keyword, source: "dict" };
  }
  return null;
}
// 직접 고른 이모지가 추천과 다르면 가족 모두가 쓰도록 방에 기억해둠
function rememberEmojiUpdate(title, emoji) {
  const key = emojiMemoryKey(title);
  if (!key || suggestEmoji(title)?.emoji === emoji) return null;
  const entry = { emoji, label: emojiMemoryWords(title).join(" "), by: getMyName(), at: Date.now() };
  emojiMemory[key] = entry;
  return { [`emojiMemory.${key}`]: entry };
}
function deleteEmojiMemory(key) {
  if (!emojiMemory[key]) return;
  delete emojiMemory[key];
  saveToCache(); renderEmojiMemoryList();
  showToast("삭제됐어요!");
  saveToFirestore({ [`emojiMemory.${key}`]: firebase.firestore.FieldValue.delete() });
}
function renderEmojiMemoryList() {
  const el = document.getElementById("emoji-memory-list");
  if (!el) return;
  const entries = Object.entries(emojiMemory).filter(([, m]) => m && m.emoji).sort((a, b) => (b[1].at || 0) - (a[1].at || 0));
  if (!entries.length) {
    el.innerHTML = '<div class="card-empty">이벤트 아이콘을 직접 고르면 여기에 기억돼요.<br>다음부터는 가족 모두에게 자동으로 골라져요.</div>';
    return;
  }
  el.innerHTML = entries.map(([word, m]) => {
    const byStr = m.by ? formatBy(m.by, m.at, "고름") : "";
    return `<div class="card-item"><span class="card-item-icon">${escapeHtml(m.emoji)}</span><div class="card-item-body"><span class="card-item-title">${escapeHtml(m.label || word)}</span>${byStr ? `<span class="card-item-by">${escapeHtml(byStr)}</span>` : ""}</div><button class="card-item-delete" data-key="${escapeHtml(word)}" onclick="deleteEmojiMemory(this.dataset.key)">✕</button></div>`;
  }).join("");
}

function saveEvent() {
  const title = document.getElementById("event-title-input").value.trim();
  if (!title) { showToast("이름을 입력해주세요"); return; }
  const isEdit = !!editingEventId;
  const original = isEdit ? events.find(e => e.id === editingEventId) : null;
  let ev = {
    id: isEdit ? editingEventId : newId(),
    title,
    emoji: selectedEventEmoji,
    recurrence: selectedRecurrence,
    time: document.getElementById("event-time-input").value || undefined,
    place: document.getElementById("event-place-input").value.trim() || undefined,
    who: selectedWho.size ? [...selectedWho] : undefined,
    ...(original ? { by: original.by, byId: original.byId, at: original.at } : myMeta())
  };
  if (selectedRecurrence === "once") {
    const dateVal = document.getElementById("event-once-date-input").value;
    if (!dateVal) { showToast("날짜를 입력해주세요"); return; }
    ev.date = dateVal;
    const endVal = document.getElementById("event-end-date-input").value;
    if (endVal && endVal < dateVal) { showToast("끝나는 날이 시작하는 날보다 빨라요"); return; }
    if (endVal > dateVal) ev.endDate = endVal;
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
  } else if (selectedRecurrence === "lunar") {
    ev.lunarMonth = Number(document.getElementById("event-lunar-month").value);
    ev.lunarDay = Number(document.getElementById("event-lunar-day").value);
  }
  ev = compact(ev);
  // 같은 id의 옛 항목을 빼고 새 항목을 넣음 (배열 통째로 덮어쓰지 않아서 다른 가족이 동시에 추가한 것도 안 사라짐)
  const olds = events.filter(e => e.id === ev.id);
  events = [...events.filter(e => e.id !== ev.id), ev];
  const updates = [];
  if (olds.length) updates.push({ events: firebase.firestore.FieldValue.arrayRemove(...olds) });
  updates.push({ events: firebase.firestore.FieldValue.arrayUnion(ev) });
  const memoryUpdate = eventEmojiTouched ? rememberEmojiUpdate(title, ev.emoji) : null;
  if (memoryUpdate) updates.push(memoryUpdate);
  saveToCache(); renderCalendar(); renderEventList(); renderMonthEventList(); renderEmojiMemoryList(); updateHome(); closeEventModal();
  showToast((isEdit ? "이벤트가 수정됐어요!" : "이벤트가 등록됐어요!") + (memoryUpdate ? " ✨ 아이콘 기억!" : ""));
  saveToFirestore(...updates);
}
function deleteEvent(id) {
  const removed = events.filter(e => e.id === id);
  if (!removed.length || !confirm(`"${removed[0].title}" 이벤트를 삭제할까요?`)) return;
  events = events.filter(e => e.id !== id);
  saveToCache(); renderCalendar(); renderEventList(); renderMonthEventList(); updateHome();
  showToast("삭제됐어요!");
  saveToFirestore({ events: firebase.firestore.FieldValue.arrayRemove(...removed) });
}
function renderEventList() {
  const el = document.getElementById("event-list");
  if (!events.length) { el.innerHTML = '<div class="card-empty">등록된 이벤트가 없습니다.</div>'; return; }
  const today = normalizeDate(new Date());
  // 다가오는 순서대로, 지나간 '한 번만' 이벤트는 맨 아래 흐리게
  const rows = events.map(ev => ({ ev, next: getNextOccurrence(ev, today) }));
  const upcoming = rows.filter(r => r.next >= today).sort((a, b) => a.next - b.next);
  const past = rows.filter(r => r.next < today).sort((a, b) => b.next - a.next);
  el.innerHTML = [...upcoming, ...past].map(({ ev, next }) => {
    const isPast = next < today;
    const recLabel = ev.recurrence === "once"
      ? (ev.endDate ? formatRange(ev, true) : (() => { const [y,m,d] = ev.date.split("-"); return `${y}년 ${Number(m)}월 ${Number(d)}일`; })())
      : !ev.recurrence || ev.recurrence === "yearly" ? `매년 ${ev.month}월 ${ev.day}일`
      : ev.recurrence === "weekly" ? `매주 ${KO_WEEKDAYS[ev.weekday]}요일`
      : ev.recurrence === "lunar" ? `매년 음력 ${ev.lunarMonth}월 ${ev.lunarDay}일 (다음: ${next.getMonth()+1}월 ${next.getDate()}일)`
      : `매월 ${ev.monthDay}일`;
    const detail = eventDetailText(ev);
    const byStr = ev.by ? formatBy(ev.by, ev.at) : "";
    return `<div class="card-item${isPast ? " card-item-past" : ""}"><span class="card-item-icon">${escapeHtml(ev.emoji)}</span><div class="card-item-body"><span class="card-item-title">${escapeHtml(ev.title)}</span><span class="card-item-sub">${recLabel}${isPast ? " · 지난 일정" : ""}</span>${detail ? `<span class="card-item-sub card-item-detail">${escapeHtml(detail)}</span>` : ""}${byStr ? `<span class="card-item-by">${escapeHtml(byStr)}</span>` : ""}</div><div class="card-item-actions"><button class="card-item-edit" data-id="${escapeHtml(ev.id)}" onclick="openEventModal(this.dataset.id)">✏️</button><button class="card-item-delete" data-id="${escapeHtml(ev.id)}" onclick="deleteEvent(this.dataset.id)">✕</button></div></div>`;
  }).join("");
}

function renderMemberList() {
  const el = document.getElementById("member-list");
  if (!members.length) { el.innerHTML = '<div class="card-empty">불러오는 중...</div>'; return; }
  const myId = getDeviceId();
  el.innerHTML = sortedMembers().map(m => {
    const isMe = m.deviceId === myId;
    const isHost = !!hostId && m.deviceId === hostId;
    return `<div class="member-item">
      <span class="member-avatar">${isHost ? "👑" : "👤"}</span>
      <div class="member-info">
        <span class="member-name">${escapeHtml(m.name)}</span>
        ${isHost ? `<span class="member-badge">방장</span>` : ""}
        ${isMe ? `<span class="member-badge member-me-badge">내 기기</span>` : ""}
      </div>
      ${isMe
        ? `<button class="member-edit-btn" onclick="openNickModal()">✏️</button>`
        : `<button class="member-remove-btn" data-id="${escapeHtml(m.deviceId)}" onclick="removeMember(this.dataset.id)">✕</button>`}
    </div>`;
  }).join("");
}

// 예전 기기 등 안 쓰는 멤버 정리 (실제로 쓰는 사람이면 앱을 다시 열 때 자동으로 다시 들어옴)
function removeMember(deviceId) {
  const removed = members.filter(m => m.deviceId === deviceId);
  if (!removed.length) return;
  const name = removed[0].name;
  if (!confirm(`${name}${objectParticle(name)} 가족 목록에서 뺄까요?\n그 기기에서 앱을 다시 열면 다시 들어와요.`)) return;
  members = members.filter(m => m.deviceId !== deviceId);
  saveToCache(); renderMemberList();
  showToast("가족 목록에서 뺐어요");
  saveToFirestore({ members: firebase.firestore.FieldValue.arrayRemove(...removed) });
}

function openNickModal() {
  document.getElementById("nick-input").value = getMyName();
  document.getElementById("nick-modal").style.display = "";
}
function closeNickModal() { document.getElementById("nick-modal").style.display = "none"; }

function saveNickname() {
  const newName = document.getElementById("nick-input").value.trim();
  if (!newName) { showToast("이름을 입력해주세요"); return; }
  localStorage.setItem("v2_user_name", newName);
  const uid = firebase.auth().currentUser?.uid;
  if (uid && db) {
    db.collection("memberships").doc(uid).update({ userName: newName }).catch(() => {});
    const myId = getDeviceId();
    const mine = members.filter(m => m.deviceId === myId);
    const me = { ...(mine[0] || { deviceId: myId, joinedAt: Date.now() }), name: newName };
    members = mine.length ? members.map(m => m.deviceId === myId ? me : m) : [...members, me];
    const updates = [];
    if (mine.length) updates.push({ members: firebase.firestore.FieldValue.arrayRemove(...mine) });
    updates.push({ members: firebase.firestore.FieldValue.arrayUnion(me) });
    saveToFirestore(...updates);
  }
  closeNickModal();
  renderMemberList();
  showToast("닉네임이 변경됐어요!");
}

// 이 기기에서 그룹만 나감 — 방의 일정은 다른 가족을 위해 그대로 둠
function leaveGroup() {
  if (!confirm("이 기기에서 가족 그룹을 나갈까요?\n가족의 일정은 그대로 남아요.")) return;
  leaveCurrentGroup();
  showSetupView(firebase.auth().currentUser);
}
function leaveCurrentGroup() {
  const myId = getDeviceId();
  const mine = members.filter(m => m.deviceId === myId);
  if (mine.length) saveToFirestore({ members: firebase.firestore.FieldValue.arrayRemove(...mine) });
  const uid = firebase.auth().currentUser?.uid;
  if (uid && db) db.collection("memberships").doc(uid).delete().catch(() => {});
  stopRoomListeners();
  clearRoomData();
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
function objectParticle(name) { return hasFinalConsonant(name) ? "을" : "를"; }
function formatActor(by) {
  if (!by) return "누군가";
  return by === getMyName() ? "내가" : `${by}${subjectParticle(by)}`;
}

function formatBy(by, at, verb = "추가") {
  const who = by === getMyName() ? "내가" : `${by}${subjectParticle(by)}`;
  if (!at) return `${who} ${verb}`;
  const today = new Date(); today.setHours(0,0,0,0);
  const atDate = new Date(at); atDate.setHours(0,0,0,0);
  const dayDiff = Math.floor((today - atDate) / 86400000);
  let timeStr;
  if (dayDiff === 0) {
    const d = new Date(at); const h = d.getHours(); const min = String(d.getMinutes()).padStart(2,"0");
    timeStr = `${h < 12 ? "오전" : "오후"} ${h > 12 ? h-12 : h || 12}:${min}`;
  } else if (dayDiff === 1) { timeStr = "어제"; }
  else { const d = new Date(at); timeStr = `${d.getMonth()+1}월 ${d.getDate()}일`; }
  return `${who} ${verb} · ${timeStr}`;
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
