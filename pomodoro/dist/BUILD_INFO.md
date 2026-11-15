# 빌드 정보 — pomodoro 0.1.1

## 산출물 (사실)

- `pomodoro/dist/com.hun4175.pomodoro.debug.0.1.1.rpk`
- 크기: 16797 bytes
- SHA256: `09773d8a3ddb473609bae6910737a6e6af26dc6bc52b1a081c1a5ba8f32b866f`
- package `com.hun4175.pomodoro` · versionName 0.1.1 / versionCode 2
- 빌드: aiot-toolkit 2.0.5 (`npm run build`)
- 서명: aiot-toolkit 2.0.5 내장 디버그 인증서 (CN=localhost, serial B478C65891B3EABF, SHA-256 `4E8E1EE24968B0DAD6D0956A7E14D848B38B22A203F39C389A45D8737BDC4585`)
- rpk 안 `manifest.json`(features: system.storage/vibrator/brightness)과 `common/logo.png`가 원본과 바이트 동일함을 확인. 링 PNG는 포함되지 않음
- rpk 안 `pages/index/index.js`에 `fillHeight`·`adjustFocus`·`classifySwipe`·`setKeepScreenOn`·`vibrate({ mode: 'long' })`가 있고, audio/muted/volume 쓰기와 router 이동·링 경로가 없음을 확인
- 단위 테스트: 30 passed
- 실기기 설치: 하지 않음

## 변경

- 원형 링 프레임을 제거하고, 화면 전체가 위에서 아래로 비워지는 모래시계 UI로 교체
- 대기 중 위·아래 스와이프로 집중 시간 5~60분(5분 단위) 설정, 휴식 5분 고정
- 색 영역은 단일 div의 height style 바인딩(1초마다 갱신)

## 이전 산출물

- `pomodoro/dist/com.hun4175.pomodoro.debug.0.1.0.rpk` (디버그 서명, 이 버전 산출물에서는 제거)
- 크기: 222619 bytes
- SHA256: `3df77ecd6938bb161b5d0dcfde8569d720c676d414b513f926208e8d730a7ca9`
- versionName 0.1.0 / versionCode 1
