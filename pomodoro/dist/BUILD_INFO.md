# 빌드 정보 — pomodoro 0.1.2

## 산출물 (사실)

- `pomodoro/dist/com.hun4175.pomodoro.debug.0.1.2.rpk`
- 크기: 18141 bytes
- SHA256: `72876d1e257e64d558b3f7cb10c765dda81f27f7c6ce7deffe2c3cafdc9bdd8a`
- package `com.hun4175.pomodoro` · versionName 0.1.2 / versionCode 3
- 빌드: aiot-toolkit 2.0.5 (`npm run build`)
- 서명: aiot-toolkit 2.0.5 내장 디버그 인증서 (CN=localhost, serial B478C65891B3EABF, SHA-256 `4E8E1EE24968B0DAD6D0956A7E14D848B38B22A203F39C389A45D8737BDC4585`)
- rpk 안 `manifest.json`과 `common/logo.png`, `common/arrow-up.png`, `common/arrow-down.png`가 원본과 바이트 동일함을 확인
- rpk 안 `pages/index/index.js`에 화살표 PNG·`backColor`·`COLOR_EMPTY`·`setKeepScreenOn`이 있고, audio/muted/volume 쓰기와 router 이동이 없음을 확인
- 단위 테스트: 32 passed
- 실기기 설치: 하지 않음

## 변경

- 대기 화면에만 시간 위·아래 화살표 인디케이터(PNG). 60분이면 ▲, 5분이면 ▼를 흐리게 표시
- 집중 구간에서 빨간색이 줄어든 위쪽은 다음 휴식 색(초록)으로 채움
- 휴식 구간에서 초록이 줄어든 위쪽은 검정으로 둠

## 이전 산출물

- `pomodoro/dist/com.hun4175.pomodoro.debug.0.1.1.rpk` (이 버전 산출물에서는 제거)
- 크기: 16797 bytes
- SHA256: `09773d8a3ddb473609bae6910737a6e6af26dc6bc52b1a081c1a5ba8f32b866f`
- versionName 0.1.1 / versionCode 2
