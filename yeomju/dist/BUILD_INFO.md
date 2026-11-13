# 빌드 정보 — 2.0.0

## 산출물 (사실)

- `yeomju/dist/com.yeomju.mala.debug.2.0.0.rpk`
- 크기: 168794 bytes
- SHA256: `fcb5838df6133ac693b9d56a63025db879c362e48b79815e7fb2170b609ca688`
- versionName 2.0.0 / versionCode 11
- 단위 테스트: 31 passed

## rpk 내부 (unzip)

| 경로 | bytes |
|------|------|
| pages/index/index.js | 118156 |
| common/bead-wood-v2.png | 91537 |
| pages/settings/settings.js | 68409 |
| common/logo.png | 43511 |
| pages/confirm/confirm.js | 33181 |
| app.js | 4386 |
| META-INF/CERT | 3773 |
| manifest.json | 901 |

참조: `BEAD_SRC=/common/bead-wood-v2.png`. 구 `bead-wood.png` 없음.

## 구슬 이미지 미변경 버그 (1.9.0)

- **원인 근거**: 1.9.0 rpk에 이미 새 `common/bead-wood.png`(91537B, 소스와 동일 sha) 포함. 템플릿 `$item.src`만 사용, base64/스프라이트 없음.
- **추정**: 워치가 동일 경로 이미지 캐시.
- **조치**: `bead-wood-v2.png`로 파일명·참조 전부 갱신, 구 파일 제거.

## Mode E (기본)

- 앞열·뒤열 컨테이너 2노드 `@keyframes translateY` (앞 ±209, 뒤 반대×0.72 ±150)
- 클래스만 토글 → 종료 시 스냅·레인 재분배

## Mode D 개선

- `Date.now` 경과 진행률 → 190ms에 종료
- 레인 transform만, 16ms 틱
- 디버그: 프레임 수 + 완료 ms

## 용량

- `ring-kf.js`는 index 번들 제외
- A 비교용 키프레임은 index 유지 → index.js 118156 B

## 미리보기

- `yeomju/docs/preview-2.0.0.png` (v2 구슬)

## 미확인

- 실기기 캐시 해소·Mode E/D 체감 (**단정하지 않음**)
