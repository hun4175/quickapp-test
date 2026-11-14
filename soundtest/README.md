# 소리 테스트 (soundtest)

REDMI Watch 6 글로벌(`M2523W1`, 펌웨어 `3.200.085`, 432×514)에서 **퀵앱이 터치 시 소리를 낼 수 있는지** 실기기로 확인하는 테스트 앱입니다.

- 패키지: `com.hun4175.soundtest` · 버전 0.1.0 (versionCode 1)
- 빌드: aiot-toolkit 2.0.5, **디버그 서명**(toolkit 내장 인증서 CN=localhost)
- rpk: [`dist/com.hun4175.soundtest.debug.0.1.0.rpk`](dist/)

## 화면

- 위: 제목과 현재 미디어 볼륨(`volume.getMediaValue`)
- 가운데: 큰 버튼 목록(스크롤)
- 아래: **결과 창**. 마지막으로 누른 버튼 이름과 최근 6줄 로그를 크게 보여 줍니다. 결과를 스크린샷으로 공유하면 됩니다.

로그의 `+NNms`는 버튼을 **터치한 순간(touchstart)** 부터 잰 경과 시간입니다.
첫 줄 `click +NNms`는 터치→click 이벤트까지 걸린 시간이고, 이후 `play`·`loadeddata`·`ended`·`error` 등은 `@system.audio` 이벤트가 도착한 시각입니다.

## 버튼별 시도 내용

| 버튼 | 방식 | 파일 |
| --- | --- | --- |
| WAV 클릭 · 재사용 | 같은 src면 다시 지정하지 않고 `currentTime=0` → `play()` (첫 탭만 `src` 지정) | `click16k.wav` (40ms, 16kHz PCM) |
| WAV 클릭 · 매번 | `stop()` → `src` 지정 → `play()` | `click16k.wav` |
| MP3 클릭 · 재사용 / 매번 | 위와 같음 | `click.mp3` (16kHz 32kbps) |
| WAV 비프 1초 16k | 매번 방식 | `beep16k.wav` (1kHz 1초) |
| WAV 비프 1초 44.1k | 매번 방식 | `beep44k.wav` |
| MP3 비프 1초 | 매번 방식 | `beep.mp3` |
| OPUS 비프 1초 | 매번 방식 | `beep.opus` (Ogg Opus 24kbps) |
| autoplay WAV 비프 | `autoplay=true` 후 `src` 지정, `play()` 호출 안 함 | `beep16k.wav` |
| 복사본 WAV 비프 | `file.copy`로 `internal://files/beep16k.wav`에 복사 후 매번 방식 재생 | `beep16k.wav` |
| ■ 정지 stop() | `audio.stop()` | – |
| 상태 getPlayState | `audio.getPlayState` 결과(state·src·currentTime·duration·volume·muted) | – |
| 볼륨 조회 | `volume.getMediaValue` | – |
| 볼륨 +10% / -10% | `getMediaValue` → `setMediaValue` (**시스템 미디어 볼륨이 실제로 바뀜**) | – |
| 진동 short (비교) | `vibrator.vibrate({ mode: 'short' })` | – |
| 파일 포함 확인 | `file.readArrayBuffer`로 각 사운드 파일 앞 4바이트 읽기(`RIFF`/`OggS` 등) | 전체 |

`@system.audio`는 문서상 **모듈 하나(싱글턴)** 이고 새 플레이어 객체를 만드는 API가 없습니다. 그래서 "미리 로드한 객체 재사용 vs 매번 새로"는 *같은 src를 유지한 채 play()* 와 *stop→src 재지정→play()* 로 비교합니다.

사운드 파일은 `scripts/gen-sounds.py`가 사인파/노이즈로 직접 합성합니다(외부 음원 없음, 전체 약 130KB). 재생성: `npm run sounds` (python3 + Pillow + ffmpeg 필요).

## 근거 문서 (Xiaomi Vela JS 공식)

- 音频 audio: <https://iot.mi.com/vela/quickapp/zh/features/other/audio.html> — `play/pause/stop/getPlayState`, 속성 `src/currentTime/autoplay/loop/volume/muted`, 이벤트 `play/pause/stop/loadeddata/ended/durationchange/error`
- 系统音量 volume: <https://iot.mi.com/vela/quickapp/zh/features/system/volume.html> — `getMediaValue/setMediaValue/onMediaValueChanged`
- 振动 vibrator: <https://iot.mi.com/vela/quickapp/zh/features/system/vibrator.html> — `vibrate({mode})`, 지원 표에 REDMI Watch 6 포함
- 文件存储 file: <https://iot.mi.com/vela/quickapp/zh/features/data/file.html> — `copy`, `readArrayBuffer`(앱 리소스 경로 허용)
- 项目结构(URI): <https://iot.mi.com/vela/quickapp/zh/guide/framework/project-structure.html> — 앱 리소스 `/path`, `internal://files/...`
- 录音 record: <https://iot.mi.com/vela/quickapp/zh/features/system/record.html> — 지원 표에 **REDMI Watch 6 미지원**이라 이 앱에서는 쓰지 않음

## 확실한 것 / 미확인

**문서로 확인됨**
- `system.audio`, `system.volume` API와 이벤트 이름은 위 문서에 있습니다.
- `vibrator.vibrate`는 REDMI Watch 6 지원으로 표기돼 있습니다.
- `system.record`는 REDMI Watch 6 미지원으로 표기돼 있습니다.

**미확인(실기기에서 확인할 것)**
- audio·volume 문서에는 기기별 지원 표가 없어 **워치 6에서 동작하는지 모릅니다**. 스피커 자체는 공식 사양에 있지만 퀵앱 오디오가 스피커로 나오는지는 미확인입니다.
- 문서에 **지원 포맷 목록이 없습니다**. WAV·MP3·OPUS 중 무엇이 재생되는지가 이 테스트의 핵심입니다(record 문서가 pcm/opus/wav를 언급하는 것은 참고 정도).
- `src`에 앱 리소스 경로(`/common/sounds/...`)를 직접 넣을 수 있는지는 문서에 명시돼 있지 않습니다. 그래서 `internal://files` 복사본 재생 버튼을 따로 뒀습니다.
- 이벤트 콜백에 어떤 인자(에러 코드 등)가 오는지 문서에 없습니다. 오는 대로 로그에 찍습니다.
- `currentTime=0` 되감기, `autoplay`가 워치에서 동작하는지 미확인입니다.
- 실기기 설치·실행은 아직 하지 않았습니다.

## 빌드 · 테스트

```bash
cd soundtest
npm install
npm test        # 단위 테스트 (로직 · manifest · 버튼/핸들러 일치 · 사운드 파일 · rpk 내용)
npm run build   # dist/com.hun4175.soundtest.debug.0.1.0.rpk
```

## 설치

염주 앱과 같은 방법으로 디버그 rpk를 워치에 설치합니다(사용 중인 사이드로드 도구/절차 그대로). 설치 후 앱 목록의 **소리테스트**를 실행하고, 버튼을 하나씩 눌러 결과 창을 스크린샷으로 남기면 됩니다.

볼륨 ± 버튼은 워치의 미디어 볼륨 설정을 실제로 바꿉니다. 테스트 후 원하는 값으로 되돌려 주세요.

## 라이선스

MIT
