<?php
// 구글 로그인: 처음 열면 구글로 보내고, 구글이 돌려보내면(code) 회원을 찾거나 만든 뒤 앱으로 돌아간다.
// Google Cloud 콘솔(웹 애플리케이션 클라이언트)에 등록할 승인된 리디렉션 URI = {base_url}/google.php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';

$redirectUri = rtrim((string)cfg('base_url'), '/') . '/google.php';
try {
    if (!cfg('google_client_id')) oauth_fail('google_not_configured', '구글 로그인이 아직 서버에 설정되지 않았어요.');

    if (!isset($_GET['code']) && !isset($_GET['error'])) {
        $q = http_build_query([
            'client_id' => cfg('google_client_id'),
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'scope' => 'openid email profile',
            'state' => oauth_new_state('google'),
            'prompt' => 'select_account',
        ]);
        header('Location: https://accounts.google.com/o/oauth2/v2/auth?' . $q, true, 302);
        exit;
    }
    if (isset($_GET['error'])) oauth_fail('google_' . preg_replace('/\W/', '', (string)$_GET['error']), '구글 로그인을 취소했어요.');
    if (!oauth_take_state('google', (string)($_GET['state'] ?? ''))) oauth_fail('bad_state', '로그인 시간이 지났어요. 다시 시도해 주세요.');

    $tok = http_call('POST', 'https://oauth2.googleapis.com/token', [
        'grant_type' => 'authorization_code',
        'client_id' => cfg('google_client_id'),
        'client_secret' => cfg('google_client_secret'),
        'redirect_uri' => $redirectUri,
        'code' => (string)$_GET['code'],
    ]);
    $access = $tok['json']['access_token'] ?? '';
    if ($access === '') oauth_fail('google_token', '구글 로그인에 실패했어요. (' . ($tok['json']['error'] ?? $tok['status']) . ')');

    $me = http_call('GET', 'https://openidconnect.googleapis.com/v1/userinfo', [], ['Authorization: Bearer ' . $access]);
    $sub = (string)($me['json']['sub'] ?? '');
    if ($sub === '') oauth_fail('google_profile', '구글 계정 정보를 받지 못했어요.');
    $email = !empty($me['json']['email_verified']) ? (string)($me['json']['email'] ?? '') : null;
    $nick = (string)($me['json']['name'] ?? ($me['json']['given_name'] ?? ''));

    finish_to_app(upsert_social('google', $sub, $email ?: null, $nick));
} catch (Throwable $e) {
    oauth_fail('server_error', '서버에 문제가 생겼어요. 잠시 뒤에 다시 해주세요.');
}
