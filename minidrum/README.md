# 미니드럼 (minidrum)

REDMI Watch 6 글로벌(`M2523W1`, 펌웨어 `3.200.085`, 432×514)용 Vela JS 퀵앱입니다. 화면의 패드 4개를 터치해 드럼 소리를 냅니다.

- 패키지: `com.hun4175.minidrum` · 버전 `0.1.0` (versionCode 1)
- 산출물: [`dist/com.hun4175.minidrum.debug.0.1.0.rpk`](dist/) (toolkit 내장 디버그 서명, 자세한 정보는 [`dist/BUILD_INFO.md`](dist/BUILD_INFO.md))
- 실기기 설치·실행은 아직 하지 않았습니다.

## 기능

- **2×2 패드**: 왼쪽 위 킥, 오른쪽 위 스네어, 왼쪽 아래 하이햇, 오른쪽 아래 크래시. 둥근 화면 모서리에 맞춰 패드 모서리를 둥글게(40px) 하고 바깥 여백을 뒀습니다.
- **즉시 반응**: 패드는 `click` 대신 `touchstart`로 처리합니다.
- **가벼운 시각 피드백**: 누르면 배경색만 밝은 색으로 바뀌고 110ms 뒤 돌아옵니다. 애니메이션은 쓰지 않습니다.
- **지연 표시**: 상단 왼쪽에 `마지막 지연ms · 평균 (샘플 수)`가 작게 뜹니다. 터치 핸들러가 시작된 시각부터 `audio`의 `play` 이벤트가 올 때까지의 시간이며, 최근 10회를 평균합니다.
- **진동 토글**: 상단 오른쪽 `진동 끔/켬`. 기본은 끔이고, 켜면 패드마다 `vibrate({mode:'short'})`를 함께 호출합니다.
- **사운드**: `scripts/gen-sounds.py`가 사인파와 노이즈로 직접 합성합니다(외부 샘플 없음, 저작권 무관). 모두 16kHz · 모노 · 16bit PCM WAV이고 첫 샘플부터 소리가 납니다.

| 패드 | 파일 | 길이 | 크기 |
| --- | --- | --- | --- |
| 킥 | `common/sounds/kick.wav` | 250ms | 8,044 B |
| 스네어 | `common/sounds/snare.wav` | 200ms | 6,444 B |
| 하이햇 | `common/sounds/hihat.wav` | 80ms | 2,604 B |
| 크래시 | `common/sounds/crash.wav` | 600ms | 19,244 B |

## 지연을 줄이는 방식

1. **`touchstart` 사용**: [통용 이벤트 문서](https://iot.mi.com/vela/quickapp/zh/components/general/events.html)에 `touchstart`는 "손가락이 막 닿을 때 발생"이라고 나옵니다.
2. **단일 플레이어 재사용**: 이전과 같은 소리면 `src`를 다시 지정하지 않고 `currentTime = 0` 후 `play()`만 호출합니다. 다른 소리면 `src`를 바꾸고 `play()`합니다. `stop()`은 부르지 않습니다. 근거는 soundtest 0.1.0 실측입니다. 재사용 방식은 약 200~215ms였고, 매번 `stop→src→play` 방식은 WAV에서 약 554ms였습니다.
3. **프리로드(예열)**: 첫 화면 표시 때 `audio.muted = true` 상태로 스네어→하이햇→크래시→킥을 한 번씩 재생합니다. 각 소리는 `ended` 이벤트가 오거나 1.2초가 지나면 다음으로 넘어가고, 끝나면 `muted = false`로 돌립니다. 마지막에 킥을 두어서 프리로드 직후 첫 킥은 되감기로 재생됩니다. 프리로드 중에 패드를 누르면 즉시 중단하고 음소거를 풀고 재생합니다.
4. **작은 파일**: 16kHz 모노 WAV, 각 20KB 이하입니다. 디코딩 부담이 없는 PCM을 골랐습니다.

## 사실 · 추정 · 미확인

**사실 (문서 또는 실기기 확인)**
- [`@system.audio` 문서](https://iot.mi.com/vela/quickapp/zh/features/other/audio.html)에는 `audio` 객체가 모듈 하나뿐이고, 인스턴스를 여러 개 만드는 API가 없습니다. `src`·`currentTime`(쓰기 가능)·`muted`·`autoplay`·`loop`·`volume` 속성과 `play`·`ended`·`error` 등 이벤트가 있습니다.
- 워치 6 글로벌 3.200.085에서 패키지 안 WAV/MP3를 `@system.audio`로 재생하면 실제 스피커로 소리가 납니다(soundtest 0.1.0, 사용자 확인).
- 같은 기기에서 터치→`play` 이벤트는 재사용 방식 약 200~215ms였고, 가끔 더 늦게 들렸습니다.

**추정**
- 플레이어가 하나라서 **동시 재생(폴리포니)은 안 됩니다.** 소리가 울리는 중에 다른 패드를 누르면 앞 소리가 끊기고 새 소리로 바뀔 것입니다. 크래시 위에 킥을 겹치는 식의 연주는 안 됩니다.
- `click`은 손을 뗀 뒤 판정되므로 `touchstart`가 체감상 더 빠를 것입니다. 문서에는 `click`의 발생 시점이 자세히 적혀 있지 않습니다.
- 프리로드가 첫 터치 지연을 줄여 줄 것으로 기대합니다.

**미확인 (실기기 확인 필요)**
- `muted = true`가 실제로 소리를 막는지 모릅니다. 막지 않으면 앱을 켤 때 네 소리가 연달아 들릴 수 있습니다.
- 프리로드가 실제로 지연을 줄이는지, `src`를 바꿀 때 지연이 얼마인지(WAV `stop` 없이) 모릅니다.
- 재생 중 `currentTime = 0` + `play()`가 처음부터 다시 재생되는지 모릅니다(soundtest는 `ended` 이후에만 측정했습니다).
- 지연 표시는 `play` 이벤트 시각이라 실제로 소리가 나오는 시각과 다를 수 있습니다. 프리로드 중에 누르면 그 직전 프리로드의 `play` 이벤트가 섞여 한 번 짧게 찍힐 수 있습니다.
- 여러 손가락으로 두 패드를 동시에 눌렀을 때의 동작도 모릅니다.

## 빌드 · 테스트

```bash
cd minidrum
npm install
npm run sounds   # 사운드·아이콘 다시 합성 (선택, 시드 고정이라 결과 동일)
npm test         # node:test 단위 테스트
npm run build    # dist/com.hun4175.minidrum.debug.0.1.0.rpk
```

`sign/` 폴더가 없으면 aiot-toolkit 내장 디버그 인증서(CN=localhost)로 서명됩니다.

## 설치

염주 앱과 같은 방법으로 디버그 rpk를 워치에 설치합니다(쓰던 사이드로드 도구와 절차 그대로). 설치 전에 워치의 미디어 볼륨을 올려 두세요. 앱 목록에서 **미니드럼**을 실행하고 패드를 눌러 보면서 상단의 지연 숫자를 확인하면 됩니다.

## 라이선스

MIT. [`LICENSE`](LICENSE) 참고.
