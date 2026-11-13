# 빌드 정보 — 2.5.3 (실험 제거 · 설정 UI 확대)

## 산출물 (사실)

- `yeomju/dist/com.yeomju.mala.debug.2.5.3.rpk`
- 크기: 328094 bytes
- SHA256: `96d2dc902a3cd043ab21adf6d0b8b3ebcdc75abc4695841965591618ba14643d`
- versionName 2.5.3 / versionCode 26
- 단위 테스트: 27 passed

## 2.5.3 변경

1. 진단 로그·타이밍 표시·diag 페이지·timing 모듈 제거 (실기기 2.5.2 S2/JPG 정상 확인 후)
2. 설정은 입력 방식(슬라이드/터치)만 · 대형 터치 행(높이 96px)·제목 36px·항목 32px · 좌우 여백 36px
3. `ring-kf.js`를 `scripts/lib/`로 이동 (스프라이트 생성용, rpk 미포함)
4. stateSchema 11 · diagnoseLatency 키 폐기
5. 프리뷰: `docs/preview-2.5.3-settings.png`

## 스프라이트 (변경 없음 · 2.5.2 JPG)

- 프레임 합계 287041 B · 소스 `bead-src-cut.png`

## 미확인

- 실기기 설정 UI 체감 (**단정하지 않음**)
