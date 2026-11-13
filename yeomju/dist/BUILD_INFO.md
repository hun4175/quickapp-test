# 빌드 정보 — 2.1.0

## 산출물 (사실)

- `yeomju/dist/com.yeomju.mala.debug.2.1.0.rpk`
- 크기: 58701 bytes
- SHA256: `6cf9d0bf0b809e897a5dfcb1862663e744dbc51c122e08bc02912cf85dff6f67`
- versionName 2.1.0 / versionCode 13
- 단위 테스트: 32 passed

## rpk 내부

| 경로 | bytes |
|------|------|
| pages/index/index.js | 95759 |
| pages/settings/settings.js | 67027 |
| pages/confirm/confirm.js | 34995 |
| common/bead-wood-v3.png | 16864 |
| common/logo.png | 8697 |
| app.js | 4386 |

참조: `BEAD_SRC=/common/bead-wood-v3.png`. 레인/`runModeD`/`runModeE` 문자열 없음.

## 실기기 근거 (2.0.1 Watch 6 글로벌 3.200.085)

- A: 크래시 없음
- D·E: 둘 다 죽음 → **레인 컨테이너 transform 방식 이 기기에서 금지**로 확정
- 1.9.0 실측: 입력·진동 경로(B/C)는 빠름 → A의 다노드 keyframe 시작 비용이 지연 원인으로 **추정**(단정 아님)

## 2.1.0 변경

1. **D·E·레인 완전 제거**: 플랫 리스트만. 설정 칩 A/B/C. `stateSchema≥3`으로 미지원/D/E→A 마이그레이션 유지(`yeomju.state.v2`).
2. **A 경로 개선 시도** (체감 개선은 실기기 미검증):
   - 렌더 구슬 6개(앞3+뒤3), 화면 밖 슬롯 노드 없음
   - 애니 시작 = `animClass` 토글만(`withRollClasses`); 스냅 시 `id`/`src`/배열 길이 유지(`advanceChainBeads`)
   - keyframe: `transform` 단일 속성, 0%/100%만, `linear`, 150ms
   - touchmove 임계(`SWIPE_MIN_DY=22`)에서 즉시 enqueue → 클래스 적용 후 buzz

## 미확인

- 슬라이드 지연·2단 끊김 체감 개선 여부 (**단정하지 않음**)
