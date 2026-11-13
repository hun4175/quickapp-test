# 빌드 정보 — 1.9.0 (진단)

## 산출물 (사실)

- `yeomju/dist/com.yeomju.mala.debug.1.9.0.rpk`
- 크기: 169482 bytes
- SHA256: `3214ea0fed52f72782a8e74aa2f3190c84a6fd5a4f316e36e6e399d8bfefe2a4`
- versionName 1.9.0 / versionCode 10
- 단위 테스트: 34 passed

## 자산 교체

- `yeomju/src/common/bead-wood.png` — 240×240 RGBA, **91537** bytes (신규 나무 구슬)
- `yeomju/src/common/logo.png` — 192×192 RGBA, **43511** bytes (신규 아이콘, manifest `/common/logo.png`)
- `yeomju/docs/preview-1.9.0.png`, `yeomju/docs/icon-preview.png`
- 이전 구슬/아이콘 바이트는 동일 경로에 덮어씀 → rpk에 구버전 잔존 없음

## 2단 이동·지연 후보 (코드 근거)와 수정

| 후보 | 1.8.0 근거 | 1.9.0 Mode A 수정 |
|------|-----------|-------------------|
| 종료 스냅+클래스 제거 | `advanceChainBeads`가 left/top/size와 `animClass:''`를 **한 map**에서 처리 → 동일 할당 | 유지 |
| 연속 굴림 클리어→재적용 | `advance` 후 `ensureChainAnim`이 **두 번** 바인딩 → 원점(transform 0) 1프레임 가능 | `advanceChainBeadsWithAnim`으로 스냅+다음 클래스를 **한 할당** |
| setTimeout vs 애니 | `setTimeout(CHAIN_ANIM_MS)`만 사용. 타이머가 CSS보다 빠르면 중도 스냅→2단 | `CHAIN_ANIM_MS + CHAIN_ANIM_END_SLACK_MS(16)`. animationend 미사용(플랫폼 불확실) |
| fill-mode | `forwards` 이미 적용 | 유지 |
| 다중 노드 클래스 | `chainBeads = map(...)` 단일 할당 | 유지 |

입력 지연(touchmove 임계·큐)은 1.8 경로 유지. Mode B로 입력만 분리 체감.

## 애니 모드 (설정 → 애니 모드)

길게 눌러 설정. 기본 **A**.

- **A** 키프레임(수정) — 위 버그 수정본
- **B** 애니 없음 — 즉시 스냅
- **C** 컨테이너 이동 — `ring-mover` 하나 `translateY` ±209px
- **D** JS 프레임 — 24ms 간격, 깊이 상위 6구슬 스타일 갱신

## 지연 디버그

설정 → 지연 디버그 켜기. 메인 좌상단에 `터치→시작 Nms`, `애니 Nms` (Date.now).

## 미확인

- 실기기에서 어느 모드가 나은지, 디버그 ms 수치 (**단정하지 않음**)
