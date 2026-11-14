# Xiaomi Vela JS 퀵앱 모음

[Xiaomi Vela](https://iot.mi.com/vela/quickapp/) JS 퀵앱을 모아 두는 비공식 저장소입니다.  
각 앱은 하위 폴더에 독립 프로젝트로 두며, 상세 문서·빌드·버전은 해당 폴더 README를 따릅니다.

## 대상 기기

- **REDMI Watch 6 글로벌** (`M2523W1`), 화면 432×514
- 실기기 확인 펌웨어: `3.200.085`

다른 기기·펌웨어는 앱 README의 호환성 표를 참고하세요.

## 공통 개발 환경

앱마다 `package.json`이 다를 수 있습니다. 현재 레포에 실제로 쓰이는 것:

- Node.js 18+
- [aiot-toolkit](https://www.npmjs.com/package/aiot-toolkit) (`aiot build` / `aiot start`)
- `@aiot-toolkit/jsc` (앱 의존성에 포함된 경우)

설치·빌드는 각 앱 폴더에서 `npm install` 후 해당 스크립트를 실행합니다.

## 퀵앱 목록

| 폴더 | 소개 |
| --- | --- |
| [`yeomju/`](yeomju/) | 염주 굴리기 — 구슬을 굴리며 횟수·목표를 세는 카운터. 문서: [`yeomju/README.md`](yeomju/README.md) |
| [`soundtest/`](soundtest/) | 소리 테스트 — 터치 시 오디오 재생 가능 여부·포맷·지연을 실기기에서 확인하는 테스트 앱. 문서: [`soundtest/README.md`](soundtest/README.md) |

## 면책

비공식·개인 프로젝트이며 **Xiaomi / REDMI와 무관**합니다.  
상용·배포 전 반드시 실기기에서 검증하세요.
