# 빌드 결과 (사실)

- **상태:** 성공
- **시각(UTC):** 2026-11-13T04:16:54Z
- **명령:** `cd yeomju && npm run build` (`aiot build`, aiot-toolkit 2.0.5)
- **Node:** v22.23.4
- **산출물:** `yeomju/dist/com.yeomju.mala.debug.1.0.0.rpk`
- **크기:** 30265 bytes
- **SHA256:** `ac3dd0a35aa8d45ebf8614bde26c599573fd6ea4c861c292916add68081828fc`

## 빌드 로그 요약

```
✅ Project build and generate files：.../com.yeomju.mala.debug.1.0.0.rpk
✅ build success
```

## 참고

- 프로젝트 디렉터리가 파일시스템 루트 직하위(`/workspace`)이면 aiot-toolkit 이 `/.temp_workspace` 생성을 시도해 EACCES 가 난다.
- 이 저장소는 `yeomju/` 하위에서 빌드하여 `/workspace/.temp_yeomju` 를 사용한다.
- 서명은 toolkit 기본 debug PEM 을 사용했다. 기기 설치·실행은 미확인.
