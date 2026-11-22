# 빌드 정보 — pomodoro 0.1.4

## 산출물 (사실)

- `pomodoro/dist/com.hun4175.pomodoro.debug.0.1.4.rpk`
- 크기: 923646 bytes
- SHA256: `2f95caa427815660faacd23d41b68715cc09fc1d8c96ad75acda4476aa32a018`
- package `com.hun4175.pomodoro` · versionName 0.1.4 / versionCode 5
- 빌드: aiot-toolkit 2.0.5 (`npm run build`)
- 서명: aiot-toolkit 2.0.5 내장 디버그 인증서 (toolkit 기본 `pem/private.pem`, `pem/certificate.pem`)
- rpk 안 `manifest.json`(0.1.4/5)과 `common/booster/*.png` 63장, `common/logo.png`가 원본과 바이트 동일함을 확인. 글꼴 파일(.ttf)은 들어 있지 않음
- 게이지 프레임 37장 합계 732924 bytes (256색 팔레트 PNG), 리소스 전체 893530 bytes
- 단위 테스트: 34 passed
- 실기기 설치: 하지 않음

## 변경

- 디자인 기준을 `docs/booster-design/v11/gen_v11.py`로 교체: 색·선·글로우, 뾰족한 휴식 테두리 끝, 꺾인 밑줄, 노란 휴식 마지막 칸
- 라벨은 Barlow Semi Condensed ExtraBold Italic(SIL OFL 1.1)을 PNG에 구움
- 오버레이 좌표(`scripts/booster-layout.json`)와 CSS 갱신, 일시정지 막대 색을 숫자와 같은 웜화이트(#fffcf4)로
- 조작, 끝시각 기반 타이머, `@system.storage` 저장, 진동(long 3회, 0.5초 간격)은 그대로

## 이전 산출물

- `pomodoro/dist/com.hun4175.pomodoro.debug.0.1.3.rpk` (이 버전 산출물에서는 제거)
- 크기: 972645 bytes
- SHA256: `5672663cf06ceb4e5879640ae2a623a01ed52936c4f018322e45575721d33348`
- versionName 0.1.3 / versionCode 4
