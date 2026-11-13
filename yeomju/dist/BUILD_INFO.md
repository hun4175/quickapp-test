# 빌드 정보 — 2.4.5 (in→set 세분화 · 사각형 진단)

## 산출물 (사실)

- `yeomju/dist/com.yeomju.mala.debug.2.4.5.rpk`
- 크기: 99049 bytes
- SHA256: `489bf07b8cd2c975947a71184df83e3a9ba6525a04fb5c2dd3fe1dbb7f386dc7`
- versionName 2.4.5 / versionCode 22
- 단위 테스트: 37 passed
- 미리보기: `docs/preview-2.4.5-diag.png` (둥근 사각형 마스크 · 줄별 absolute top)

## 2.4.5 변경

1. 진단 패널: 432×514 사각형 기준, 줄 6개 개별 text + absolute top (24px / lineH 34)
2. in→set 세분화: touchstart / first move / swipe judge / touchend / handler / class set + evtDelay; t0Kind=swipe|tap|e7|click
3. E7 touchstart 즉시+1 · E8 click만 · E9 긴누름 끔 (설정 칩/진단패널)
4. 핫패스: 클래스 set 후 진동·저장 · 진단 텍스트는 animationend 이후 setTimeout
5. 최근 측정값 화면: 세부 구간 표시
6. 형상(구슬 레이아웃) 유지

## 미확인

- 실기기에서 in→set 원인·개선 여부 (**단정하지 않음**)
