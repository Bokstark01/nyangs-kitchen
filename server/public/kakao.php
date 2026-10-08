<?php
// 카카오 로그인: 처음 열면 카카오로 보내고, 카카오가 돌려보내면(code) 회원을 찾거나 만든 뒤 앱으로 돌아간다.
// 카카오 개발자 콘솔에 등록할 Redirect URI = {base_url}/kakao.php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';

$redirectUri = rtrim((string)cfg('base_url'), '/') . '/kakao.php';
try {
    if (!cfg('kakao_rest_key')) oauth_fail('kakao_not_configured', '카카오 로그인이 아직 서버에 설정되지 않았어요.');

    if (!isset($_GET['code']) && !isset($_GET['error'])) {
        $q = http_build_query([
            'client_id' => cfg('kakao_rest_key'),
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'state' => oauth_new_state('kakao'),
        ]);
        header('Location: https://kauth.kakao.com/oauth/authorize?' . $q, true, 302);
        exit;
    }
    if (isset($_GET['error'])) oauth_fail('kakao_' . preg_replace('/\W/', '', (string)$_GET['error']), '카카오 로그인을 취소했어요.');
    if (!oauth_take_state('kakao', (string)($_GET['state'] ?? ''))) oauth_fail('bad_state', '로그인 시간이 지났어요. 다시 시도해 주세요.');

    $form = [
        'grant_type' => 'authorization_code',
        'client_id' => cfg('kakao_rest_key'),
        'redirect_uri' => $redirectUri,
        'code' => (string)$_GET['code'],
    ];
    if (cfg('kakao_client_secret')) $form['client_secret'] = cfg('kakao_client_secret');
    $tok = http_call('POST', 'https://kauth.kakao.com/oauth/token', $form);
    $access = $tok['json']['access_token'] ?? '';
    if ($access === '') oauth_fail('kakao_token', '카카오 로그인에 실패했어요. (' . ($tok['json']['error_code'] ?? $tok['status']) . ')');

    $me = http_call('GET', 'https://kapi.kakao.com/v2/user/me', [], ['Authorization: Bearer ' . $access]);
    $id = (string)($me['json']['id'] ?? '');
    if ($id === '') oauth_fail('kakao_profile', '카카오 계정 정보를 받지 못했어요.');
    $acc = $me['json']['kakao_account'] ?? [];
    $nick = (string)($acc['profile']['nickname'] ?? ($me['json']['properties']['nickname'] ?? ''));
    $email = (!empty($acc['email']) && !empty($acc['is_email_verified'])) ? (string)$acc['email'] : null;

    finish_to_app(upsert_social('kakao', $id, $email, $nick));
} catch (Throwable $e) {
    oauth_fail('server_error', '서버에 문제가 생겼어요. 잠시 뒤에 다시 해주세요.');
}
