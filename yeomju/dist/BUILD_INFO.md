# 빌드 정보 — 2.5.2 (컷 알파 소스 · JPG 프레임)

## 산출물 (사실)

- `yeomju/dist/com.yeomju.mala.debug.2.5.2.rpk`
- 크기: 336774 bytes
- SHA256: `e4085879ec8cd2b04e46da33749bb4621b1781f8735fbc7c8cc0ec5ed4b8a1cb`
- versionName 2.5.2 / versionCode 25
- 단위 테스트: 31 passed

## 스프라이트 프레임 (JPG q90 · 4:4:4 · 기본)

| 파일 | bytes |
|------|------:|
| idle.jpg | 56334 |
| next-1.jpg | 57797 |
| next-2.jpg | 57535 |
| prev-1.jpg | 57560 |
| prev-2.jpg | 57815 |
| **합계** | **287041** |

## PNG32 비교용 (rpk 미포함 · `scripts/out/sprite-png32/`)

| 파일 | bytes |
|------|------:|
| idle.png | 264177 |
| next-1.png | 273202 |
| next-2.png | 271634 |
| prev-1.png | 271711 |
| prev-2.png | 273247 |
| **합계** | **1353971** |

- JPG 합계 287041 vs PNG32 합계 1353971 (약 4.7× 작음)
- 2.5.1 rpk 883126 → 2.5.2 rpk 336774

## 소스·기하

- 원본: `scripts/assets/bead-src-cut.png` (1200×1200 RGBA, 원형 AA 알파, 외부 투명, rpk 미포함)
- 배경: `(12,10,8)` 합성 · 후광·회색 사각·워터마크 없음
- 크롭: 346×514
- 기하: slotCount=11 · backCount=6 · 앞줄 focus gap≈0.981 · focus size 255 (2.3.1/2.5.0과 동일 표시 지름·위치)
- 프리뷰: `docs/preview-2.5.2-compare.png` (2.5.0 idle vs 2.5.2 idle/mid/end)

## 2.5.2 변경

1. 불투명 `bead-new-src.png` 폐기 → 컷 알파 `bead-src-cut.png`로 재합성
2. 런타임 프레임 JPG (quality≈90, subsampling=0 / 4:4:4); PNG32는 용량 비교만
3. 앞줄 표시 크기·간격은 2.3.1/2.5.0 유지, 뒷줄 밀도는 2.5.1과 동일
4. versionCode 25

## 미확인

- 실기기 JPG src 스왑·체감 (**단정하지 않음**)
