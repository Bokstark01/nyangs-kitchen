<?php
// 냥's 키친 로그인 API
//   POST api.php?action=signup   {email, password, nickname}  → {token, user}
//   POST api.php?action=login    {email, password}            → {token, user}
//   POST api.php?action=exchange {code}                       → {token, user}  (카카오·구글 로그인 뒤)
//   GET  api.php?action=me                                    → {user}         (토큰 필요)
//   POST api.php?action=logout                                → {ok}           (토큰 필요)
//   POST api.php?action=delete                                → {ok}           (토큰 필요, 회원탈퇴)
//   GET  api.php?action=health                                → {ok}           (설치 확인용)
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';

cors();
$action = (string)($_GET['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    if ($action === 'health') {
        db()->query('SELECT 1 FROM nk_users LIMIT 1');
        out(['ok' => true, 'kakao' => (bool)cfg('kakao_rest_key'), 'google' => (bool)cfg('google_client_id')]);
    }
    if ($action === 'me') {
        out(['user' => user_public(require_user())]);
    }
    if ($method !== 'POST') fail('method_not_allowed', 'POST로 요청해 주세요.', 405);
    $in = body();

    if ($action === 'signup') {
        throttle('signup', 10, 3600);
        $email = strtolower(trim((string)($in['email'] ?? '')));
        $pw = (string)($in['password'] ?? '');
        $nick = cut((string)($in['nickname'] ?? ''), 20);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) fail('invalid_email', '이메일 주소를 확인해 주세요.');
        if (strlen($pw) < 8 || strlen($pw) > 72 || !preg_match('/[A-Za-z]/', $pw) || !preg_match('/\d/', $pw)) fail('weak_password', '비밀번호는 8자 이상, 영문과 숫자를 섞어 주세요.');
        if ($nick === '') fail('invalid_nickname', '닉네임을 적어주세요.');
        $st = db()->prepare("SELECT id FROM nk_users WHERE provider = 'email' AND provider_id = ?");
        $st->execute([$email]);
        if ($st->fetch()) fail('email_taken', '이미 가입된 이메일이에요. 로그인해 주세요.', 409);
        db()->prepare("INSERT INTO nk_users (provider, provider_id, email, password_hash, nickname, created_at, last_login_at) VALUES ('email', ?, ?, ?, ?, ?, ?)")
            ->execute([$email, $email, password_hash($pw, PASSWORD_DEFAULT), $nick, now(), now()]);
        $u = find_user((int)db()->lastInsertId());
        out(['token' => issue_token((int)$u['id']), 'user' => user_public($u)], 201);
    }

    if ($action === 'login') {
        throttle('login', 20, 900);
        $email = strtolower(trim((string)($in['email'] ?? '')));
        $pw = (string)($in['password'] ?? '');
        $st = db()->prepare("SELECT * FROM nk_users WHERE provider = 'email' AND provider_id = ?");
        $st->execute([$email]);
        $u = $st->fetch();
        if (!$u || !password_verify($pw, (string)$u['password_hash'])) fail('invalid_credentials', '이메일이나 비밀번호가 맞지 않아요.', 401);
        if (password_needs_rehash((string)$u['password_hash'], PASSWORD_DEFAULT)) {
            db()->prepare('UPDATE nk_users SET password_hash = ? WHERE id = ?')->execute([password_hash($pw, PASSWORD_DEFAULT), $u['id']]);
        }
        db()->prepare('UPDATE nk_users SET last_login_at = ? WHERE id = ?')->execute([now(), $u['id']]);
        out(['token' => issue_token((int)$u['id']), 'user' => user_public($u)]);
    }

    if ($action === 'exchange') {
        throttle('exchange', 30, 900);
        $code = strtolower((string)($in['code'] ?? ''));
        if (!preg_match('/^[a-f0-9]{64}$/', $code)) fail('invalid_code', '로그인을 다시 시도해 주세요.');
        $st = db()->prepare('SELECT user_id FROM nk_codes WHERE code_hash = ? AND expires_at > ?');
        $st->execute([sha($code), now()]);
        $row = $st->fetch();
        db()->prepare('DELETE FROM nk_codes WHERE code_hash = ? OR expires_at < ?')->execute([sha($code), now()]);
        if (!$row) fail('invalid_code', '로그인 시간이 지났어요. 다시 시도해 주세요.', 401);
        $u = find_user((int)$row['user_id']);
        if (!$u) fail('invalid_code', '로그인을 다시 시도해 주세요.', 401);
        out(['token' => issue_token((int)$u['id']), 'user' => user_public($u)]);
    }

    if ($action === 'logout') {
        $t = request_token();
        if ($t !== null) db()->prepare('DELETE FROM nk_tokens WHERE token_hash = ?')->execute([sha($t)]);
        out(['ok' => true]);
    }

    if ($action === 'delete') {
        $u = require_user();
        delete_user((int)$u['id']);
        out(['ok' => true]);
    }

    fail('not_found', '없는 요청이에요.', 404);
} catch (Throwable $e) {
    error_log('nyangs-kitchen api error: ' . $e->getMessage());
    fail('server_error', '서버에 문제가 생겼어요. 잠시 뒤에 다시 해주세요.', 500);
}
