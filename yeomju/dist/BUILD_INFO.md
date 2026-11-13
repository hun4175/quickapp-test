# 빌드 정보 — 2.8.1 (현재/목표 · 달성 리셋 · 축하 오버레이)

## 산출물 (사실)

- `yeomju/dist/com.yeomju.mala.debug.2.8.1.rpk`
- 크기: 987376 bytes
- SHA256: `aec4c3b93e0c77dcc66a7f7d283e5b552c92b6a72d2d164027cd5b3bbc55bec2`
- versionName 2.8.1 / versionCode 33
- 단위 테스트: 38 passed
- cele-glow.png: 53404 bytes

## 변경

- 카운트 `현재 / 목표` (48px bold + 28px dim)
- 목표 달성 → todayTotal 0 리셋 (배수 재축하 제거)
- 금박 해금: goalCount===1080 달성 시에만
- 목표 변경 시 카운트 0
- 축하: 단일 PNG 오버레이 opacity 전환 + 「원만 성취」문구 · ~1.2s · 입력 비차단

## 미확인

- 실기기 오버레이·1080/1080 레이아웃 (**단정하지 않음**)
