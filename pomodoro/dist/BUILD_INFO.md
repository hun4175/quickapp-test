# 빌드 정보 — BOOST (pomodoro) 0.1.8

## 산출물 (사실)

- `pomodoro/dist/com.hun4175.pomodoro.debug.0.1.8.rpk`
- 크기: 1280673 bytes
- SHA256: `cc1484fbd40a1603e152450f48f3ba7ecd5452c900a38c557d482dd91b8883fe`
- package `com.hun4175.pomodoro`(변경 없음) · 앱 이름 `BOOST` · versionName 0.1.8 / versionCode 9
- 빌드: aiot-toolkit 2.0.5 (`npm run build`)
- 서명: aiot-toolkit 2.0.5 내장 디버그 인증서 (toolkit 기본 `pem/private.pem`, `pem/certificate.pem`)
- rpk 안 `manifest.json`·`manifest-watch.json`의 name `BOOST`, 0.1.8/9 확인
- rpk 안 `common/logo.png` SHA256 `33cf361ecafa6c5ebc8c4543a71330e70f42c19537a266e7ee3d2bdf0d44c6dd` = `src/common/logo.png` = `docs/icon-design/A/icon-192.png`(192×192, 26554 bytes)
- rpk 안 `common/booster/*.png` 60장, `common/setup/*.png` 52장이 원본과 바이트 동일함을 확인(0.1.7과 같은 리소스). 글꼴 파일(.ttf/.otf)은 들어 있지 않음
- 단위 테스트: 56 passed (`timer.test.mjs`, `project.test.mjs`, `page-sim.test.mjs`)
- 실기기 설치: 하지 않음

## 변경

- 런처 앱 이름을 `뽀모도로` → `BOOST`로 변경(manifest `name`). 패키지명은 그대로라 기존 설치 위에 업데이트되고 저장된 설정값도 유지됨
- 앱 아이콘 `src/common/logo.png`를 확정 시안 A SECTOR(`docs/icon-design/A/icon-192.png`, 검정 바탕 부채꼴 게이지)로 교체. manifest 경로 `/common/logo.png`는 그대로
- `scripts/gen-preview.py`는 토마토 아이콘을 그리는 대신 `docs/icon-design/A/icon-192.png`를 그대로 복사
- 화면·조작·타이머는 0.1.7과 같음(미리보기를 다시 생성해 0.1.7과 바이트 동일함을 확인하고 파일 이름만 0.1.8로 바꿈)

## 이전 산출물

- `pomodoro/dist/com.hun4175.pomodoro.debug.0.1.7.rpk` (이 버전 산출물에서는 제거)
- 크기: 1255576 bytes
- SHA256: `ecde0b274c7033f0c41ff78effae5a257c9dd4cc887918dfb4cb9bdb75c7b764`
- versionName 0.1.7 / versionCode 8
