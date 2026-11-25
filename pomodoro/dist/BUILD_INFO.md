# 빌드 정보 — pomodoro 0.1.5

## 산출물 (사실)

- `pomodoro/dist/com.hun4175.pomodoro.debug.0.1.5.rpk`
- 크기: 914827 bytes
- SHA256: `f5e33596f698b329ca7ffb801af13627be44d6a3177bc39163637c0efe1727e5`
- package `com.hun4175.pomodoro` · versionName 0.1.5 / versionCode 6
- 빌드: aiot-toolkit 2.0.5 (`npm run build`)
- 서명: aiot-toolkit 2.0.5 내장 디버그 인증서 (toolkit 기본 `pem/private.pem`, `pem/certificate.pem`)
- rpk 안 `manifest.json`(0.1.5/6)과 `common/booster/*.png` 63장이 원본과 바이트 동일함을 확인. 글꼴 파일(.ttf)은 들어 있지 않음
- 게이지 프레임 37장 합계 724132 bytes (256색 팔레트 PNG), 리소스 전체 884738 bytes
- 단위 테스트: 34 passed
- 실기기 설치: 하지 않음

## 변경

- 휴식 테두리의 꼭짓점을 화면 중심(216,257)으로 옮김. 5시 쪽 변이 5시 방사선(60°)과 일치
- 마지막 집중 칸(5시 바로 위)과 첫 휴식 칸이 다른 칸과 같은 중심·같은 틈의 파이 조각 모양으로 돌아옴
- 라벨·숫자·색·틈 굵기·외곽 테두리는 그대로. 숫자·라벨 오버레이 PNG는 바뀌지 않음

## 이전 산출물

- `pomodoro/dist/com.hun4175.pomodoro.debug.0.1.4.rpk` (이 버전 산출물에서는 제거)
- 크기: 923646 bytes
- SHA256: `2f95caa427815660faacd23d41b68715cc09fc1d8c96ad75acda4476aa32a018`
- versionName 0.1.4 / versionCode 5
