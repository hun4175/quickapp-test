# 빌드 정보 — BOOST (pomodoro) 0.1.10

## 산출물 (사실)

- `pomodoro/dist/com.hun4175.pomodoro.debug.0.1.10.rpk`
- 크기: 951398 bytes
- SHA256: `71e3212b1b71b6d46954ac3a9e6ed2f8933ac13f14e8e97b7322bf5a23f92527`
- package `com.hun4175.pomodoro`(변경 없음) · 앱 이름 `BOOST` · versionName 0.1.10 / versionCode 11
- 빌드: aiot-toolkit 2.0.5 (`npm run build`, `build success` 로그 확인)
- 서명: aiot-toolkit 2.0.5 내장 디버그 인증서 (toolkit 기본 `pem/private.pem`, `pem/certificate.pem`). 별도 서명 키는 쓰지 않음
- SWEEP 방식: `SWEEP_MODE = 'rotate'` (0.1.9와 같음). 프레임 PNG(`common/sweep/`)는 들어 있지 않음
- rpk 안 `manifest.json`·`manifest-watch.json`의 name `BOOST`, 0.1.10/11 확인
- rpk 안 파일 73개. `common/booster/*.png` 60장, `common/ui/*.png` 5장, `common/logo.png`가 `src/`의 원본과 바이트 동일함을 확인(0.1.9와 같은 리소스). 글꼴 파일은 들어 있지 않음
- 단위 테스트: 89 passed, 0 failed (`timer.test.mjs`, `project.test.mjs`, `page-sim.test.mjs`)
- 실기기 설치: 하지 않음

## 변경

- 테마 순서: 1 SWEEP(기본) · 2 SAND · 3 BATTERY · 4 BOOSTER (테마 고르기 화면, `THEMES` 배열). 저장값이 없거나 알 수 없는 값이면 SWEEP
- 저장된 테마는 0.1.9부터 이름 문자열(`"sand"` 등)로 `pomodoro.settings.v1`에 들어 있어서, 순서가 바뀌어도 기존 선택이 그대로 유지됨(인덱스 변환 불필요)
- 백그라운드: 앱이 숨겨지면(`onHide`) 설정으로 초기화하지 않고, 타이머를 그 순간 일시정지해 남은 시간·집중/휴식 단계·반복 설정·테마·현재 화면을 유지. 돌아오면(`onShow`) 같은 화면에 일시정지 상태로 보이고 탭해야 재개
- 일시정지 표시: SAND·BATTERY·SWEEP은 아래쪽 `TAP TO RESUME` 알약(새로 추가), BOOSTER는 기존 게이지 중심 막대 두 개
- 타이머 세션을 `@system.storage` 키 `pomodoro.session.v1`에 저장(숨길 때·시작·일시정지/재개 때). 프로세스가 새로 뜨면 일시정지 상태로 복원. 길게 눌러 설정으로 가거나 반복 끔 세션이 끝나면 지움

## 이전 산출물

- `pomodoro/dist/com.hun4175.pomodoro.debug.0.1.9.rpk` (이 버전 산출물에서는 제거)
- 크기: 950491 bytes
- SHA256: `001668ccb4cbee86e11abf1e2205088df13b55a28c27e1098f30f625c6cbd730`
- versionName 0.1.9 / versionCode 10
