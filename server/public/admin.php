<?php
// 냥's 키친 관리자 페이지 (운영자 전용)
//  - 비밀번호는 서버에서  bash server/tools/admin-password.sh  로 정한다 (server/admin.hash, GitHub에 올라가지 않음)
//  - 서버 백업에 동의한 사용자의 급식소만 보인다. 공유 기능의 급식소는 보이지 않는다.
//  - 모든 로그인·열람·검색은 nk_admin_log 에 남는다.
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';

const NK_ADMIN_IDLE = 7200;   // 2시간 동안 아무것도 안 하면 로그아웃
const STATUS_KO = ['pending' => '확인 필요', 'active' => '찾는 중', 'rejected' => '반려', 'found' => '찾음', 'closed' => '닫힘'];

$secure = (($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off');
session_name('nk_admin');
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Strict']);
session_start();
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');   // 지도 타일 서버가 출처(도메인)만 확인할 수 있게
header('Cache-Control: no-store');

function admin_hash(): string {
    $f = (string)cfg('admin_hash_file', __DIR__ . '/../admin.hash');
    return is_file($f) ? trim((string)file_get_contents($f)) : '';
}
function alog(string $action, string $detail = ''): void {
    db()->prepare('INSERT INTO nk_admin_log (at, ip, action, detail) VALUES (?, ?, ?, ?)')->execute([now(), client_ip(), $action, cut($detail, 300)]);
}
function logged_in(): bool {
    if (empty($_SESSION['nk_admin'])) return false;
    if (now() - (int)($_SESSION['nk_seen'] ?? 0) > NK_ADMIN_IDLE) { $_SESSION = []; return false; }
    $_SESSION['nk_seen'] = now();
    return true;
}
function csrf(): string { if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = rand_token(); return $_SESSION['csrf']; }
function check_csrf(): void { if (!hash_equals((string)($_SESSION['csrf'] ?? ''), (string)($_POST['csrf'] ?? $_SERVER['HTTP_X_CSRF'] ?? ''))) { http_response_code(403); exit('요청이 만료됐어요. 새로고침해 주세요.'); } }
function h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function meters(float $a, float $b, float $c, float $d): float {
    $r = 6371000; $p1 = deg2rad($a); $p2 = deg2rad($c); $dp = deg2rad($c - $a); $dl = deg2rad($d - $b);
    $x = sin($dp / 2) ** 2 + cos($p1) * cos($p2) * sin($dl / 2) ** 2;
    return 2 * $r * asin(min(1, sqrt($x)));
}

$p = (string)($_GET['p'] ?? '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    /* ---------- 로그인 ---------- */
    if ($p === 'logout') { if (logged_in()) alog('logout'); $_SESSION = []; session_destroy(); header('Location: admin.php'); exit; }
    if (!logged_in()) {
        $err = '';
        if ($method === 'POST') {
            check_csrf();
            throttle('admin_login', 5, 900);
            $hash = admin_hash();
            if ($hash === '') $err = '관리자 비밀번호가 아직 없어요. 서버에서 bash server/tools/admin-password.sh 를 실행하세요.';
            elseif (password_verify((string)($_POST['pw'] ?? ''), $hash)) {
                session_regenerate_id(true);
                $_SESSION['nk_admin'] = true; $_SESSION['nk_seen'] = now();
                alog('login');
                header('Location: admin.php'); exit;
            } else { alog('login_failed'); $err = '비밀번호가 맞지 않아요.'; }
        }
        page_head('관리자 로그인');
        echo '<main class="login"><h1>냥\'s 키친 관리자</h1>'
           . ($err ? '<p class="err">' . h($err) . '</p>' : '')
           . '<form method="post"><input type="hidden" name="csrf" value="' . h(csrf()) . '">'
           . '<input type="password" name="pw" placeholder="관리자 비밀번호" autocomplete="current-password" autofocus required>'
           . '<button>로그인</button></form><p class="muted">15분에 5번까지 시도할 수 있어요. 모든 접속은 기록돼요.</p></main></body></html>';
        exit;
    }

    $db = db();

    /* ---------- 데이터 ---------- */
    if ($p === 'points') {   // 지도에 올릴 전체 급식소 (이름·위치만)
        alog('view_map');
        $rows = $db->query('SELECT b.id, b.name, b.lat, b.lng FROM nk_backup_points b JOIN nk_consents c ON c.user_id = b.user_id AND c.backup = 1')->fetchAll();
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(array_map(fn($r) => [(int)$r['id'], $r['name'], round((float)$r['lat'], 6), round((float)$r['lng'], 6)], $rows), JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($p === 'geo') {      // 동네·주소 검색 → 지도 이동 (카카오 REST 키가 있으면 카카오, 없으면 OpenStreetMap)
        $q = cut((string)($_GET['q'] ?? ''), 60);
        header('Content-Type: application/json; charset=utf-8');
        if ($q === '') { echo '[]'; exit; }
        $outG = [];
        $key = (string)cfg('kakao_rest_key', '');
        if ($key !== '') {
            foreach (['address', 'keyword'] as $kind) {
                $r = http_call('GET', "https://dapi.kakao.com/v2/local/search/{$kind}.json?size=8&query=" . rawurlencode($q), [], ['Authorization: KakaoAK ' . $key]);
                foreach ($r['json']['documents'] ?? [] as $d) {
                    $outG[] = ['name' => (string)($d['place_name'] ?? $d['address_name'] ?? ''), 'sub' => (string)($d['road_address_name'] ?? $d['address_name'] ?? ''), 'lat' => (float)$d['y'], 'lng' => (float)$d['x']];
                }
                if ($outG) break;
            }
        }
        if (!$outG) {
            $r = http_call('GET', 'https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=kr&accept-language=ko&limit=8&q=' . rawurlencode($q), [], ['User-Agent: nyangs-kitchen-admin/1.0 (https://nyangs-kitchen.com)']);
            foreach (($r['json'] ?? []) as $d) {
                if (!is_array($d) || !isset($d['lat'])) continue;
                $outG[] = ['name' => (string)($d['name'] ?: $d['display_name']), 'sub' => (string)$d['display_name'], 'lat' => (float)$d['lat'], 'lng' => (float)$d['lon']];
            }
        }
        alog('geo_search', $q);
        echo json_encode(array_slice($outG, 0, 8), JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($p === 'near') {     // 한 지점 반경 안 급식소와 주인 (유실묘 찾기용)
        if ($method !== 'POST') { http_response_code(405); exit; }
        check_csrf();
        $lat = (float)($_POST['lat'] ?? 0); $lng = (float)($_POST['lng'] ?? 0);
        $radius = min(1000, max(10, (int)($_POST['r'] ?? 100)));
        $reason = cut((string)($_POST['reason'] ?? ''), 120);
        if ($reason === '') { http_response_code(400); exit('검색 이유를 적어주세요.'); }
        alog('near_search', sprintf('%.5f,%.5f r=%d · %s', $lat, $lng, $radius, $reason));
        $dLat = $radius / 111320; $dLng = $radius / (111320 * max(0.2, cos(deg2rad($lat))));
        $st = $db->prepare('SELECT b.*, u.nickname, u.email, u.provider FROM nk_backup_points b JOIN nk_consents c ON c.user_id = b.user_id AND c.backup = 1 JOIN nk_users u ON u.id = b.user_id WHERE b.lat BETWEEN ? AND ? AND b.lng BETWEEN ? AND ?');
        $st->execute([$lat - $dLat, $lat + $dLat, $lng - $dLng, $lng + $dLng]);
        $out = [];
        foreach ($st->fetchAll() as $r) {
            $m = meters($lat, $lng, (float)$r['lat'], (float)$r['lng']);
            if ($m > $radius) continue;
            $out[] = ['m' => (int)round($m), 'name' => $r['name'], 'lat' => (float)$r['lat'], 'lng' => (float)$r['lng'],
                'times' => array_map(fn($t) => $t['t'], json_decode((string)$r['times'], true) ?: []), 'cats' => json_decode((string)$r['cats'], true) ?: [],
                'owner' => $r['nickname'], 'uid' => (int)$r['user_id'], 'contact' => $r['email'] ?: '(' . $r['provider'] . ' 로그인, 이메일 없음)'];
        }
        usort($out, fn($a, $b) => $a['m'] <=> $b['m']);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($out, JSON_UNESCAPED_UNICODE);
        exit;
    }

    /* ---------- 유실 신고 ---------- */
    if ($p === 'lostphoto') {
        $l = find_lost((int)($_GET['id'] ?? 0));
        if (!$l || !$l['photo']) { http_response_code(404); exit; }
        $f = lost_photo_dir((int)$l['id']) . '/' . basename((string)$l['photo']);
        if (!is_file($f)) { http_response_code(404); exit; }
        header('Content-Type: image/jpeg'); readfile($f); exit;
    }
    if ($p === 'lost_act' && $method === 'POST') {
        check_csrf();
        $l = find_lost((int)($_POST['id'] ?? 0));
        $do = (string)($_POST['do'] ?? '');
        if ($l) {
            if ($do === 'notify') {
                $r = (int)($_POST['r'] ?? 50);
                if (!in_array($r, NK_LOST_STAGES, true)) $r = 50;
                $n = lost_notify($l, $r);
                alog('lost_notify', "#{$l['id']} r={$r} new={$n}");
                $_SESSION['flash'] = "신고 #{$l['id']}: {$r}m 안 급식소 주인 {$n}명에게 새로 알렸어요.";
            } elseif ($do === 'reject') {
                db()->prepare("UPDATE nk_lost SET status = 'rejected', admin_note = ?, updated_at = ? WHERE id = ?")->execute([cut((string)($_POST['note'] ?? ''), 300), now(), (int)$l['id']]);
                alog('lost_reject', "#{$l['id']}");
                $_SESSION['flash'] = "신고 #{$l['id']}를 반려했어요.";
            } elseif ($do === 'note') {
                db()->prepare('UPDATE nk_lost SET admin_note = ?, updated_at = ? WHERE id = ?')->execute([cut((string)($_POST['note'] ?? ''), 300), now(), (int)$l['id']]);
                alog('lost_note', "#{$l['id']}");
            }
        }
        header('Location: admin.php?p=lost'); exit;
    }
    if ($p === 'lost') {
        alog('view_lost');
        $rows = db()->query("SELECT l.*, u.nickname, u.email, u.provider FROM nk_lost l LEFT JOIN nk_users u ON u.id = l.user_id ORDER BY CASE l.status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 ELSE 2 END, l.id DESC LIMIT 60")->fetchAll();
        page_head('유실 신고');
        $flash = (string)($_SESSION['flash'] ?? ''); unset($_SESSION['flash']);
        $c = h(csrf());
        echo admin_nav('lost') . '<main class="pad">';
        if ($flash) echo '<p class="flash">' . h($flash) . '</p>';
        echo '<h2>유실 신고</h2><p class="muted">보호자 정보와 사진·특징을 확인한 뒤 <b>50m 알림</b>을 보내고, 소식이 없으면 <b>100m로 넓히기</b>를 누르세요. 급식소 위치는 보호자에게 보이지 않아요.</p>';
        if (!$rows) echo '<p class="muted">아직 신고가 없어요.</p>';
        foreach ($rows as $l) {
            $id = (int)$l['id']; $cnt = lost_counts($id);
            $near50 = count(owners_near((float)$l['lat'], (float)$l['lng'], 50, (int)$l['user_id']));
            $near100 = count(owners_near((float)$l['lat'], (float)$l['lng'], 100, (int)$l['user_id']));
            $rs = db()->prepare('SELECT r.*, u.nickname FROM nk_lost_replies r LEFT JOIN nk_users u ON u.id = r.user_id WHERE r.lost_id = ? ORDER BY r.id DESC');
            $rs->execute([$id]);
            echo '<article class="lost"><div class="ph">' . ($l['photo'] ? '<img src="admin.php?p=lostphoto&id=' . $id . '" alt="">' : '<span>사진 없음</span>') . '</div><div class="bd">'
               . '<b>#' . $id . ' ' . h($l['cat_name']) . '</b> <span class="st st-' . h($l['status']) . '">' . h(STATUS_KO[$l['status']] ?? $l['status']) . '</span>'
               . '<p>' . nl2br(h($l['description'])) . '</p>'
               . '<p class="muted">잃어버린 날 ' . h($l['lost_date']) . ' · 위치 ' . sprintf('%.5f, %.5f', $l['lat'], $l['lng']) . ' · 신고 ' . h(date('m/d H:i', (int)$l['created_at'])) . '<br>보호자 ' . h($l['nickname'] ?? '탈퇴') . ' (회원 #' . (int)$l['user_id'] . ', ' . h($l['email'] ?: $l['provider'] . ' 로그인') . ')' . ($l['contact'] ? ' · 공개 연락처 ' . h($l['contact']) : '') . '</p>'
               . '<p class="muted">반경 안 백업 급식소 주인: 50m ' . $near50 . '명 · 100m ' . $near100 . '명 · 지금까지 알림 ' . $cnt['notified'] . '명 (확인 ' . $cnt['opened'] . ')</p>';
            if (in_array($l['status'], ['pending', 'active'], true)) {
                echo '<div class="acts">';
                foreach (NK_LOST_STAGES as $r) {
                    if ((int)$l['radius'] >= $r) continue;
                    echo '<form method="post" action="admin.php?p=lost_act"><input type="hidden" name="csrf" value="' . $c . '"><input type="hidden" name="id" value="' . $id . '"><input type="hidden" name="do" value="notify"><input type="hidden" name="r" value="' . $r . '"><button>' . ($r === 50 ? '확인 · 50m 알림 보내기' : '100m로 넓히기') . '</button></form>';
                }
                if ($l['status'] === 'pending') echo '<form method="post" action="admin.php?p=lost_act" class="rej"><input type="hidden" name="csrf" value="' . $c . '"><input type="hidden" name="id" value="' . $id . '"><input type="hidden" name="do" value="reject"><input name="note" placeholder="반려 이유 (보호자에게 보여요)"><button class="ghost">반려</button></form>';
                echo '</div>';
            }
            foreach ($rs->fetchAll() as $r) echo '<p class="reply">' . ((int)$r['seen'] ? '👀 봤어요' : '🙅 못 봤어요') . ' · ' . h($r['nickname'] ?? '') . ' · ' . h(date('m/d H:i', (int)$r['created_at'])) . ($r['note'] !== '' ? ' — ' . h($r['note']) : '') . '</p>';
            echo '</div></article>';
        }
        echo '</main></body></html>';
        exit;
    }

    /* ---------- 이웃 게시판 ---------- */
    if ($p === 'boardphoto') {
        $post = find_post((int)($_GET['id'] ?? 0));
        $f = (string)($_GET['f'] ?? '');
        if (!$post || !preg_match('/^[a-f0-9]{32}\.jpg$/', $f) || !is_file(board_photo_dir((int)$post['id']) . "/$f")) { http_response_code(404); exit; }
        header('Content-Type: image/jpeg'); readfile(board_photo_dir((int)$post['id']) . "/$f"); exit;
    }
    if ($p === 'board_act' && $method === 'POST') {
        check_csrf();
        $id = (int)($_POST['id'] ?? 0); $do = (string)($_POST['do'] ?? ''); $kind = ($_POST['kind'] ?? '') === 'comment' ? 'comment' : 'post';
        $table = $kind === 'comment' ? 'nk_comments' : 'nk_posts';
        $st = $db->prepare("SELECT * FROM $table WHERE id = ?"); $st->execute([$id]); $t = $st->fetch();
        if ($t) {
            if ($do === 'hide') $db->prepare("UPDATE $table SET hidden = 2 WHERE id = ?")->execute([$id]);
            elseif ($do === 'show') {   // 문제없음: 다시 보이고 신고 기록을 비운다
                $db->prepare("UPDATE $table SET hidden = 0, report_count = 0 WHERE id = ?")->execute([$id]);
                $db->prepare('DELETE FROM nk_board_reports WHERE kind = ? AND target_id = ?')->execute([$kind, $id]);
            } elseif ($do === 'delete') { $kind === 'comment' ? delete_comment($id) : delete_post($id); }
            if ($kind === 'comment' && $do !== 'delete') board_recount((int)$t['post_id']);
            alog('board_' . $do, "$kind #$id");
            $_SESSION['flash'] = ($kind === 'comment' ? '댓글' : '글') . " #$id: " . ['hide' => '숨겼어요', 'show' => '다시 보이게 했어요', 'delete' => '지웠어요'][$do] ?? '';
        }
        header('Location: admin.php?p=board' . (($_POST['all'] ?? '') === '1' ? '&all=1' : '')); exit;
    }
    if ($p === 'board') {
        alog('view_board');
        $all = ($_GET['all'] ?? '') === '1';
        $rows = $db->query('SELECT p.*, u.nickname, u.email, u.provider FROM nk_posts p LEFT JOIN nk_users u ON u.id = p.user_id '
            . ($all ? '' : 'WHERE p.hidden = 1 OR p.report_count > 0 OR p.id IN (SELECT post_id FROM nk_comments WHERE hidden = 1 OR report_count > 0) OR p.created_at > ' . (now() - 3 * 86400) . ' ')
            . 'ORDER BY CASE WHEN p.hidden = 1 THEN 0 WHEN p.report_count > 0 THEN 1 ELSE 2 END, p.id DESC LIMIT 100')->fetchAll();
        page_head('게시판 관리');
        $flash = (string)($_SESSION['flash'] ?? ''); unset($_SESSION['flash']);
        $c = h(csrf());
        $btn = function (string $kind, int $id, string $do, string $label, bool $ghost = false) use ($c, $all) {
            return '<form method="post" action="admin.php?p=board_act"' . ($do === 'delete' ? ' onsubmit="return confirm(\'지울까요? 되돌릴 수 없어요.\')"' : '') . '><input type="hidden" name="csrf" value="' . $c . '"><input type="hidden" name="kind" value="' . $kind . '"><input type="hidden" name="id" value="' . $id . '"><input type="hidden" name="do" value="' . $do . '"><input type="hidden" name="all" value="' . ($all ? 1 : 0) . '"><button' . ($ghost ? ' class="ghost"' : '') . '>' . $label . '</button></form>';
        };
        $hiddenText = [0 => '', 1 => '<span class="st st-pending">신고 누적 숨김</span>', 2 => '<span class="st">운영자 숨김</span>'];
        echo admin_nav('board') . '<main class="pad">';
        if ($flash) echo '<p class="flash">' . h($flash) . '</p>';
        echo '<h2>이웃 게시판</h2><p class="muted">서로 다른 ' . NK_BOARD_HIDE_AT . '명이 신고하면 자동으로 숨겨져요. 확인 후 <b>문제없음</b>(다시 보이기·신고 비우기), <b>숨기기</b>, <b>지우기</b> 중에 고르세요. '
           . ($all ? '<a href="admin.php?p=board">신고·최근 3일만 보기</a>' : '지금은 신고된 글과 최근 3일 글만 보여요. <a href="admin.php?p=board&all=1">전체 보기</a>') . '</p>';
        if (!$rows) echo '<p class="muted">보여줄 글이 없어요.</p>';
        foreach ($rows as $r) {
            $id = (int)$r['id'];
            $photos = json_decode((string)$r['photos'], true) ?: [];
            $rep = $db->prepare("SELECT reason FROM nk_board_reports WHERE kind = 'post' AND target_id = ? ORDER BY id");
            $rep->execute([$id]);
            $reasons = array_filter(array_column($rep->fetchAll(), 'reason'));
            echo '<article class="lost"><div class="bd">'
               . '<b>#' . $id . ' [' . h(NK_BOARD_CATS[$r['category']] ?? $r['category']) . ']</b> ' . ($hiddenText[(int)$r['hidden']] ?? '') . ((int)$r['report_count'] ? ' <span class="st st-pending">신고 ' . (int)$r['report_count'] . '</span>' : '')
               . '<p>' . nl2br(h($r['body'])) . '</p>'
               . ($photos ? '<div class="thumbs">' . implode('', array_map(fn($f) => '<a href="admin.php?p=boardphoto&id=' . $id . '&f=' . h($f) . '" target="_blank"><img src="admin.php?p=boardphoto&id=' . $id . '&f=' . h($f) . '" alt=""></a>', $photos)) . '</div>' : '')
               . '<p class="muted">' . h($r['nickname'] ?? '탈퇴') . ' (회원 #' . (int)$r['user_id'] . ', ' . h($r['email'] ?: $r['provider'] . ' 로그인') . ') · ' . h($r['area'] ?: '위치 없음') . ' · ' . h(date('m/d H:i', (int)$r['created_at'])) . ' · 댓글 ' . (int)$r['comment_count'] . '</p>'
               . ($reasons ? '<p class="muted">신고 이유: ' . h(implode(' / ', $reasons)) . '</p>' : '')
               . '<div class="acts">' . ((int)$r['hidden'] || (int)$r['report_count'] ? $btn('post', $id, 'show', '문제없음') : '') . ((int)$r['hidden'] !== 2 ? $btn('post', $id, 'hide', '숨기기', true) : '') . $btn('post', $id, 'delete', '지우기', true) . '</div>';
            $cs = $db->prepare('SELECT c.*, u.nickname FROM nk_comments c LEFT JOIN nk_users u ON u.id = c.user_id WHERE c.post_id = ? ORDER BY c.id');
            $cs->execute([$id]);
            foreach ($cs->fetchAll() as $cm) {
                $cid = (int)$cm['id']; $flag = (int)$cm['hidden'] || (int)$cm['report_count'];
                echo '<div class="reply"' . ($flag ? ' style="background:#FFE6DE"' : '') . '>' . h($cm['nickname'] ?? '탈퇴') . ' (#' . (int)$cm['user_id'] . ') · ' . h(date('m/d H:i', (int)$cm['created_at'])) . ' — ' . h($cm['body'])
                   . ($flag ? ' ' . ($hiddenText[(int)$cm['hidden']] ?? '') . ((int)$cm['report_count'] ? ' <span class="st st-pending">신고 ' . (int)$cm['report_count'] . '</span>' : '') : '')
                   . '<div class="acts">' . ($flag ? $btn('comment', $cid, 'show', '문제없음') : '') . ((int)$cm['hidden'] !== 2 ? $btn('comment', $cid, 'hide', '숨기기', true) : '') . $btn('comment', $cid, 'delete', '지우기', true) . '</div></div>';
            }
            echo '</div></article>';
        }
        echo '</main></body></html>';
        exit;
    }

    /* ---------- 츄르 챌린지: 30일 달성자 사진 확인 → 쿠폰 발송 ---------- */
    if ($p === 'churuphoto') {
        $u = (int)($_GET['u'] ?? 0); $f = (string)($_GET['f'] ?? '');
        if (!preg_match('/^[a-f0-9]{32}\.jpg$/', $f) || !is_file(churu_dir($u) . "/$f")) { http_response_code(404); exit; }
        header('Content-Type: image/jpeg'); readfile(churu_dir($u) . "/$f"); exit;
    }
    if ($p === 'churu_act' && $method === 'POST') {
        check_csrf();
        $u = (int)($_POST['u'] ?? 0); $do = (string)($_POST['do'] ?? '');
        $c = find_churu($u);
        if ($c && $c['status'] === 'claimed' && in_array($do, ['sent', 'reject'], true)) {
            $note = $do === 'reject' ? cut((string)($_POST['note'] ?? ''), 200) : '';
            // 보냈든 반려했든 번호·사진·급식소 위치는 바로 지운다 (결과와 날짜만 남김)
            churu_wipe_photos($u);
            $db->prepare('UPDATE nk_churu SET status = ?, phone = NULL, lat = 0, lng = 0, note = ?, updated_at = ? WHERE user_id = ?')
                ->execute([$do === 'sent' ? 'sent' : 'rejected', $note, now(), $u]);
            alog('churu_' . $do, "회원 #$u");
            $_SESSION['flash'] = "회원 #$u: " . ($do === 'sent' ? '보냄 처리하고 번호·사진을 지웠어요' : '반려하고 번호·사진을 지웠어요');
        }
        header('Location: admin.php?p=churu'); exit;
    }
    if ($p === 'churu') {
        alog('view_churu');
        $rows = $db->query("SELECT c.*, u.nickname, u.email, u.provider FROM nk_churu c LEFT JOIN nk_users u ON u.id = c.user_id WHERE c.status = 'claimed' ORDER BY c.updated_at")->fetchAll();
        $cnt = []; foreach ($db->query('SELECT status, COUNT(*) AS n FROM nk_churu GROUP BY status')->fetchAll() as $r) $cnt[$r['status']] = (int)$r['n'];
        page_head('츄르 챌린지');
        $flash = (string)($_SESSION['flash'] ?? ''); unset($_SESSION['flash']);
        $cs = h(csrf());
        echo admin_nav('churu') . '<main class="pad">';
        if ($flash) echo '<p class="flash">' . h($flash) . '</p>';
        echo '<h2>츄르 챌린지</h2><p class="muted">진행 중 ' . ($cnt['active'] ?? 0) . '명 · 번호 입력 대기 ' . ($cnt['done'] ?? 0) . '명 · <b>확인 대기 ' . ($cnt['claimed'] ?? 0) . '명</b> · 보냄 ' . ($cnt['sent'] ?? 0) . '명 · 반려 ' . ($cnt['rejected'] ?? 0) . '명</p>'
           . '<p class="muted">사진 30장이 같은 급식소에서 매일 찍은 게 맞는지 보고, 쿠폰을 보낸 뒤 <b>보냄</b>을 누르세요. 누르는 순간 번호와 사진이 지워져요.</p>';
        if (!$rows) echo '<p class="muted">확인할 신청이 없어요.</p>';
        foreach ($rows as $r) {
            $u = (int)$r['user_id'];
            $ds = $db->prepare('SELECT day, photo, meters FROM nk_churu_days WHERE user_id = ? ORDER BY day');
            $ds->execute([$u]); $days = $ds->fetchAll();
            echo '<article class="lost"><div class="bd"><b>' . h($r['nickname'] ?? '탈퇴') . '</b> (회원 #' . $u . ', ' . h($r['email'] ?: $r['provider'] . ' 로그인') . ')'
               . '<p>받을 번호: <b>' . h($r['phone']) . '</b> · 급식소: ' . h($r['spot_name']) . ' · ' . h($r['start_day']) . ' ~ ' . h((string)$r['done_day']) . ' · 인증 ' . count($days) . '일</p>'
               . '<div style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0">' . implode('', array_map(fn($d) => '<a href="admin.php?p=churuphoto&u=' . $u . '&f=' . h($d['photo']) . '" target="_blank" style="display:flex;flex-direction:column;align-items:center;gap:3px;font-size:11px;color:#8a84a3;text-decoration:none"><img src="admin.php?p=churuphoto&u=' . $u . '&f=' . h($d['photo']) . '" alt="" style="width:92px;height:92px;object-fit:cover;border-radius:12px"><span>' . h(substr((string)$d['day'], 5)) . ' · ' . (int)$d['meters'] . 'm</span></a>', $days)) . '</div>'
               . '<div class="acts"><form method="post" action="admin.php?p=churu_act" onsubmit="return confirm(\'쿠폰을 보냈나요? 번호와 사진이 지워져요.\')"><input type="hidden" name="csrf" value="' . $cs . '"><input type="hidden" name="u" value="' . $u . '"><input type="hidden" name="do" value="sent"><button>보냄</button></form>'
               . '<form method="post" action="admin.php?p=churu_act" onsubmit="return confirm(\'반려할까요? 이 회원은 다시 참여할 수 없어요.\')"><input type="hidden" name="csrf" value="' . $cs . '"><input type="hidden" name="u" value="' . $u . '"><input type="hidden" name="do" value="reject"><input name="note" placeholder="반려 이유 (회원에게 보여요)" maxlength="200" style="min-width:220px"><button class="ghost">반려</button></form></div>'
               . '</div></article>';
        }
        echo '</main></body></html>';
        exit;
    }

    /* ---------- 화면 ---------- */
    $stat = fn(string $sql) => (int)$db->query($sql)->fetchColumn();
    $users = $stat('SELECT COUNT(*) FROM nk_users');
    $consented = $stat('SELECT COUNT(*) FROM nk_consents WHERE backup = 1');
    $points = $stat('SELECT COUNT(*) FROM nk_backup_points b JOIN nk_consents c ON c.user_id = b.user_id AND c.backup = 1');
    $shares = $stat('SELECT COUNT(*) FROM nk_shares');
    $new7 = $db->prepare('SELECT COUNT(*) FROM nk_users WHERE created_at > ?'); $new7->execute([now() - 7 * 86400]); $new7 = (int)$new7->fetchColumn();

    if ($p === 'log') {
        alog('view_log');
        $rows = $db->query('SELECT * FROM nk_admin_log ORDER BY id DESC LIMIT 300')->fetchAll();
        page_head('관리자 기록');
        echo admin_nav('log') . '<main class="pad"><h2>최근 관리자 기록 300건</h2><table><tr><th>시각</th><th>IP</th><th>동작</th><th>내용</th></tr>';
        foreach ($rows as $r) echo '<tr><td>' . h(date('Y-m-d H:i', (int)$r['at'])) . '</td><td>' . h($r['ip']) . '</td><td>' . h($r['action']) . '</td><td>' . h($r['detail']) . '</td></tr>';
        echo '</table></main></body></html>';
        exit;
    }

    $posts = $stat('SELECT COUNT(*) FROM nk_posts');
    page_head('관리자');
    $csrf = h(csrf());
    echo admin_nav('');
    echo <<<HTML
<section class="stats">
  <div><span>회원</span><b>{$users}</b><small>최근 7일 +{$new7}</small></div>
  <div><span>백업 동의</span><b>{$consented}</b><small>명</small></div>
  <div><span>백업된 급식소</span><b>{$points}</b><small>곳 (지도 표시)</small></div>
  <div><span>공유 중인 급식소</span><b>{$shares}</b><small>곳 (내용은 보지 않음)</small></div>
  <div><span>게시판 글</span><b>{$posts}</b><small>개</small></div>
</section>
<section class="split">
  <div id="map"></div>
  <aside>
    <h2>동네 찾기</h2>
    <form id="geo" class="row"><input name="q" placeholder="예: 김포 대곶면, 대곶면 율생리, 역 이름" required style="flex:3"><button style="flex:1">찾기</button></form>
    <div id="georesults"></div>
    <h2 style="margin-top:18px">유실묘 찾기 · 반경 검색</h2>
    <p class="muted">지도에서 유실 지점을 누르고, 이유를 적은 뒤 검색하세요. 검색은 모두 기록돼요.</p>
    <form id="near">
      <input type="hidden" name="csrf" value="{$csrf}">
      <div class="row"><input name="lat" id="lat" placeholder="위도" required><input name="lng" id="lng" placeholder="경도" required></div>
      <div class="row"><select name="r"><option value="50">50m</option><option value="100" selected>100m</option><option value="300">300m</option></select></div>
      <div class="row"><input name="reason" placeholder="검색 이유 (예: 유실 신고 #12 확인)" required></div>
      <button>검색</button>
    </form>
    <div id="res"></div>
  </aside>
</section>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function(){
  var map = L.map('map').setView([36.4, 127.8], 7);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution:'© OpenStreetMap contributors'}).addTo(map);
  var esc = function(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  fetch('admin.php?p=points').then(function(r){ return r.json(); }).then(function(rows){
    var b = [];
    rows.forEach(function(p){ L.circleMarker([p[2], p[3]], {radius:7, color:'#FFFFFF', fillColor:'#8E7CF6', fillOpacity:1, weight:2.5}).bindTooltip(esc(p[1])).addTo(map); b.push([p[2], p[3]]); });
    if (b.length) map.fitBounds(b, {padding:[30,30], maxZoom:16});
  });
  var pin = null, rings = [];
  map.on('click', function(e){
    document.getElementById('lat').value = e.latlng.lat.toFixed(6);
    document.getElementById('lng').value = e.latlng.lng.toFixed(6);
    if (pin) pin.remove(); pin = L.marker(e.latlng).addTo(map);
  });
  var geoLayer = null;
  document.getElementById('geo').addEventListener('submit', function(ev){
    ev.preventDefault();
    var q = new FormData(ev.target).get('q'), box = document.getElementById('georesults');
    box.innerHTML = '<p class="muted">찾는 중…</p>';
    fetch('admin.php?p=geo&q=' + encodeURIComponent(q)).then(function(r){ return r.json(); }).then(function(rows){
      if (!rows.length) { box.innerHTML = '<p class="muted">찾지 못했어요. 읍·면·동 이름이나 도로명으로 다시 해보세요.</p>'; return; }
      box.innerHTML = rows.map(function(g, i){ return '<button type="button" class="geo" data-i="' + i + '"><b>' + esc(g.name) + '</b><span>' + esc(g.sub) + '</span></button>'; }).join('');
      box.querySelectorAll('.geo').forEach(function(b){ b.addEventListener('click', function(){
        var g = rows[+b.dataset.i];
        map.setView([g.lat, g.lng], 16);
        if (geoLayer) geoLayer.remove();
        geoLayer = L.circleMarker([g.lat, g.lng], {radius:9, color:'#E8735A', weight:3, fill:false}).bindTooltip(esc(g.name)).addTo(map);
        document.getElementById('lat').value = g.lat.toFixed(6); document.getElementById('lng').value = g.lng.toFixed(6);
      }); });
      if (rows.length === 1) box.querySelector('.geo').click();
    }).catch(function(){ box.innerHTML = '<p class="err">검색에 실패했어요.</p>'; });
  });
  document.getElementById('near').addEventListener('submit', function(ev){
    ev.preventDefault();
    var fd = new FormData(ev.target), lat = +fd.get('lat'), lng = +fd.get('lng'), r = +fd.get('r');
    rings.forEach(function(x){ x.remove(); }); rings = [50, 100].concat(r > 100 ? [r] : []).map(function(m){ return L.circle([lat, lng], {radius:m, color:'#E8735A', weight:2, dashArray:'6 6', fill:false}).addTo(map); });
    map.setView([lat, lng], 17);
    fetch('admin.php?p=near', {method:'POST', body:fd}).then(function(res){ return res.ok ? res.json() : res.text().then(function(t){ throw new Error(t); }); }).then(function(rows){
      document.getElementById('res').innerHTML = rows.length ? '<p><b>' + rows.length + '곳</b> 찾았어요 (가까운 순)</p>' + rows.map(function(p){
        return '<div class="hit"><b>' + p.m + 'm · ' + esc(p.name) + '</b><span>주인: ' + esc(p.owner) + ' (회원 #' + p.uid + ') · ' + esc(p.contact) + '</span><span>밥 시간 ' + esc(p.times.join(', ') || '-') + ' · 고양이 ' + esc(p.cats.join(', ') || '-') + '</span></div>';
      }).join('') : '<p class="muted">반경 안에 백업된 급식소가 없어요.</p>';
    }).catch(function(e){ document.getElementById('res').innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  });
})();
</script>
</body></html>
HTML;
} catch (Throwable $e) {
    error_log('nyangs-kitchen admin error: ' . $e->getMessage());
    http_response_code(500);
    echo '서버 오류가 났어요.';
}

function admin_nav(string $on): string {
    $n = (int)db()->query("SELECT COUNT(*) FROM nk_lost WHERE status = 'pending'")->fetchColumn();
    $b = (int)db()->query('SELECT (SELECT COUNT(*) FROM nk_posts WHERE hidden = 1 OR (hidden = 0 AND report_count > 0)) + (SELECT COUNT(*) FROM nk_comments WHERE hidden = 1 OR (hidden = 0 AND report_count > 0))')->fetchColumn();
    $cz = (int)db()->query("SELECT COUNT(*) FROM nk_churu WHERE status = 'claimed'")->fetchColumn();
    $items = ['' => '지도', 'lost' => '유실 신고' . ($n ? " ($n)" : ''), 'board' => '게시판' . ($b ? " (신고 $b)" : ''), 'churu' => '츄르' . ($cz ? " ($cz)" : ''), 'log' => '열람 기록'];
    $h = '';
    foreach ($items as $k => $label) $h .= '<a href="admin.php' . ($k !== '' ? '?p=' . $k : '') . '"' . ($k === $on ? ' class="on"' : '') . '>' . h($label) . '</a>';
    return '<header><b>냥\'s 키친 관리자</b><nav>' . $h . '<a href="admin.php?p=logout">로그아웃</a></nav></header>';
}

function page_head(string $title): void {
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#8E7CF6"><link rel="icon" href="assets/icon-192.png"><title>' . h($title) . '</title><style>'
       . '@font-face{font-family:"SUIT Variable";font-weight:100 900;font-display:swap;src:url("assets/SUIT-Variable.woff2") format("woff2-variations"),url("assets/SUIT-Variable.woff2") format("woff2")}'
       . ':root{--g:#7B6CF0;--grad:linear-gradient(135deg,#8E7CF6 0%,#B79BFF 55%,#FFB8A0 100%);--line:#E6E0F2;--bg:#F7F4FB;--ink:#2B2640;--mut:#6F6985;--lift:0 10px 28px -16px rgba(75,59,184,.45);--coral:#E8735A}*{box-sizing:border-box}'
       . 'body{margin:0;font:15px/1.55 "SUIT Variable","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif;background:var(--bg);color:var(--ink)}'
       . 'header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 20px;background:var(--grad);color:#fff;box-shadow:0 8px 24px -16px rgba(75,59,184,.7)}header b{display:flex;align-items:center;gap:10px;font-size:18px;font-weight:800;letter-spacing:-.4px}header b::before{content:"";width:30px;height:30px;border-radius:9px;background:url(assets/icon-192.png) center/cover;box-shadow:0 4px 10px -4px rgba(60,40,140,.6)}'
       . 'header nav{display:flex;flex-wrap:wrap;gap:6px}header nav a{color:#fff;text-decoration:none;padding:7px 13px;border-radius:999px;font-weight:600;font-size:14px;opacity:.9}header nav a:hover{background:rgba(255,255,255,.18)}header nav a.on{background:#fff;color:var(--g);opacity:1;font-weight:800;box-shadow:0 6px 14px -8px rgba(60,40,140,.6)}'
       . '.stats{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;padding:16px 20px}.stats div{background:linear-gradient(#fff,#FCFAFF);border:1px solid var(--line);border-radius:20px;padding:14px 16px;display:flex;flex-direction:column;box-shadow:var(--lift)}.stats span{font-size:13px;color:var(--mut);font-weight:600}.stats b{font-size:28px;font-weight:800;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent;width:max-content}.stats small{color:var(--mut)}'
       . '.split{display:grid;grid-template-columns:1fr 390px;gap:14px;padding:0 20px 20px;height:calc(100vh - 200px);min-height:480px}#map{border-radius:22px;min-height:380px;box-shadow:var(--lift)}aside{background:#fff;border:1px solid var(--line);border-radius:22px;padding:18px;overflow:auto;box-shadow:var(--lift)}aside h2{font-size:17px;font-weight:800;margin:0 0 6px}'
       . 'input,select{border:1.5px solid var(--line);border-radius:14px;padding:11px 12px;font:inherit;width:100%;min-width:0;background:#fff;color:var(--ink)}input:focus,select:focus{outline:none;border-color:#B79BFF}.row{display:flex;gap:8px;margin-bottom:8px}'
       . 'button{background:var(--grad);color:#fff;border:0;border-radius:14px;padding:11px 16px;font:inherit;font-weight:700;cursor:pointer;width:100%;box-shadow:0 10px 20px -12px rgba(123,108,240,.8);transition:transform .45s cubic-bezier(.34,1.56,.64,1)}button:active{transform:scale(.96)}'
       . '.hit{border-top:1px solid var(--line);padding:10px 0;display:flex;flex-direction:column;gap:2px}.hit span{font-size:13px;color:var(--mut)}.muted{color:var(--mut);font-size:13px}.muted a{color:var(--g)}.err{color:#C4513A}'
       . '.login{max-width:380px;margin:12vh auto;background:#fff;border-radius:28px;padding:30px;display:flex;flex-direction:column;gap:14px;box-shadow:0 30px 60px -30px rgba(75,59,184,.6)}.login h1{font-size:22px;font-weight:800;margin:0;letter-spacing:-.4px}.login form{display:flex;flex-direction:column;gap:10px}'
       . '.pad{padding:20px}.pad h2{font-weight:800;letter-spacing:-.4px}table{width:100%;border-collapse:separate;border-spacing:0;background:#fff;font-size:13px;border-radius:18px;overflow:hidden;box-shadow:var(--lift)}th{background:#F0ECF8}th,td{border-bottom:1px solid var(--line);padding:8px 10px;text-align:left}'
       . '.geo{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;background:#F7F4FB;color:var(--ink);border:1px solid var(--line);border-radius:14px;padding:9px 12px;margin-bottom:6px;text-align:left;font-weight:400;box-shadow:none}.geo span{font-size:12px;color:var(--mut)}.geo:hover{border-color:#B79BFF}'
       . '.flash{background:#EEEAFF;color:#4B3FB8;padding:11px 16px;border-radius:14px;font-weight:600}.lost{display:flex;gap:16px;background:#fff;border:1px solid var(--line);border-radius:22px;padding:16px;margin:14px 0;box-shadow:var(--lift)}.lost .ph{width:140px;flex-shrink:0}.lost img{width:140px;border-radius:16px}.lost .ph span{display:block;width:140px;height:100px;background:#F0ECF8;border-radius:16px;text-align:center;line-height:100px;color:var(--mut);font-size:13px}.lost .bd{flex:1;min-width:0}.lost p{margin:6px 0}'
       . '.acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.acts form{display:flex;gap:6px}.acts button{width:auto}.acts .rej input{width:220px}button.ghost{background:#fff;color:#C4513A;border:1.5px solid #F2B3A4;box-shadow:none}.reply{background:#F7F4FB;border-radius:12px;padding:8px 12px;font-size:13px;margin:6px 0}.reply .acts button{padding:5px 10px;font-size:12px}.thumbs{display:flex;gap:8px;flex-wrap:wrap}.thumbs img{width:150px;height:150px;object-fit:cover;border-radius:16px}'
       . '.st{font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;background:#F0ECF8;color:#6F6985}.st-pending{background:#FFE6DE;color:#C4513A}.st-active{background:#EEEAFF;color:#4B3FB8}'
       . 'body:has(.login){background:var(--grad);min-height:100vh}.login::before{content:"";width:64px;height:64px;border-radius:20px;background:url(assets/icon-192.png) center/cover;box-shadow:0 12px 24px -10px rgba(60,40,140,.6)}'
       . 'form:has(input[name=do][value=hide]) button.ghost{color:#4B3FB8;border-color:#CFC6EA}header nav a[href$="logout"]{opacity:.75;font-weight:500}'
       . '@media(max-width:800px){.stats{grid-template-columns:repeat(2,1fr)}.split{grid-template-columns:1fr;height:auto}#map{height:55vh}}'
       . '</style></head><body>';
}
