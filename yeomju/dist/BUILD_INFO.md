# 빌드 정보 — 2.4.1 (진단)

## 산출물 (사실)

- `yeomju/dist/com.yeomju.mala.debug.2.4.1.rpk`
- 크기: 60881 bytes
- SHA256: `55627bd51965c229bc9f7229b710e84e55acecdced5cf8bea179c01a779bca2f`
- versionName 2.4.1 / versionCode 18
- 단위 테스트: 31 passed
- 시각: 2.3.1/2.4.0 기하 유지 (커버리지 diff=0)

## 탭→첫 애니 경로 분석 (코드 근거)

| 단계 | 2.4.0 경로 | 지연 후보 |
|------|-----------|----------|
| 1 | 탭 = **touchend** (click 아님) | OK |
| 2 | 같은 노드에 **`onlongpress`** | Vela가 롱프레스 판정(~0.5–1s) 끝날 때까지 touchend를 늦출 수 **높은 가능성** |
| 3 | `this.chainBeads = withRollClasses(...)` | **10개 객체 전체 교체**(src·left·top·size 포함) → for diff·이미지 재바인딩·재레이아웃 가능 |
| 4 | `for="{{chainBeads}}"` | 리스트 diff 비용 |
| 5 | keyframe 클래스 교체 | 노드별 스타일 재계산(필요악) — 버퍼는 `''` 유지 |

## 2.4.1 변경

1. **`onlongpress` 제거** → touchstart에서 560ms 타이머, touchend에서 즉시 탭(타이머 clear)
2. **정적 10노드** (for 루프 제거), 기하·src는 초기화 후 고정
3. **animClass만** `a0`…`a9` 개별 대입 (`animClassesForDrawOrder`)
4. 진단 토글: P1(touchstart 점), P2(클래스 직후 점)+ms
5. 단일 구슬 테스트: 포커스(home 0)만 keyframe

## 진단 사용법

1. 설정 → 진단 **켜기** → 뒤로
2. 탭/슬라이드: 좌상단 점 P1(시작)→P2(클래스) 색 변화, `P1:0 P2:NNms` 텍스트
3. P1이 바로 안 바뀌면 이벤트 전달 지연; P1 즉시·P2~1s면 렌더/애니 시작 병목
4. 단일 구슬 켜고 비교 → 노드/이미지 수 영향 확인

## 미확인

- ~1초 지연 해소 (**단정하지 않음**)
