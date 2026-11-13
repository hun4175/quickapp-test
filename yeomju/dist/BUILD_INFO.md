# 빌드 정보 — 2.3.0

## 산출물 (사실)

- `yeomju/dist/com.yeomju.mala.debug.2.3.0.rpk`
- 크기: 59748 bytes
- SHA256: `69133bc7fb42f7b30a1932743809fd16a90eef9591a72749ee0c9f3ea8998b9e`
- versionName 2.3.0 / versionCode 15
- 단위 테스트: 32 passed
- 렌더 노드: **12** (MAX 12)

## rpk 내부

| 경로 | bytes |
|------|------|
| pages/index/index.js | 110783 |
| pages/settings/settings.js | 67027 |
| pages/confirm/confirm.js | 34995 |
| common/bead-wood-v3.png | 16864 |
| common/logo.png | 8697 |
| app.js | 4386 |

`transformOrigin: "0px 0px"`. 레인 없음.

## 덜컥임 원인 후보 (코드 확인)

1. **반올림·origin 불일치 (주 후보)**: keyframe `tx=to.cx-from.cx` + `transform-origin: center`인데 슬롯 `left=round(x-size/2)`라 시각 left와 스냅 left가 **최대 1px** 어긋남(2.2.0에서 실측).
2. **scale vs width/height**: 애니는 scale, 스냅은 width/height — origin 틀리면 박스 모서리도 어긋남.
3. **클래스 제거→위치 반영 분리**: 클래스만 먼저 지우면 from 좌표가 한 프레임 노출 가능 → 2.3.0은 left/top/size+animClass=''를 **한 할당**.
4. **fill-mode forwards**: 유지. 스냅 후 클래스 제거 시 이미 슬롯=끝 픽셀이면 점프 없음.

## 2.3.0 조치

- `slotGeomAtAngle` 정수 left/top/size/cx/cy 단일 경로 (`left = cx - floor(size/2)`)
- `endKeyframeTransform`: `tx=to.left-from.left`, `ty=to.top-from.top`, `scale=to.size/from.size` (origin 0 0)
- 앞열 간격: n=12, ry=430 → 중심거리 **215.59** / 평균지름 **226.5** → 비 **0.952**
- 버퍼 OUT: 2,3,4,8,9,10 · on-screen 0,1,5,6,7,11
- z 뒤→앞 정렬, 포커스 최상단

## 미확인

- 덜컥·간격 체감 (**단정하지 않음**)
