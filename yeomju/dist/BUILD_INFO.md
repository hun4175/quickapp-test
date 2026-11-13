# 빌드 정보 — 1.4.0

## 패키지

- versionName: `1.4.0`
- versionCode: `5`
- package: `com.yeomju.mala`
- 빌드: `cd yeomju && npm run build` (aiot-toolkit 2.0.5)

## 산출물 (사실)

- 파일: `yeomju/dist/com.yeomju.mala.debug.1.4.0.rpk`
- 크기: 124258 bytes
- SHA256: `7751d245f3eaf1c88cfe808fec15407373cab7bd3b43fc8deccf6e9d02813e4d`

## 1.4.0 변경 요약

- 체인 전체 한 칸 이동 + 앞/뒤열 반대 방향
- 조작: **위/아래 스와이프만** (탭 카운트 제거). `touchstart`/`touchend` + `SWIPE_MIN_DY=40`
- 카운트: `SWIPE_COUNT_MODE='plus_both'` (양방향 +1). `down_undo` 로 전환 가능
- 애니메이션 ~180ms, 키프레임 오버슈트, 포커스 번쩍, 진동은 이동 시작 시
- 소리 미포함

## 오디오 API (문서 조사, 미구현)

- 문서: https://iot.mi.com/vela/quickapp/en/features/other/audio.html
- `@system.audio` — `play`/`pause`/`stop`, `src`, volume 등
- `streamType: voicecall` 은 시계·밴드 미지원 (music 기본)
- REDMI Watch 6 FAQ 에 미디어 볼륨·음악 재생 UI 존재
- **퀵앱에서 Watch 6 실기기 오디오 동작은 미검증. 1.4.0 미사용**

## 제스처 충돌 (미확인)

- 좌우 스와이프는 앱에서 무시. 시스템 오른쪽 스와이프 뒤로가기와 **충돌 가능성은 실기기 미검증**
- 설정/확인 페이지만 `onswipe right` → `router.back()`

## 미리보기 PNG (시뮬레이션, 실기기 스크린샷 아님)

- `yeomju/docs/preview-swipe-before.png`
- `yeomju/docs/preview-swipe-mid.png`
- `yeomju/docs/preview-swipe-after.png`
