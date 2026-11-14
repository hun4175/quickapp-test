# 빌드 정보 — minidrum 0.1.1

## 산출물 (사실)

- `minidrum/dist/com.hun4175.minidrum.debug.0.1.1.rpk`
- 크기: 49948 bytes
- SHA256: `fb354cdb9f09b0dfb1d8b20f088df869a7cfa23a2232ba9229687c686e705134`
- package `com.hun4175.minidrum` · versionName 0.1.1 / versionCode 2
- 빌드: aiot-toolkit 2.0.5 (`npm run build`)
- 서명: aiot-toolkit 2.0.5 내장 디버그 인증서 (CN=localhost, serial B478C65891B3EABF, SHA-256 `4E8E1EE24968B0DAD6D0956A7E14D848B38B22A203F39C389A45D8737BDC4585`)
- rpk 안 `manifest.json`(features: system.audio/vibrator)과 `common/sounds/{kick,snare,hihat,crash}.wav` 4개가 원본과 바이트 동일함을 확인
- rpk 안 `pages/index/index.js`에 `muted`·`volume` 쓰기와 예열 코드가 없음을 확인
- 단위 테스트: 12 passed
- 실기기 설치: 하지 않음
