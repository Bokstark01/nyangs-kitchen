<?php
// 이 파일을 config.php 로 복사한 뒤 값을 채우세요.  cp config.sample.php config.php
// config.php 는 웹에서 열리지 않는 위치(public 폴더 밖)에 있어야 하고, GitHub에 올리면 안 돼요.
return [
    // MySQL 접속
    'db_dsn'  => 'mysql:host=localhost;dbname=nyangs_kitchen;charset=utf8mb4',
    'db_user' => 'nyangs_kitchen',
    'db_pass' => '여기에_DB_비밀번호',

    // 이 서버의 공개 주소 (public 폴더가 열리는 주소, 끝에 / 없이). 반드시 https
    'base_url' => 'https://도메인',

    // 로그인 후 돌아갈 앱 주소 (바꾸지 마세요)
    'app_redirect' => 'com.nyangskitchen.app://auth',

    // 앱에서 API를 부를 수 있는 출처 (바꾸지 마세요)
    'allowed_origins' => ['https://localhost', 'http://localhost', 'capacitor://localhost'],

    // 카카오 로그인: 카카오 개발자 콘솔 > 앱 > 플랫폼 키 > REST API 키, 그리고 클라이언트 시크릿
    'kakao_rest_key'      => '',
    'kakao_client_secret' => '',

    // 구글 로그인: Google Cloud 콘솔 > Google 인증 플랫폼 > 클라이언트 (웹 애플리케이션)
    'google_client_id'     => '',
    'google_client_secret' => '',

    // 로그인 유지 기간(일)
    'token_days' => 90,
];
