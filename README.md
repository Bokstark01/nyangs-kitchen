# 냥's 키친

길고양이 급식 포인트를 지도에 기록하고 급식 시간을 알려주는 안드로이드 앱 (1차).

## 1차 기능
- 카카오 지도 + 내 위치(GPS), 급식 포인트·급식 주의 구역 등록
- 고양이 사진 촬영/선택, 원본은 휴대폰 앱 전용 공간에만 저장
- 포인트별 급식 시간, 매일 반복 알람, 오늘 급식 완료 체크
- 하단 Google AdMob 테스트 배너

## APK 받기
`main`에 올릴 때마다 GitHub Actions가 APK를 만들어 **Releases → latest**에 올립니다.
휴대폰에서 `nyangs-kitchen.apk`를 받아 설치하세요 (출처를 알 수 없는 앱 설치 허용 필요).

## 카카오 지도 키
- developers.kakao.com → 내 애플리케이션 → 앱 키의 **JavaScript 키**
- 플랫폼 → Web → 사이트 도메인 `https://localhost` 등록, 카카오맵 사용 설정 ON
- 키는 `www/config.js`에 넣거나, 저장소 Secret `KAKAO_JS_KEY`로 넣거나, 앱 설정 화면에서 넣을 수 있어요.

## 출시 전 바꿀 것
- AdMob 테스트 ID → 본인 AdMob 앱 ID(`ADMOB_APP_ID` 환경변수)와 배너 광고 단위 ID(`www/app.js`)
- 디버그 서명 키(`resources/android/debug.keystore`) → 출시용 서명 키
