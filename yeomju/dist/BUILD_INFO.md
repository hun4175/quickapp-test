# 빌드 정보 — 2.8.0 (목표 횟수 · 금박 해금)

## 산출물 (사실)

- `yeomju/dist/com.yeomju.mala.debug.2.8.0.rpk`
- 크기: 934078 bytes
- SHA256: `2b5d202e24cd9c8b19e5364f6f0f335ff8811067789573da6ab2a28345f33d05`
- versionName 2.8.0 / versionCode 32
- 단위 테스트: 37 passed

## 변경

- 목표 횟수 21/54/108/1080 (기본 21, schema 15)
- 목표 배수마다 축하: `vibrator.vibrate({ mode: 'long' })` + 카운트 금색 반짝임
- 카운트 계속 증가 · 배수마다 재축하
- 금박 나무: 1080 도달 시 해금·자동 전환 · 초기화해도 해금 유지
- manifest `system.vibrator` 유지 (이미 선언)

## 진동 API

- `import vibrator from '@system.vibrator'`
- `vibrator.vibrate({ mode: 'long' | 'short' })`
- 근거: https://iot.mi.com/vela/quickapp/zh/features/system/vibrator.html
- REDMI Watch 6: `vibrate` 지원 · `start`/`stop` 미지원 → 미사용
- try/catch로 실패 무시

## 프리뷰

- `docs/preview-2.8.0-main.png`
- `docs/preview-2.8.0-settings.png`

## 미확인

- 실기기 축하 진동·해금 UX (**단정하지 않음**)
