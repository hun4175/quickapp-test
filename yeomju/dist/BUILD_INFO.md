# 빌드 정보 — 1.7.0

## 산출물 (사실)

- `yeomju/dist/com.yeomju.mala.debug.1.7.0.rpk`
- 크기: 81310 bytes
- SHA256: `70c27ffb0ef92a548d1a114cf292d94963e1f7784d0c2c4fa27e6dd6f24c1303`
- versionName 1.7.0 / versionCode 8

## 2단 이동 원인 (코드 근거)

1.6.0 `buildChainKeyframeCss` 가 모든 구슬에 `0% / 50% / 100%` 키프레임 + `animation-timing-function: ease-out` 을 넣음.
CSS는 **키프레임 구간마다** timing function을 다시 적용하므로 0→50에서 ease-out 감속 후 50→100에서 다시 가속 → \"두 번에 걸쳐 이동\" 체감.

## 1.7.0 변경

- 앞열 직선(depth 높은 구간): `0→100%` 한 구간 + 단일 `ease-out`
- 가장자리 곡선: `0/25/50/75/100` + `linear`, 위치는 `easeOutCubic` 베이크
- duration **240ms**, scale 범위 축소(min 140 / max 228)
- 화면 밖 전환은 `shouldAnimateTransition` 으로 클래스 생략 가능
- 스냅: `transformAtProgress(...,1)` ≡ to 슬롯 (`snapMatchesEndKeyframe`)
- 굴림당 클래스 부여 1회, 종료 시 기하+클래스 클리어 1회
- HUD 숨김 / longpress / 양방향 / pending / 진동 유지

## 미리보기

- `yeomju/docs/preview-1.7.0.png` (0/25/50/75/100%)

## 미확인

- 실기기 2단 이동·프레임감 개선 여부 (단정하지 않음)
