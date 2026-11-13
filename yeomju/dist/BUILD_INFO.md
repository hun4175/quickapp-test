# 빌드 정보 — 1.8.0

## 산출물 (사실)

- `yeomju/dist/com.yeomju.mala.debug.1.8.0.rpk`
- 크기: 81619 bytes
- SHA256: `297801fdb4a5a2199a43dbe56245f70136d4affa9e85b71c9a1da6fe6eea6f84`
- versionName 1.8.0 / versionCode 9
- 단위 테스트: 31 passed

## 1.7.0 지연 원인 (코드 근거)

1. **touchend 대기**: `index.ux` `onTouchEnd` 에서만 `classifyVerticalSwipe` → 손 뗄 때까지 애니 시작 없음.
2. **애니 전 동기 작업**: `advanceOnce` 가 `queueSave` → `buzz`(vibrator) → 그 다음 `_animQueue`/`ensureChainAnim`. 진동·storage가 클래스 부여보다 앞.
3. **pending 큐**: `_animating` 중이면 `_animQueue` 에 쌓여 이전 애니(`CHAIN_ANIM_MS`) 종료 후 다음 시작 — 연속 스와이프 시 체감 지연.
4. **임계값**: `SWIPE_MIN_DY=40` 으로 판정까지 이동량 큼.
5. **duration**: 240ms.

(리플로우용 클래스 제거→`setTimeout` 재추가는 1.7에 없었음.)

## 아래 구슬 지연 원인 (코드 근거)

1.7.0 `buildChainKeyframeCss`: `isCurveTransition` 분기.
- 앞열 직선: `0%→100%` + `animation-timing-function: ease-out`
- 가장자리/전환: `0/25/50/75/100` + `linear` + 위치 `easeOutCubic` 베이크

같은 wall-clock `t` 에서 CSS ease-out 진행률 ≠ 베이크드 linear 진행률 → 전면 위·중앙과 아래(전환) 구슬 속도 곡선 불일치.

## 1.8.0 변경

- **입력**: `ontouchmove` 에서 `|dy|≥SWIPE_MIN_DY` 순간 1회 트리거, `_gestureFired` 로 손 뗄 때까지 재트리거 금지; `touchend` 는 미발사 보완만.
- **순서**: 애니 클래스 일괄 적용 → `buzz` → `queueSave` 디바운스(280ms).
- **일체감**: 전 구슬 `SHARED_KEYFRAME_PCTS` + `linear` + `pathProgressAtTime`(easeOutCubic 베이크) + `delay:0` + duration 190ms.
- `SWIPE_MIN_DY` 40→**22**, `CHAIN_ANIM_MS` 240→**190**.
- HUD 숨김 / longpress 설정 / 양방향 / 카운트 모드 / pending / 진동 유지.

## 미리보기

- `yeomju/docs/preview-1.8.0.png` (0/25/50/75/100%)

## 미확인

- 실기기 반응성·일체감 개선 여부 (단정하지 않음)
