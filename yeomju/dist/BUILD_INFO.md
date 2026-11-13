# 빌드 정보 — 2.0.1 (안정화)

## 산출물 (사실)

- `yeomju/dist/com.yeomju.mala.debug.2.0.1.rpk`
- 크기: 60459 bytes
- SHA256: `b7b2868f3aecd3490fb928c11b52299ee03ba02d2601547bdc6bebeca4bc73ba`
- versionName 2.0.1 / versionCode 12
- 단위 테스트: 32 passed

## rpk 내부

| 경로 | bytes |
|------|------|
| pages/index/index.js | 126917 |
| pages/settings/settings.js | 70481 |
| pages/confirm/confirm.js | 35237 |
| common/bead-wood-v3.png | 16864 |
| common/logo.png | 8697 |
| app.js | 4386 |

참조: `BEAD_SRC=/common/bead-wood-v3.png`. v2 없음.

## 크래시 원인 후보 (코드 근거) — 해결 단정 안 함

1. **Mode E 레인 컨테이너**: `.lane` 432×514, `translateY` ±209(앞)/±150(뒤). 구슬은 슬롯상 top≈-145~455·size≤228로 **컨테이너 밖으로 넘침**. overflow 자식을 포함한 레이어가 애니 시 GPU 비트맵으로 확대되면 메모리 폭증 가능.
2. **스냅·레인 재분배**: `applyBeads` → `splitChainLanes`로 front/back 배열을 매번 새로 만들어 두 `for` 리스트 재바인딩.
3. **Mode D 타이머**: `setTimeout` 체인이었음(setInterval 아님). `onHide` 없음 → 페이지 이탈 후에도 틱 가능. 2.0.1에서 `onHide`/`clearAnimTimers`·틱 가드·중복 타이머 clear 추가.
4. **큐**: pending+animQueue 상한 없음 → 연속 입력 폭주 가능. 2.0.1에서 `MAX_PENDING=2`.

## 2.0.1 조치

- **기본 모드 A**, 템플릿은 A/B/C에서 **플랫 리스트**(1.8 구조). 레인은 D/E만.
- 저장 키 `yeomju.state.v2`. `stateSchema<2` 시 E/D→A 마이그레이션 후 저장.
- D/E 설정 표기: 실험 / 실험(위험).
- 구슬 `bead-wood-v3.png` 16864B, logo 팔레트 8697B.

## 미확인

- 실기기 크래시 해소 여부 (**단정하지 않음**)
