# 빌드 정보 — pomodoro 0.1.6

## 산출물 (사실)

- `pomodoro/dist/com.hun4175.pomodoro.debug.0.1.6.rpk`
- 크기: 1168917 bytes
- SHA256: `171cc33982434df68903a73901dceec6e1fd605eca055a0584602c08247ae11e`
- package `com.hun4175.pomodoro` · versionName 0.1.6 / versionCode 7
- 빌드: aiot-toolkit 2.0.5 (`npm run build`)
- 서명: aiot-toolkit 2.0.5 내장 디버그 인증서 (toolkit 기본 `pem/private.pem`, `pem/certificate.pem`)
- rpk 안 `manifest.json`(0.1.6/7), `common/booster/*.png` 60장, `common/setup/*.png` 33장이 원본과 바이트 동일함을 확인. 글꼴 파일(.ttf/.otf)은 들어 있지 않음
- 게이지 프레임 37장 합계 724132 bytes(0.1.5와 바이트 동일), 타이머 리소스 878813 bytes, 설정 화면 리소스 252170 bytes
- 단위 테스트: 32 passed
- 실기기 설치: 하지 않음

## 변경

- 설정 화면 분리: 같은 페이지 안의 독립 뷰(`view === 'setup'`). 집중 5~60분(5분 단위)·휴식 1~30분(1분 단위) 큰 숫자, 좌우 끌기(왼쪽=늘림)와 좌우 끝 탭, REPEAT 토글, START
- START: 설정 뷰를 닫고 게이지 g00→g36을 약 0.9초(50ms 간격 src 교체) 채운 뒤 카운트다운
- 타이머 화면: 탭=일시정지/재개, 길게 누르기(560ms)=중지 후 설정으로
- 반복 끔: 집중+휴식 한 번 후 진동 3회, 설정으로
- 초기화: onInit/onShow/onHide 에서 설정 뷰로, 진행 상태는 버림. 설정값만 `pomodoro.settings.v1`에 저장(없으면 0.1.5 상태의 집중 시간만 이어받음)
- 대기 힌트(`^ 5~60 v`) 리소스 3장 제거

## 이전 산출물

- `pomodoro/dist/com.hun4175.pomodoro.debug.0.1.5.rpk` (이 버전 산출물에서는 제거)
- 크기: 914827 bytes
- SHA256: `f5e33596f698b329ca7ffb801af13627be44d6a3177bc39163637c0efe1727e5`
- versionName 0.1.5 / versionCode 6
