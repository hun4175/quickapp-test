# 빌드 정보 — pomodoro 0.1.3

## 산출물 (사실)

- `pomodoro/dist/com.hun4175.pomodoro.debug.0.1.3.rpk`
- 크기: 972645 bytes
- SHA256: `5672663cf06ceb4e5879640ae2a623a01ed52936c4f018322e45575721d33348`
- package `com.hun4175.pomodoro` · versionName 0.1.3 / versionCode 4
- 빌드: aiot-toolkit 2.0.5 (`npm run build`)
- 서명: aiot-toolkit 2.0.5 내장 디버그 인증서 (toolkit 기본 `pem/private.pem`, `pem/certificate.pem`)
- rpk 안 `manifest.json`(0.1.3/4)과 `common/booster/*.png` 63장(게이지 g00~g36, 숫자 m0~m9·s0~s9, colon, focus, rest, hint-up/text/down), `common/logo.png`가 원본과 바이트 동일함을 확인
- 게이지 프레임 37장 합계 803558 bytes (256색 팔레트 PNG), 리소스 전체 942192 bytes
- 단위 테스트: 33 passed
- 실기기 설치: 하지 않음

## 변경

- 화면을 부스터 계기판으로 교체: 게이지는 켜진 칸 수(0~36)별 전체 화면 PNG의 단일 `image` `src` 교체, 숫자·라벨·힌트는 투명 PNG 겹침
- 모래시계 `div`, 화살표 PNG(`arrow-up/down.png`) 제거
- 조작, 끝시각 기반 타이머, `@system.storage` 저장, 진동(long 3회, 0.5초 간격)은 그대로

## 이전 산출물

- `pomodoro/dist/com.hun4175.pomodoro.debug.0.1.2.rpk` (이 버전 산출물에서는 제거)
- 크기: 18141 bytes
- SHA256: `72876d1e257e64d558b3f7cb10c765dda81f27f7c6ce7deffe2c3cafdc9bdd8a`
- versionName 0.1.2 / versionCode 3
