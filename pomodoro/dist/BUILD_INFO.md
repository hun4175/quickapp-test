# 빌드 정보 — pomodoro 0.1.7

## 산출물 (사실)

- `pomodoro/dist/com.hun4175.pomodoro.debug.0.1.7.rpk`
- 크기: 1255576 bytes
- SHA256: `ecde0b274c7033f0c41ff78effae5a257c9dd4cc887918dfb4cb9bdb75c7b764`
- package `com.hun4175.pomodoro` · versionName 0.1.7 / versionCode 8
- 빌드: aiot-toolkit 2.0.5 (`npm run build`)
- 서명: aiot-toolkit 2.0.5 내장 디버그 인증서 (toolkit 기본 `pem/private.pem`, `pem/certificate.pem`)
- rpk 안 `manifest.json`(0.1.7/8), `common/booster/*.png` 60장, `common/setup/*.png` 52장이 원본과 바이트 동일함을 확인. 글꼴 파일(.ttf/.otf)은 들어 있지 않음
- 타이머 리소스 878813 bytes(0.1.6과 바이트 동일), 설정 화면 리소스 334053 bytes(0.1.6은 252170)
- 단위 테스트: 55 passed (`timer.test.mjs`, `project.test.mjs`, `page-sim.test.mjs` = index.ux 스크립트를 node 에서 돌리는 터치 시뮬레이션)
- 실기기 설치: 하지 않음

## 변경

- 설정 화면을 디자인 확정안 THERMO(`docs/booster-design/setup-final-thermo/`)로 교체: 오른쪽 세로 막대 2개(집중 12칸 5~60분, 휴식 30칸 1~30분)를 짚기·위아래 끌기로 값 지정, 왼쪽 큰 숫자 윗절반/아랫절반 탭 = ±1단계(세로 쓸기 36px마다 1단계)
- 방향 잠금 12px: 가로로 먼저 움직인 터치는 값을 바꾸지 않음. 세로로 잠긴 뒤에는 가로로 비껴도 값만 바뀜
- `onBackPress`: 설정 컨트롤에서 시작한 터치 중이거나 손 뗀 뒤 400ms 안이면 삼킴(왼쪽 가장자리 x<30 에서 시작한 스와이프는 뒤로가기 허용)
- 설정 리소스: 0.1.6 의 이웃 값 숫자 `n0~n9` 제거, 막대 묶음 22장·▲▼ 눌림/끝값 8장·밑줄 강조 2장·`start-on` 추가 (`scripts/gen-setup.py` 가 `gen_setup_thermo.py` 를 import 해 생성)
- 시작 애니메이션, 롱프레스로 설정 복귀, 탭 일시정지, 반복 끔 종료, onInit/onShow/onHide 초기화, `pomodoro.settings.v1` 저장은 0.1.6과 같음

## 이전 산출물

- `pomodoro/dist/com.hun4175.pomodoro.debug.0.1.6.rpk` (이 버전 산출물에서는 제거)
- 크기: 1168917 bytes
- SHA256: `171cc33982434df68903a73901dceec6e1fd605eca055a0584602c08247ae11e`
- versionName 0.1.6 / versionCode 7
