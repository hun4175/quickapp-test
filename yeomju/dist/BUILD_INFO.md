# 빌드 정보 — 2.5.0 (스프라이트 렌더 모드 S/S2)

## 산출물 (사실)

- `yeomju/dist/com.yeomju.mala.debug.2.5.0.rpk`
- 크기: 270339 bytes
- SHA256: `be2f01d69fc985a86e8c69e85e940bbb895d84d66336e41d65628ec963d10c27`
- versionName 2.5.0 / versionCode 23
- 단위 테스트: 39 passed
- 스프라이트 프레임 합계: 166620 bytes (PNG8 · 크롭 347×514)
  - idle 28000 · next-1/2 35331/34129 · prev-1/2 33866/35294
- 프리뷰: `docs/preview-2.5.0-sprite-idle.png`, `-mid.png`, `-compare.png`

## 2.5.0 변경

1. 기본 렌더 **S**: 빌드타임 합성 PNG8 프레임 + `image-animator` 1개 (정지 시 image 1장)
2. **S2**: 단일 image src 프레임 스왑 (animator 대체)
3. **L**: 기존 노드 CSS 키프레임 (설정>진단에서 전환)
4. 방향별 4프레임/150ms · 첫·끝=idle(픽셀 동일)
5. 진단 타이밍(end→set 등) 유지 · 비교용 `rm=` 표시
6. Vela `image-animator` onstop 미지원 → duration 타이머로 종료

## 미확인

- 실기기에서 end→set/체감 변화 (**단정하지 않음**)
