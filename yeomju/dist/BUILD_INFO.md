# 빌드 정보 — 1.5.0

## 패키지

- versionName: `1.5.0`
- versionCode: `6`
- package: `com.yeomju.mala`
- 빌드: `cd yeomju && npm run build` (aiot-toolkit 2.0.5)

## 산출물 (사실)

- 파일: `yeomju/dist/com.yeomju.mala.debug.1.5.0.rpk`
- 크기: 79411 bytes
- SHA256: `57bf405bcf1ccafdc781a8fbc2a415868d6da450daeb9a9b4476715b00f918ba`

## 1.5.0 렌더 구조 (1.4.0 대비)

| 항목 | 1.4.0 | 1.5.0 |
| --- | --- | --- |
| 그리는 구슬 | 앞3+뒤5(=8), animExtra 시 더 | 앞3+뒤3(=6) 고정 |
| 프레임 갱신 | 굴림마다 left/top/size/opacity/src 재바인딩 + 포커스 플래시 | 슬롯 좌표 고정. 레인 2개에 `@keyframes` translate 클래스만 on/off |
| 이미지 | wood+gem+focus-arc (256px) | wood만 240px. gem/arc 제거 |
| 포커스 UI | 옥 구슬 + 흰 링 + 번쩍 | 없음 (전부 동일 나무) |
| HUD | rgba 반투명 | 불투명 단색 |
| 애니 | 180ms 오버슈트 키프레임 | 160ms 단순 ease-out |
| 입력 큐 | pendingDirs 유지 | 동일 |
| 진동 | 이동 시작 시 | 동일 |

## 미리보기

- `yeomju/docs/preview-1.5.0.png` (전/중/후 가로 스트립)
- `yeomju/docs/preview-swipe-before.png` / `mid` / `after`

## 미확인

- 1.5.0 실기기 버벅임 개선 여부 (단정하지 않음)
