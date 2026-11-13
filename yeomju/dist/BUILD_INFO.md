# 빌드 정보 — 2.8.2

## 산출물 (사실)

- `yeomju/dist/com.yeomju.mala.debug.2.8.2.rpk`
- 크기: 987367 bytes
- SHA256: `d37077b4021ef177cf027a7394314520dae35698d5cbabbdf3e67b4879ad7bb0`
- versionName 2.8.2 / versionCode 34
- 단위 테스트: 39 passed

## 변경

- 「원만 성취」문구 제거 · cele-glow + 카운트 반짝임 · 해금 안내 유지
- 달성 진동: long(1000ms)×2 @ 0/1000ms ≈ 2초 · onHide 타이머 정리
- 설정 `횟수 표시` 제거 · showCount 항상 true (schema 16)

## 진동 근거

- Quick App: long=1000ms, short=35ms
  https://developer.huawei.com/consumer/cn/doc/quickapp-api-vibrator
- Watch 6: vibrate만 지원 (start/stop 미지원)

## 프리뷰

- `docs/preview-2.8.2-main.png`
- `docs/preview-2.8.2-settings.png`
