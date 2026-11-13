# 빌드 정보 — 2.2.0

## 산출물 (사실)

- `yeomju/dist/com.yeomju.mala.debug.2.2.0.rpk`
- 크기: 59008 bytes
- SHA256: `aed2388435a9be8e5c959139b83cfe12b149856f8887d41c5ced83aa40e99bad`
- versionName 2.2.0 / versionCode 14
- 단위 테스트: 33 passed
- 렌더 노드: **10** (MAX 10). 버퍼 슬롯 2,3,7,8 완전 화면 밖

## rpk 내부

| 경로 | bytes |
|------|------|
| pages/index/index.js | 102192 |
| pages/settings/settings.js | 67027 |
| pages/confirm/confirm.js | 34995 |
| common/bead-wood-v3.png | 16864 |
| common/logo.png | 8697 |
| app.js | 4386 |

레인/`runModeD`/`runModeE` 없음. 플랫 리스트 A 구조.

## 실기기 피드백 → 변경 근거

- 2.1.0: 구슬이 갑자기 사라짐 → 6노드만 렌더해 끝 구슬이 화면 안에서 팝 아웃/인으로 **추정**
- 2.0.1: D·E 레인 transform → 워치 크래시 확정 → 레인 금지 유지

## 2.2.0 변경

- 슬롯 10, `ry=420`, 버퍼 4개 AABB가 화면 밖(bottom≤0 또는 top≥514)
- 슬롯당 1노드(≤10). advance는 슬롯 +dir만 — 화면 안 텔레포트 없음
- 버퍼↔버퍼 전이는 keyframe 생략; IN↔OUT은 동일 150ms linear transform
- opacity 애니 없음

## 버퍼 수치 (432×514)

| slot | left | top | size | right | bottom |
|------|------|-----|------|-------|--------|
| 2 | 191 | -249 | 213 | 404 | -36 |
| 3 | 271 | -241 | 198 | 469 | -43 |
| 7 | 271 | 557 | 198 | 469 | 755 |
| 8 | 191 | 550 | 213 | 404 | 763 |

## 미확인

- 팝 인/아웃 체감 해소 (**단정하지 않음**)
