<?php
// 이웃 게시판 API (로그인 토큰 필요)
//   GET  board.php?action=list&cat=&near=1&lat=&lng=&before=   → {posts:[…], next, unread}
//   GET  board.php?action=post&id=1&lat=&lng=                  → {post, comments:[…]}
//   GET  board.php?action=photo&id=1&f=abc.jpg                  → JPEG
//   POST board.php?action=write          {cat, body, photos:[base64…], lat?, lng?} → {ok, id}
//   POST board.php?action=comment        {post_id, body}        → {ok}
//   POST board.php?action=delete         {post_id}              → {ok}  (내 글)
//   POST board.php?action=delete_comment {comment_id}           → {ok}  (내 댓글)
//   POST board.php?action=report         {kind:post|comment, id, reason} → {ok}
//   POST board.php?action=block          {user_id}  /  unblock {user_id}  → {ok}
//   GET  board.php?action=blocks                                → {blocks:[{id,nickname}]}
// 다른 사용자에게는 좌표를 보내지 않는다. 동네 이름과 대략 거리('약 2km')만 보낸다.
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';

cors();
$action = (string)($_GET['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function q_coord(string $k, float $lim): ?float {
    if (!isset($_GET[$k]) || $_GET[$k] === '') return null;
    $v = (float)$_GET[$k];
    return ($v >= -$lim && $v <= $lim && $v != 0.0) ? $v : null;
}
function visible_post(int $id, int $uid): array {
    $st = db()->prepare('SELECT p.*, u.nickname FROM nk_posts p LEFT JOIN nk_users u ON u.id = p.user_id WHERE p.id = ?');
    $st->execute([$id]);
    $p = $st->fetch();
    if (!$p || ((int)$p['hidden'] !== 0 && (int)$p['user_id'] !== $uid)) fail('not_found', '지워졌거나 숨겨진 글이에요.', 404);
    return $p;
}

try {
    $me = require_user();
    $uid = (int)$me['id'];
    $db = db();

    if ($action === 'list') {
        $lat = q_coord('lat', 90); $lng = q_coord('lng', 180);
        $where = ['(p.hidden = 0 OR p.user_id = ?)']; $args = [$uid];
        $blocked = blocked_ids($uid);
        if ($blocked) { $where[] = 'p.user_id NOT IN (' . implode(',', $blocked) . ')'; }
        $cat = (string)($_GET['cat'] ?? '');
        if (isset(NK_BOARD_CATS[$cat])) { $where[] = 'p.category = ?'; $args[] = $cat; }
        if (($_GET['mine'] ?? '') === '1') { $where[] = 'p.user_id = ?'; $args[] = $uid; }
        $before = (int)($_GET['before'] ?? 0);
        if ($before > 0) { $where[] = 'p.id < ?'; $args[] = $before; }
        if (($_GET['near'] ?? '') === '1') {
            if ($lat === null || $lng === null) fail('need_location', '내 위치를 알아야 동네 글을 볼 수 있어요.');
            $dLat = NK_BOARD_NEAR_M / 111320; $dLng = NK_BOARD_NEAR_M / (111320 * max(0.2, cos(deg2rad($lat))));
            $where[] = 'p.lat BETWEEN ? AND ? AND p.lng BETWEEN ? AND ?';
            array_push($args, $lat - $dLat, $lat + $dLat, $lng - $dLng, $lng + $dLng);
        }
        $st = $db->prepare('SELECT p.*, u.nickname FROM nk_posts p LEFT JOIN nk_users u ON u.id = p.user_id WHERE ' . implode(' AND ', $where) . ' ORDER BY p.id DESC LIMIT ' . NK_BOARD_PAGE);
        $st->execute($args);
        $rows = $st->fetchAll();
        $posts = array_map(fn($p) => post_view($p, $uid, $lat, $lng, false), $rows);
        $next = count($rows) === NK_BOARD_PAGE ? (int)end($rows)['id'] : null;
        out(['posts' => $posts, 'next' => $next, 'unread' => board_unread($uid)]);
    }

    if ($action === 'post') {
        $p = visible_post((int)($_GET['id'] ?? 0), $uid);
        if (in_array((int)$p['user_id'], blocked_ids($uid), true)) fail('not_found', '차단한 이웃의 글이에요.', 404);
        if ((int)$p['user_id'] === $uid) $db->prepare('UPDATE nk_posts SET seen_cid = (SELECT COALESCE(MAX(id), 0) FROM nk_comments WHERE post_id = ?) WHERE id = ?')->execute([(int)$p['id'], (int)$p['id']]);
        $blocked = blocked_ids($uid);
        $st = $db->prepare('SELECT c.*, u.nickname FROM nk_comments c LEFT JOIN nk_users u ON u.id = c.user_id WHERE c.post_id = ? AND (c.hidden = 0 OR c.user_id = ?) ORDER BY c.id');
        $st->execute([(int)$p['id'], $uid]);
        $comments = [];
        foreach ($st->fetchAll() as $c) {
            if (in_array((int)$c['user_id'], $blocked, true)) continue;
            $comments[] = ['id' => (int)$c['id'], 'body' => $c['body'], 'author_id' => (int)$c['user_id'], 'author' => (string)($c['nickname'] ?? '탈퇴한 회원'),
                'mine' => (int)$c['user_id'] === $uid, 'by_writer' => (int)$c['user_id'] === (int)$p['user_id'], 'hidden' => (int)$c['hidden'] !== 0, 'created_at' => (int)$c['created_at']];
        }
        out(['post' => post_view($p, $uid, q_coord('lat', 90), q_coord('lng', 180), true), 'comments' => $comments]);
    }

    if ($action === 'photo') {
        $p = visible_post((int)($_GET['id'] ?? 0), $uid);
        $f = (string)($_GET['f'] ?? '');
        $file = board_photo_dir((int)$p['id']) . '/' . $f;
        if (!preg_match('/^[a-f0-9]{32}\.jpg$/', $f) || !in_array($f, json_decode((string)$p['photos'], true) ?: [], true) || !is_file($file)) fail('not_found', '사진이 없어요.', 404);
        header('Content-Type: image/jpeg');
        header('Cache-Control: private, max-age=604800');
        readfile($file);
        exit;
    }

    if ($action === 'blocks') {
        $st = $db->prepare('SELECT b.blocked_id, u.nickname FROM nk_blocks b LEFT JOIN nk_users u ON u.id = b.blocked_id WHERE b.user_id = ? ORDER BY b.created_at DESC');
        $st->execute([$uid]);
        out(['blocks' => array_map(fn($r) => ['id' => (int)$r['blocked_id'], 'nickname' => (string)($r['nickname'] ?? '탈퇴한 회원')], $st->fetchAll())]);
    }

    if ($method !== 'POST') fail('method_not_allowed', 'POST로 요청해 주세요.', 405);
    $in = body();

    if ($action === 'write') {
        throttle('board_write', 10, 3600);
        $day = $db->prepare('SELECT COUNT(*) FROM nk_posts WHERE user_id = ? AND created_at > ?');
        $day->execute([$uid, now() - 86400]);
        if ((int)$day->fetchColumn() >= 20) fail('too_many', '오늘은 글을 충분히 쓰셨어요. 내일 다시 써주세요.', 429);
        $cat = (string)($in['cat'] ?? 'free');
        if (!isset(NK_BOARD_CATS[$cat])) $cat = 'free';
        $text = cut((string)($in['body'] ?? ''), 2000);
        $photosIn = is_array($in['photos'] ?? null) ? array_slice($in['photos'], 0, NK_BOARD_MAX_PHOTOS) : [];
        if ($text === '' && !$photosIn) fail('invalid', '내용을 적어주세요.');
        $lat = isset($in['lat']) ? (float)$in['lat'] : null; $lng = isset($in['lng']) ? (float)$in['lng'] : null;
        if ($lat === null || $lng === null || $lat < -90 || $lat > 90 || $lng < -180 || $lng > 180 || ($lat == 0.0 && $lng == 0.0)) { $lat = null; $lng = null; }
        $area = '';
        if ($lat !== null) { $lat = round($lat, 3); $lng = round($lng, 3); $area = region_name($lat, $lng); }
        $db->prepare('INSERT INTO nk_posts (user_id, category, body, photos, lat, lng, area, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            ->execute([$uid, $cat, $text, '[]', $lat, $lng, $area, now()]);
        $id = (int)$db->lastInsertId();
        $saved = [];
        foreach ($photosIn as $b64) {
            if (!is_string($b64)) continue;
            $f = save_jpeg_to(board_photo_dir($id), $b64, NK_BOARD_PHOTO_BYTES, NK_BOARD_PHOTO_PX);
            if ($f && !in_array($f, $saved, true)) $saved[] = $f;
        }
        if ($photosIn && !$saved && $text === '') { delete_post($id); fail('invalid', '사진을 올리지 못했어요. 다시 골라주세요.'); }
        $db->prepare('UPDATE nk_posts SET photos = ? WHERE id = ?')->execute([json_encode($saved), $id]);
        out(['ok' => true, 'id' => $id, 'photos' => count($saved), 'area' => $area], 201);
    }

    if ($action === 'comment') {
        throttle('board_comment', 60, 3600);
        $p = visible_post((int)($in['post_id'] ?? 0), $uid);
        if ((int)$p['hidden'] !== 0) fail('forbidden', '숨겨진 글에는 댓글을 달 수 없어요.', 403);
        $st = $db->prepare('SELECT 1 FROM nk_blocks WHERE user_id = ? AND blocked_id = ?');
        $st->execute([(int)$p['user_id'], $uid]);
        if ($st->fetch()) fail('forbidden', '이 글에는 댓글을 달 수 없어요.', 403);
        $text = cut((string)($in['body'] ?? ''), 500);
        if ($text === '') fail('invalid', '댓글을 적어주세요.');
        $db->prepare('INSERT INTO nk_comments (post_id, user_id, body, created_at) VALUES (?, ?, ?, ?)')->execute([(int)$p['id'], $uid, $text, now()]);
        board_recount((int)$p['id']);
        out(['ok' => true], 201);
    }

    if ($action === 'delete') {
        $p = find_post((int)($in['post_id'] ?? 0));
        if (!$p || (int)$p['user_id'] !== $uid) fail('forbidden', '내 글만 지울 수 있어요.', 403);
        delete_post((int)$p['id']);
        out(['ok' => true]);
    }

    if ($action === 'delete_comment') {
        $st = $db->prepare('SELECT * FROM nk_comments WHERE id = ?');
        $st->execute([(int)($in['comment_id'] ?? 0)]);
        $c = $st->fetch();
        if (!$c || (int)$c['user_id'] !== $uid) fail('forbidden', '내 댓글만 지울 수 있어요.', 403);
        delete_comment((int)$c['id']);
        out(['ok' => true]);
    }

    if ($action === 'report') {
        throttle('board_report', 30, 3600);
        $kind = (string)($in['kind'] ?? '');
        $id = (int)($in['id'] ?? 0);
        $table = ['post' => 'nk_posts', 'comment' => 'nk_comments'][$kind] ?? null;
        if (!$table) fail('invalid', '신고할 대상을 확인해 주세요.');
        $st = $db->prepare("SELECT * FROM $table WHERE id = ?");
        $st->execute([$id]);
        $t = $st->fetch();
        if (!$t) fail('not_found', '이미 지워진 글이에요.', 404);
        if ((int)$t['user_id'] === $uid) fail('invalid', '내 글은 신고할 수 없어요.');
        $dup = $db->prepare('SELECT 1 FROM nk_board_reports WHERE kind = ? AND target_id = ? AND user_id = ?');
        $dup->execute([$kind, $id, $uid]);
        if (!$dup->fetch()) {
            $db->prepare('INSERT INTO nk_board_reports (kind, target_id, user_id, reason, created_at) VALUES (?, ?, ?, ?, ?)')
                ->execute([$kind, $id, $uid, cut((string)($in['reason'] ?? ''), 200), now()]);
            $n = $db->prepare('SELECT COUNT(*) FROM nk_board_reports WHERE kind = ? AND target_id = ?');
            $n->execute([$kind, $id]);
            $cnt = (int)$n->fetchColumn();
            $db->prepare("UPDATE $table SET report_count = ?, hidden = CASE WHEN hidden = 0 AND ? >= ? THEN 1 ELSE hidden END WHERE id = ?")
                ->execute([$cnt, $cnt, NK_BOARD_HIDE_AT, $id]);
            if ($kind === 'comment') board_recount((int)$t['post_id']);
        }
        out(['ok' => true]);
    }

    if ($action === 'block' || $action === 'unblock') {
        $other = (int)($in['user_id'] ?? 0);
        if ($other === $uid || $other <= 0) fail('invalid', '차단할 이웃을 확인해 주세요.');
        if ($action === 'block') {
            if (!find_user($other)) fail('not_found', '없는 이웃이에요.', 404);
            $db->prepare('DELETE FROM nk_blocks WHERE user_id = ? AND blocked_id = ?')->execute([$uid, $other]);
            $db->prepare('INSERT INTO nk_blocks (user_id, blocked_id, created_at) VALUES (?, ?, ?)')->execute([$uid, $other, now()]);
        } else {
            $db->prepare('DELETE FROM nk_blocks WHERE user_id = ? AND blocked_id = ?')->execute([$uid, $other]);
        }
        out(['ok' => true]);
    }

    fail('not_found', '없는 요청이에요.', 404);
} catch (Throwable $e) {
    error_log('nyangs-kitchen board error: ' . $e->getMessage());
    fail('server_error', '서버에 문제가 생겼어요. 잠시 뒤에 다시 해주세요.', 500);
}
