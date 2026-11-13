# 빌드 정보 — 2.5.1 (S2 고정 · 고품질 프레임 · 뒷줄 밀도)

## 산출물 (사실)

- `yeomju/dist/com.yeomju.mala.debug.2.5.1.rpk`
- 크기: 883126 bytes
- SHA256: `e8f130f31fa4a6fbade613ac8fa81c9a9630444468325c9704254902e43aa50e`
- versionName 2.5.1 / versionCode 24
- 단위 테스트: 31 passed

## 스프라이트 프레임 (PNG32 · LANCZOS)

| 파일 | bytes |
|------|------:|
| idle.png | 163646 |
| next-1.png | 167769 |
| next-2.png | 166424 |
| prev-1.png | 165985 |
| prev-2.png | 167373 |
| **합계** | **831197** |

- 원본: `scripts/assets/bead-new-src.png` (2048×2048 RGBA, rpk 미포함)
- 크롭: 347×514
- 기하: slotCount=11 · backCount=6 · 앞줄 focus gap≈0.981 유지

## 2.5.1 변경

1. 렌더 **S2만** (image-animator/S, 노드/L, E1–E9, 표시수 제거)
2. 설정: 입력 방식 + 타이밍 표시 on/off(기본 off, off 시 계측 비용 0)
3. 고품질 단일 원본 LANCZOS → 풀컬러 PNG 프레임
4. 뒷줄 구슬 밀도↑ (간격비≈0.981), 첫·끝=idle 픽셀 동일
5. 미사용 bead-front/back/wood 런타임 자산 삭제

## 크기 대안 (제안만 · 미적용)

- PNG8/적응형 팔레트: 이전 2.5.0 ~167KB 합계 수준까지 축소 가능하나 열화 있음
- WebP/압축 레벨·크롭 강화: 플랫폼 지원·품질 확인 후

## 미확인

- 실기기 체감 (**단정하지 않음**)
