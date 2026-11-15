# 빌드 정보 — pomodoro 0.1.0

## 산출물 (사실)

- `pomodoro/dist/com.hun4175.pomodoro.debug.0.1.0.rpk`
- 크기: 222619 bytes
- SHA256: `3df77ecd6938bb161b5d0dcfde8569d720c676d414b513f926208e8d730a7ca9`
- package `com.hun4175.pomodoro` · versionName 0.1.0 / versionCode 1
- 빌드: aiot-toolkit 2.0.5 (`npm run build`)
- 서명: aiot-toolkit 2.0.5 내장 디버그 인증서 (CN=localhost, serial B478C65891B3EABF, SHA-256 `4E8E1EE24968B0DAD6D0956A7E14D848B38B22A203F39C389A45D8737BDC4585`)
- rpk 안 `manifest.json`(features: system.storage/vibrator/brightness)과 `common/rings/` PNG 120장, `common/logo.png`가 원본과 바이트 동일함을 확인
- rpk 안 `pages/index/index.js`에 audio/muted/volume 쓰기와 router 이동이 없고, `vibrate({ mode: 'long' })`·`setKeepScreenOn`이 들어 있음을 확인
- 단위 테스트: 25 passed
- 실기기 설치: 하지 않음
