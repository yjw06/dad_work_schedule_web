# 아빠 스케줄

아빠의 격일 근무 일정과 가족 이벤트를 가족이 함께 보는 웹 앱(PWA)이에요.
Firebase(구글 로그인 + Firestore)로 가족끼리 실시간으로 공유돼요.

## 기능

- **근무 일정**: 격일 근무 자동 계산, 날짜별로 근무/휴무 바꾸기, 휴가·연속 근무 기간 설정
- **가족 이벤트**: 한 번만 / 매년 / 매주 / 매월 / **음력**(음력 생일·제사), 여러 날짜(여행 등),
  시간·장소·누구 일정, 하루 전·3일 전 알림
- **아이콘 자동 선택**: 이름에 "골프", "생신", "치과" 같은 말이 있으면 아이콘을 골라줌,
  가족이 직접 고른 아이콘은 기억해서 다음부터 자동으로
- **공휴일**: 대체·임시공휴일 포함 빨간 날 표시 (2025~2027년 표, 이후는 고정 공휴일 + 음력 명절 계산)
- **홈**: 오늘·내일 근무, 날씨, 비·눈 소식, 이번 주, 다음 이벤트, 다 같이 쉬는 날, 새 대화, 최근 활동
- **날짜별 메모·대화**, 새 대화 표시, 음력 날짜 표시
- **초대 링크**: 링크만 보내면 로그인 후 바로 그룹 참여 (카카오톡 안에서 열면 바깥 브라우저로)
- **큰 글씨 모드**, 오프라인 저장, 앱 설치 버튼, 앱이 꺼져 있어도 알림(설치한 앱 + 안드로이드 크롬)

## 배포

- **웹**: `main` 브랜치가 GitHub Pages로 배포돼요 → https://yjw06.github.io/dad_work_schedule_web/
- **Firestore 보안 규칙**: [`firestore.rules`](firestore.rules) 내용을 Firebase 콘솔 → Firestore Database → 규칙에 붙여넣고 게시
- `sw.js`의 `CACHE_NAME` 버전을 올리면 설치된 앱도 새 버전으로 바뀌어요

## 부모님 폰에 설치하기

**방법 1 — 크롬으로 설치 (추천)**: 폰 크롬에서 위 주소를 열고 홈 화면의 **설치** 배너(또는 메뉴 ⋮ → 앱 설치)를 누르기.
주소창 없이 앱처럼 열리고, 웹이 바뀌면 자동으로 업데이트돼요.

**방법 2 — APK 파일**: https://github.com/yjw06/dad_work_schedule_web/releases/download/apk-latest/dad-schedule.apk
를 폰에서 받아 설치 ("출처를 알 수 없는 앱" 허용). 앱 안에서 웹 화면을 그대로 띄우는 방식(TWA)이라
웹이 바뀌면 앱도 바로 바뀌어요. 화면 위에 얇은 주소 표시줄이 보일 수 있어요.

APK는 `android/` 폴더를 고치면 GitHub Actions([`.github/workflows/android-apk.yml`](.github/workflows/android-apk.yml))가
새로 만들어 `apk-latest` 릴리스에 올려요. 서명 키를 고정하려면 워크플로 맨 위 설명대로 저장소 Secrets에 키를 넣어주세요
(없으면 빌드마다 임시 키라서, 새 APK로 바꿀 땐 예전 앱을 지우고 설치해야 해요).

## 사용한 라이브러리

- [Firebase JS SDK](https://firebase.google.com/docs/web/setup) (compat)
- [korean-lunar-calendar](https://github.com/usingsky/korean_lunar_calendar_js) — 한국천문연구원 기준 음력 변환, MIT ([`vendor/`](vendor/))
- [Android Browser Helper](https://github.com/GoogleChrome/android-browser-helper) — APK(TWA)
- 날씨: [Open-Meteo](https://open-meteo.com/)
