# 빌드 정보 — 2.4.0

## 산출물 (사실)

- `yeomju/dist/com.yeomju.mala.debug.2.4.0.rpk`
- 크기: 58727 bytes
- SHA256: `ee7f1c6c70687399224ea1c143ab8f69d5fb47d5f6d4f34f3e8379eb6afdaa86`
- versionName 2.4.0 / versionCode 17
- 단위 테스트: 30 passed
- 시각: 2.3.1 동일 (노드 10, 커버리지 diff=0)

## 입력→애니 지연 병목 (코드 추적 근거)

| # | 후보 | 근거 | 2.4.0 조치 |
|---|------|------|-----------|
| 1 | 임계 22px 대기 | `classifyVerticalSwipe` minDy=22 → touchmove 여러 번 후 시작 | **SWIPE_MIN_DY=12** |
| 2 | 같은 tick setData 혼재 | `applyState`+`withRollClasses`+buzz/save가 한 경로 | **클래스 먼저**, buzz/save는 `setTimeout(0)` |
| 3 | 애니 종료 대기 큐 | `_animating`이면 ensure가 return → 다음 입력 최대 ~166ms 지연 | **즉시 홈스냅 후 재시작** |
| 4 | 동일 클래스 재적용 | 같은 `roll-next-i` 재설정 시 애니 미재시작 가능 | **교대 `-b` 클래스** |
| 5 | 버퍼 노드 클래스 | 버퍼↔버퍼는 이미 `''` (shouldAnimate=false) | 유지 |
| 6 | touchmove 빈도 | 플랫폼 종속 — 코드로 빈도 제어 불가 | 임계 하향으로 완화 시도 |

실기기 체감 개선 **단정하지 않음**.

## 입력 방식

- **슬라이드**(기본): 위/아래 양방향, plus_both(+1)
- **터치**: 탭=한 칸 앞(+1). **슬라이드 무시**(오동작 방지). 롱프레스→설정(탭은 touchend 즉시, 롱프레스 대기 없음)

## 제거

- A/B/C 애니 모드·디버그 HUD·Mode B/C 코드. `stateSchema≥4` 마이그레이션.

## 미확인

- 입력 지연 체감 (**단정하지 않음**)
