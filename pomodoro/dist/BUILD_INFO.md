# 빌드 정보 — BOOST (pomodoro) 0.1.9

## 산출물 (사실)

- `pomodoro/dist/com.hun4175.pomodoro.debug.0.1.9.rpk`
- 크기: 950491 bytes
- SHA256: `001668ccb4cbee86e11abf1e2205088df13b55a28c27e1098f30f625c6cbd730`
- package `com.hun4175.pomodoro`(변경 없음) · 앱 이름 `BOOST` · versionName 0.1.9 / versionCode 10
- 빌드: aiot-toolkit 2.0.5 (`npm run build`, `build success` 로그 확인)
- 서명: aiot-toolkit 2.0.5 내장 디버그 인증서 (toolkit 기본 `pem/private.pem`, `pem/certificate.pem`). 별도 서명 키는 쓰지 않음
- SWEEP 테마 방식: `SWEEP_MODE = 'rotate'` (CSS `transform: rotate` + `transform-origin`). 프레임 PNG(`common/sweep/`)는 들어 있지 않음
- rpk 안 `manifest.json`·`manifest-watch.json`의 name `BOOST`, 0.1.9/10 확인
- rpk 안 파일 73개. `common/booster/*.png` 60장, `common/ui/*.png` 5장(gear, thumb-sand/booster/battery/sweep), `common/logo.png`가 `src/`의 원본과 바이트 동일함을 확인. `common/setup/`(THERMO 52장)은 제거되어 들어 있지 않음. 글꼴 파일(.ttf/.otf)은 들어 있지 않음
- 단위 테스트: 76 passed, 0 failed (`timer.test.mjs`, `project.test.mjs`, `page-sim.test.mjs`). `scripts/sweep-mode.py frames`로 바꾼 상태에서도 76 passed를 확인한 뒤 rotate로 되돌려 빌드
- 실기기 설치: 하지 않음

## 변경

- 테마 4종: SAND(기본), BOOSTER(0.1.8 계기판 그대로), BATTERY, SWEEP. 설정값 `pomodoro.settings.v1`에 `theme` 필드로 저장
- 설정 화면을 모든 테마 공통 TWIN TUBES(`docs/full-theme-design/settings-merged/A-final`)로 교체. 튜브 짚기/세로 끌기, 12px 축 잠금, 가로 무시, x<30 무반응, 뒤로가기 가드 유지
- 왼쪽 아래 톱니 버튼 → 같은 페이지 안 `themes` 뷰(테마 목록, 현재 테마 ✓·흰 테두리). 고르면 저장하고 설정으로, 뒤로가기도 설정으로
- THERMO 설정 리소스 52장과 `scripts/gen-setup.py`·`scripts/setup-layout.json` 제거 → rpk 1280673 → 950491 bytes

## 이전 산출물

- `pomodoro/dist/com.hun4175.pomodoro.debug.0.1.8.rpk` (이 버전 산출물에서는 제거)
- 크기: 1280673 bytes
- SHA256: `cc1484fbd40a1603e152450f48f3ba7ecd5452c900a38c557d482dd91b8883fe`
- versionName 0.1.8 / versionCode 9
