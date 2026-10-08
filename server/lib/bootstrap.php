<?php
// 냥's 키친 로그인 서버 공통 코드. 웹에서 직접 열리지 않는 폴더(lib/)에 둔다.
declare(strict_types=1);

$NK_CONFIG_FILE = getenv('NK_CONFIG') ?: __DIR__ . '/../config.php';
if (!is_file($NK_CONFIG_FILE)) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    exit("config.php 파일이 없어요. config.sample.php를 복사해서 만들어 주세요.\n");
}
$GLOBALS['NK_CFG'] = require $NK_CONFIG_FILE;

function cfg(string $key, $default = null) { return $GLOBALS['NK_CFG'][$key] ?? $default; }
function now(): int { return time(); }

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO((string)cfg('db_dsn'), (string)cfg('db_user', ''), (string)cfg('db_pass', ''), [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
    return $pdo;
}

/* ---------- 응답 ---------- */
function cors(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = cfg('allowed_origins', ['https://localhost', 'http://localhost', 'capacitor://localhost']);
    if ($origin !== '' && in_array($origin, $allowed, true)) {
        header("Access-Control-Allow-Origin: $origin");
        header('Vary: Origin');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-NK-Token');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Max-Age: 86400');
    }
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') { http_response_code(204); exit; }
}
function out(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
function fail(string $code, string $message, int $status = 400): void { out(['error' => $code, 'message' => $message], $status); }
function body(): array {
    $raw = file_get_contents('php://input') ?: '';
    $j = json_decode($raw, true);
    return is_array($j) ? $j : [];
}

/* ---------- 보안 도구 ---------- */
function rand_token(): string { return bin2hex(random_bytes(32)); }
function sha(string $s): string { return hash('sha256', $s); }
function client_ip(): string { return (string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'); }
function cut(string $s, int $n): string { return preg_replace('/^(.{' . $n . '}).*$/us', '$1', trim($s)) ?? ''; }

// 같은 IP에서 짧은 시간에 너무 많이 시도하면 막는다
function throttle(string $action, int $max, int $windowSec): void {
    $db = db();
    $db->prepare('DELETE FROM nk_attempts WHERE at < ?')->execute([now() - 86400]);
    $st = $db->prepare('SELECT COUNT(*) FROM nk_attempts WHERE ip = ? AND action = ? AND at > ?');
    $st->execute([client_ip(), $action, now() - $windowSec]);
    if ((int)$st->fetchColumn() >= $max) fail('rate_limited', '요청이 너무 많아요. 잠시 뒤에 다시 해주세요.', 429);
    $db->prepare('INSERT INTO nk_attempts (ip, action, at) VALUES (?, ?, ?)')->execute([client_ip(), $action, now()]);
}

/* ---------- 로그인 토큰 ---------- */
function issue_token(int $userId): string {
    $t = rand_token();
    db()->prepare('INSERT INTO nk_tokens (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
        ->execute([sha($t), $userId, now(), now() + (int)cfg('token_days', 90) * 86400]);
    return $t;
}
function request_token(): ?string {
    $h = $_SERVER['HTTP_X_NK_TOKEN'] ?? '';
    if ($h === '') {
        $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if ($auth === '' && function_exists('apache_request_headers')) {
            $all = apache_request_headers();
            $auth = $all['Authorization'] ?? $all['authorization'] ?? '';
        }
        if (preg_match('/^Bearer\s+(\S+)$/i', trim($auth), $m)) $h = $m[1];
    }
    $h = strtolower(trim($h));
    return preg_match('/^[a-f0-9]{64}$/', $h) ? $h : null;
}
function current_user(): ?array {
    $t = request_token();
    if ($t === null) return null;
    $st = db()->prepare('SELECT u.* FROM nk_tokens t JOIN nk_users u ON u.id = t.user_id WHERE t.token_hash = ? AND t.expires_at > ?');
    $st->execute([sha($t), now()]);
    $u = $st->fetch();
    return $u ?: null;
}
function require_user(): array {
    $u = current_user();
    if ($u === null) fail('unauthorized', '다시 로그인해 주세요.', 401);
    return $u;
}
function user_public(array $u): array {
    return ['id' => (int)$u['id'], 'nickname' => $u['nickname'], 'email' => $u['email'], 'provider' => $u['provider']];
}
function find_user(int $id): ?array {
    $st = db()->prepare('SELECT * FROM nk_users WHERE id = ?');
    $st->execute([$id]);
    $u = $st->fetch();
    return $u ?: null;
}
function delete_user(int $id): void {
    $db = db();
    $db->prepare('DELETE FROM nk_tokens WHERE user_id = ?')->execute([$id]);
    $db->prepare('DELETE FROM nk_codes WHERE user_id = ?')->execute([$id]);
    $db->prepare('DELETE FROM nk_users WHERE id = ?')->execute([$id]);
}

/* ---------- 카카오·구글 공통 ---------- */
function upsert_social(string $provider, string $providerId, ?string $email, string $nickname): array {
    $db = db();
    $st = $db->prepare('SELECT * FROM nk_users WHERE provider = ? AND provider_id = ?');
    $st->execute([$provider, $providerId]);
    $u = $st->fetch();
    if ($u) {
        $db->prepare('UPDATE nk_users SET last_login_at = ? WHERE id = ?')->execute([now(), $u['id']]);
        return $u;
    }
    $nick = cut($nickname !== '' ? $nickname : '집사', 20);
    $db->prepare('INSERT INTO nk_users (provider, provider_id, email, password_hash, nickname, created_at, last_login_at) VALUES (?, ?, ?, NULL, ?, ?, ?)')
        ->execute([$provider, $providerId, $email ? cut($email, 190) : null, $nick, now(), now()]);
    return find_user((int)$db->lastInsertId());
}
function oauth_new_state(string $provider): string {
    $s = rand_token();
    $db = db();
    $db->prepare('DELETE FROM nk_oauth WHERE created_at < ?')->execute([now() - 600]);
    $db->prepare('INSERT INTO nk_oauth (state_hash, provider, created_at) VALUES (?, ?, ?)')->execute([sha($s), $provider, now()]);
    return $s;
}
function oauth_take_state(string $provider, string $state): bool {
    if (!preg_match('/^[a-f0-9]{64}$/', $state)) return false;
    $db = db();
    $st = $db->prepare('SELECT state_hash FROM nk_oauth WHERE state_hash = ? AND provider = ? AND created_at > ?');
    $st->execute([sha($state), $provider, now() - 600]);
    if (!$st->fetch()) return false;
    $db->prepare('DELETE FROM nk_oauth WHERE state_hash = ?')->execute([sha($state)]);
    return true;
}
// 로그인이 끝나면 앱으로 1회용 코드를 들고 돌아간다. 앱은 이 코드를 토큰으로 바꾼다.
function finish_to_app(array $user): void {
    $code = rand_token();
    db()->prepare('INSERT INTO nk_codes (code_hash, user_id, expires_at) VALUES (?, ?, ?)')->execute([sha($code), (int)$user['id'], now() + 300]);
    redirect_app(['code' => $code]);
}
function redirect_app(array $params): void {
    $url = cfg('app_redirect', 'com.nyangskitchen.app://auth') . '?' . http_build_query($params);
    $safe = htmlspecialchars($url, ENT_QUOTES, 'UTF-8');
    header('Location: ' . $url, true, 302);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    echo "<!doctype html><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>냥's 키친</title>"
       . "<body style=\"margin:0;font-family:sans-serif;text-align:center;padding:64px 16px;background:#1F4A36;color:#F4ECD6\">"
       . "<p>앱으로 돌아가는 중이에요…</p><p><a style=\"color:#BFE3CF;font-size:18px\" href=\"$safe\">앱으로 돌아가기</a></p></body>";
    exit;
}
function oauth_fail(string $code, string $message): void {
    error_log("nyangs-kitchen oauth error: $code $message");
    redirect_app(['error' => $code, 'error_description' => $message]);
}

/* ---------- 바깥 서버 호출 (curl 없으면 기본 기능으로) ---------- */
function http_call(string $method, string $url, array $form = [], array $headers = []): array {
    $payload = $form ? http_build_query($form) : '';
    if ($form) $headers[] = 'Content-Type: application/x-www-form-urlencoded;charset=utf-8';
    $headers[] = 'Accept: application/json';
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15, CURLOPT_HTTPHEADER => $headers, CURLOPT_CUSTOMREQUEST => $method]);
        if ($method === 'POST') curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        $raw = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);
    } else {
        $ctx = stream_context_create(['http' => ['method' => $method, 'header' => implode("\r\n", $headers), 'content' => $payload, 'timeout' => 15, 'ignore_errors' => true]]);
        $raw = @file_get_contents($url, false, $ctx);
        $status = 0;
        foreach ($http_response_header ?? [] as $line) if (preg_match('#^HTTP/\S+\s+(\d{3})#', $line, $m)) $status = (int)$m[1];
    }
    $json = is_string($raw) ? json_decode($raw, true) : null;
    return ['status' => $status, 'json' => is_array($json) ? $json : []];
}
