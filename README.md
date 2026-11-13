# 염주굴리기 (Vela 퀵앱)

REDMI Watch 6 **글로벌판** (`M2523W1`, productId `miwear.watch.p65`, 화면 432×514) 대상 염주(묵주) 카운터 퀵앱입니다.  
Watch 6 Active(`M2564W1`)와는 다른 기기입니다. 혼동하지 마세요.

> **실기기:** 사용자가 REDMI Watch 6 글로벌판 펌웨어 `3.200.085` 에 **1.0.0** `.rpk` 설치·실행을 확인했습니다. **1.1.0** 염주 고리 UI 는 이 저장소에서 실기기 재검증하지 않았습니다.

## 기능

- 세로 타원 고리로 꿰어진 나무/보석 구슬 UI (16알 가시, 원근 스케일)
- 탭 또는 위/왼쪽 스와이프 → 고리가 한 알만큼 회전 + `@keyframes` 굴림
- 한 바퀴(기본 108알, 설정에서 108/54/27/21 선택) 완료 시 긴 진동 + 바퀴 수 증가
- 알마다 짧은 진동 (`system.vibrator`, 켜기/끄기)
- `system.storage` 로 카운트·바퀴·설정·오늘 합계 저장 (자정 지나면 오늘 합계만 리셋)
- 빠른 연타 시 pending 큐로 카운트 누락 방지
- 초기화는 확인 페이지를 거침 (세션만 / 오늘 합계 포함)
- `onBackPress` 처리 (설정·확인 페이지)
- **네트워크 권한/feature 없음**

## 애니메이션 방식 (문서 근거)

