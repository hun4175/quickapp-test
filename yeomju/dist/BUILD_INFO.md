# 빌드 정보 — 1.6.0

## 패키지

- versionName: `1.6.0`
- versionCode: `7`
- package: `com.yeomju.mala`

## 산출물 (사실)

- 파일: `yeomju/dist/com.yeomju.mala.debug.1.6.0.rpk`
- 크기: 80533 bytes
- SHA256: `0840d15c1a89cfce2bec502771eb3032921fa650da6f98573a88ab5b6fbb7d94`

## 1.6.0 구조

- 체인 슬롯 **8개** (타원 등분). 구슬마다 `roll-next-i` / `roll-prev-i` → translate+scale 키프레임(중간 50%로 타원 근사)
- 애니 중 left/top/size JS 재바인딩 없음. 종료 시 슬롯 인덱스·기하만 스냅
- 메인 HUD 숨김(Today/카운트/Lap/설정/힌트 미렌더). 카운트·저장 로직 유지
- 설정 진입: **longpress** (화면 가리는 버튼 없음)
- wood 240px 단일. 180ms ease-out. 양방향 스와이프·pending·진동 유지

## 미리보기

- `yeomju/docs/preview-1.6.0.png` (전/중/후, 라벨은 프레임 위 여백)
- `yeomju/docs/preview-swipe-before.png` / `mid` / `after`

## 미확인

- 1.6.0 실기기 체인 체감·버벅임 (단정하지 않음)
- longpress 설정 진입 실기기 감도