| 수단 | 사용 | 근거 |
| --- | --- | --- |
| `@keyframes` + `transform` (translate/rotate) | 사용 | [Animation Styles](https://iot.mi.com/vela/quickapp/en/components/general/animation-style.html) 지원 |
| `stack` + `left`/`top` 절대 배치 | 사용 | [stack](https://iot.mi.com/vela/quickapp/en/components/container/stack.html) |
| `transition` 의 `transform` / `left` / `top` | **미사용** | 동일 문서: transition-property 에서 미지원 |
| `canvas` | **미사용** | 공식 컴포넌트 목록에 없음 |

## 참고한 앱·문서

| 구분 | 저장소/문서 | 라이선스 | 참고 내용 |
| --- | --- | --- | --- |
| 구조·빌드 (사실) | [maga32/RedmiWatch-QuickReply](https://github.com/maga32/RedmiWatch-QuickReply) | MIT | `manifest.json`, `aiot-toolkit` 빌드, Watch 6 글로벌 설치·실행 확인된 공개 퀵앱 |
| 구조·빌드 (사실) | [lhy1520/ChatAi](https://github.com/lhy1520/ChatAi) | MIT | 동일 툴체인·페이지 구조, `system.storage` / `system.vibrator` 사용 예 |
| UX·기능 패턴 (사실, 코드 미복사) | [sher-shen/band-muyu](https://github.com/sher-shen/band-muyu) | 라이선스 미표기 | 손环용 전자 목어: 탭 카운트, 오늘 합계, 로컬 저장, 비네트워크 |
| UX·튜토리얼 (사실, 코드 미복사) | [Genkaim/Vela-App](https://github.com/Genkaim/Vela-App) `wooden fish` | 라이선스 미표기 | 전자 목어 샘플·설정/확인 페이지 구성 |
| 디지털 카운터 UX (사실) | GitHub의 tasbih / japa mala / 念珠 / 木鱼 검색 | 제각각 | 알 개수(108 등)·바퀴·진동·리셋 확인 흐름 참고. Vela·미밴드 전용 염주 공개 퀵앱은 거의 없고, 목어 계열이 가장 유사 |
| 공식 문서 (사실) | [Xiaomi Vela JS 应用](https://iot.mi.com/vela/quickapp/) | 문서 | manifest, `deviceTypeList`, lifecycle/`onBackPress`, `system.storage`, `system.vibrator` |

라이선스 미표기 저장소의 **소스 코드는 복사하지 않았습니다.** MIT 참고 프로젝트는 프로젝트 골격·빌드 스크립트 관례만 따랐고, 본 앱 코드는 새로 작성했습니다. 본 저장소 라이선스는 `LICENSE`(MIT)입니다.

## 사실 / 추정 / 미확인

| 항목 | 구분 | 설명 |
| --- | --- | --- |
| 대상 기기 M2523W1, 432×514, productId `miwear.watch.p65` | 사용자 제공 | 이 저장소에서 실측하지 않음 |
| 펌웨어 3.200.085 | 사용자 제공 | 실기기 미검증 |
| `deviceTypeList: ["watch"]` | 사실 | 공식 manifest 문서 |
| `minPlatformVersion: 1000` | 추정 | QuickReply/ChatAi 와 동일. 공식 예시도 1000. band-muyu 는 1200 사용 |
| `designWidth: "device-width"` | 사실(관례) | QuickReply 등 Watch 6 확인 앱과 동일 |
| `vibrator.vibrate({ mode: 'short'/'long' })` | 사실 | 공식 문서, REDMI Watch 6 지원 표기 |
| `vibrator.start/stop` | 미사용 | 공식 문서상 Watch 6 미지원 |
| 탭·스와이프(`onswipe`)로 카운트 | 사실(API) / 미확인(체감) | 컴포넌트 이벤트는 문서·공개 앱에 존재. 실기기 감도는 미확인 |
| MiFaceDown 등으로 `.rpk` 설치 | 미확인 | QuickReply README 의 사용자 측 절차. **이 저장소에서는 실기기 설치를 확인하지 않음** |
| 서명 우회·기기 직접 쓰기 | 의도적으로 없음 | 포함하지 않음 |

## 파일 구조

앱 소스는 `yeomju/` 아래에 둡니다. (`aiot-toolkit` 2.0.5 가 프로젝트 상위 경로에 `../.temp_<dirname>` 을 만들기, 저장소 루트가 `/workspace` 처럼 `/` 직하위이면 권한 오류가 납니다.)

```
├── README.md
└── yeomju/
    ├── package.json          # aiot-toolkit 빌드 / node 테스트
    ├── src/
    │   ├── manifest.json
    │   ├── app.ux
    │   ├── config-watch.json
    │   ├── common/
│   │   ├── beads.js      # 순수 카운트 로직
│   │   ├── ring.js       # 타원 고리 배치·위상
│   │   ├── persist.js    # system.storage 래퍼
│   │   ├── bead-wood.png / bead-gem.png / focus-arc.png
│   │   └── logo.png
    │   └── pages/
    │       ├── index/        # 메인 카운터
    │       ├── settings/     # 알 개수·진동·초기화 진입
    │       └── confirm/      # 초기화 확인
    ├── test/beads.test.mjs
    └── dist/                 # 빌드된 .rpk + BUILD_INFO.md
```

## 빌드

필요: Node.js 18+, npm.

```bash
cd yeomju
npm install
npm run build          # aiot build → dist/*.rpk
npm test               # 순수 로직 단위 테스트
```

빌드가 성공하면 `yeomju/dist/` 에 `.rpk` 가 생기고, 명령·크기·sha256 은 `yeomju/dist/BUILD_INFO.md` 에 기록합니다.  
실패 시 꾸며내지 않고 에러를 그대로 남깁니다.

## 설치 (미확인)

공개 퀵앱 사용자들이 쓰는 예:

1. [MiFaceDown](https://github.com/maga32/RedmiWatch-QuickReply) README 에 안내된 Android 앱으로 워치 연동 후 `.rpk` 설치  
2. 또는 [AstroBox](https://github.com/AstralSightStudios/AstroBox-NG) 등 커뮤니티 도구

**이 저장소에서는 위 도구로 REDMI Watch 6 3.200.085 에 설치·실행한 적이 없습니다.** 서명 우회나 기기에 직접 쓰는 스크립트는 제공하지 않습니다.

## 개발자 문서

- 공식: https://iot.mi.com/vela/quickapp/
- manifest: https://iot.mi.com/vela/quickapp/zh/guide/framework/manifest.html
- vibrator: https://iot.mi.com/vela/quickapp/zh/features/system/vibrator.html
- storage: https://iot.mi.com/vela/quickapp/zh/features/data/storage.html
- lifecycle / onBackPress: https://iot.mi.com/vela/quickapp/zh/guide/framework/script/lifecycle.html
