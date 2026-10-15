<?php
// 탐정모드 API (로그인 토큰 필요)
//   GET  lost.php?action=list                                  → {mine:[…], nearby:[…], unread:n}
//   POST lost.php?action=report {cat_name,description,photo,lat,lng,lost_date,contact} → {ok,id}
//   POST lost.php?action=reply  {lost_id,seen,note}             → {ok}   (알림 받은 급식소 주인)
//   POST lost.php?action=opened {lost_id}                       → {ok}
//   POST lost.php?action=close  {lost_id,found}                 → {ok}   (신고한 보호자)
//   GET  lost.php?action=photo&id=1                             → JPEG (보호자·알림 받은 주인만)
// 급식소 위치는 보호자에게 보여주지 않는다. 보호자는 '몇 곳에 알렸는지'와 답장만 본다.
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';

cors();
$action = (string)($_GET['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
const STATUS_TEXT = ['pending' => '운영자 확인 중', 'active' => '찾는 중', 'rejected' => '확인되지 않음', 'found' => '찾았어요', 'closed' => '닫음'];

try {
    $me = require_user();
    $uid = (int)$me['id'];
    $db = db();

    if ($action === 'list') {
        // 끝난 신고(찾음·닫음·반려)는 90일 뒤 사진과 함께 지운다
        $old = $db->prepare("SELECT id FROM nk_lost WHERE status IN ('found','closed','rejected') AND updated_at < ?");
        $old->execute([now() - 90 * 86400]);
        foreach ($old->fetchAll() as $o) delete_lost((int)$o['id']);
        $st = $db->prepare('SELECT * FROM nk_lost WHERE user_id = ? ORDER BY id DESC LIMIT 10');
        $st->execute([$uid]);
        $mine = [];
        foreach ($st->fetchAll() as $l) {
            $rs = $db->prepare('SELECT r.seen, r.note, r.created_at, u.nickname, n.meters FROM nk_lost_replies r LEFT JOIN nk_users u ON u.id = r.user_id LEFT JOIN nk_lost_notices n ON n.lost_id = r.lost_id AND n.user_id = r.user_id WHERE r.lost_id = ? ORDER BY r.id DESC');
            $rs->execute([(int)$l['id']]);
            $mine[] = [
                'id' => (int)$l['id'], 'cat_name' => $l['cat_name'], 'description' => $l['description'], 'photo' => (bool)$l['photo'],
                'lost_date' => $l['lost_date'], 'status' => $l['status'], 'status_text' => STATUS_TEXT[$l['status']] ?? $l['status'],
                'radius' => (int)$l['radius'], 'admin_note' => $l['admin_note'], 'created_at' => (int)$l['created_at'],
                'lat' => (float)$l['lat'], 'lng' => (float)$l['lng'], 'contact' => $l['contact'],
                'counts' => lost_counts((int)$l['id']),
                'replies' => array_map(fn($r) => ['seen' => (int)$r['seen'] === 1, 'note' => $r['note'], 'at' => (int)$r['created_at'], 'by' => (string)($r['nickname'] ?? '탈퇴한 회원'), 'meters' => $r['meters'] !== null ? (int)$r['meters'] : null], $rs->fetchAll()),
            ];
        }
        $st = $db->prepare("SELECT l.*, n.point_name, n.meters, n.seen_at, n.created_at AS notified_at, u.nickname FROM nk_lost_notices n JOIN nk_lost l ON l.id = n.lost_id LEFT JOIN nk_users u ON u.id = l.user_id WHERE n.user_id = ? AND l.status = 'active' ORDER BY n.created_at DESC LIMIT 30");
        $st->execute([$uid]);
        $nearby = []; $unread = 0;
        foreach ($st->fetchAll() as $l) {
            if ($l['seen_at'] === null) $unread++;
            $mr = $db->prepare('SELECT seen, note, created_at FROM nk_lost_replies WHERE lost_id = ? AND user_id = ? ORDER BY id DESC LIMIT 1');
            $mr->execute([(int)$l['id'], $uid]);
            $my = $mr->fetch();
            $nearby[] = [
                'id' => (int)$l['id'], 'cat_name' => $l['cat_name'], 'description' => $l['description'], 'photo' => (bool)$l['photo'],
                'lost_date' => $l['lost_date'], 'contact' => $l['contact'], 'reporter' => (string)($l['nickname'] ?? ''),
                'point_name' => $l['point_name'], 'meters' => (int)$l['meters'], 'new' => $l['seen_at'] === null, 'notified_at' => (int)$l['notified_at'],
                'my_reply' => $my ? ['seen' => (int)$my['seen'] === 1, 'note' => $my['note'], 'at' => (int)$my['created_at']] : null,
            ];
        }
        out(['mine' => $mine, 'nearby' => $nearby, 'unread' => $unread]);
    }

    if ($action === 'photo') {
        $l = find_lost((int)($_GET['id'] ?? 0));
        if (!$l || !$l['photo']) fail('not_found', '사진이 없어요.', 404);
        $ok = (int)$l['user_id'] === $uid;
        if (!$ok) { $c = $db->prepare('SELECT 1 FROM nk_lost_notices WHERE lost_id = ? AND user_id = ?'); $c->execute([(int)$l['id'], $uid]); $ok = (bool)$c->fetch(); }
        if (!$ok) fail('forbidden', '볼 수 없는 사진이에요.', 403);
        $f = lost_photo_dir((int)$l['id']) . '/' . basename((string)$l['photo']);
        if (!is_file($f)) fail('not_found', '사진이 없어요.', 404);
        header('Content-Type: image/jpeg'); header('Cache-Control: private, max-age=86400');
        readfile($f); exit;
    }

    if ($method !== 'POST') fail('method_not_allowed', 'POST로 요청해 주세요.', 405);
    $in = body();

    if ($action === 'report') {
        throttle('lost_report', 5, 86400);
        $open = $db->prepare("SELECT COUNT(*) FROM nk_lost WHERE user_id = ? AND status IN ('pending','active')");
        $open->execute([$uid]);
        if ((int)$open->fetchColumn() >= 3) fail('too_many', '진행 중인 신고가 3건이에요. 찾았거나 끝난 신고를 먼저 닫아주세요.');
        $name = cut((string)($in['cat_name'] ?? ''), 30);
        $desc = cut((string)($in['description'] ?? ''), 500);
        $lat = (float)($in['lat'] ?? 0); $lng = (float)($in['lng'] ?? 0);
        $date = (string)($in['lost_date'] ?? '');
        if ($name === '') fail('invalid', '고양이 이름을 적어주세요.');
        if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180 || ($lat == 0.0 && $lng == 0.0)) fail('invalid', '잃어버린 곳을 지도에서 정해주세요.');
        if (!valid_date($date) || $date > date('Y-m-d', now() + 86400)) fail('invalid', '잃어버린 날짜를 확인해 주세요.');
        $db->prepare("INSERT INTO nk_lost (user_id, cat_name, description, photo, lat, lng, lost_date, contact, status, radius, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, 'pending', 0, ?, ?)")
            ->execute([$uid, $name, $desc, $lat, $lng, $date, cut((string)($in['contact'] ?? ''), 60), now(), now()]);
        $id = (int)$db->lastInsertId();
        if (!empty($in['photo']) && is_string($in['photo'])) {
            $f = save_jpeg_to(lost_photo_dir($id), $in['photo']);
            if ($f) $db->prepare('UPDATE nk_lost SET photo = ? WHERE id = ?')->execute([$f, $id]);
        }
        out(['ok' => true, 'id' => $id], 201);
    }

    if ($action === 'opened' || $action === 'reply') {
        $lid = (int)($in['lost_id'] ?? 0);
        $c = $db->prepare("SELECT 1 FROM nk_lost_notices n JOIN nk_lost l ON l.id = n.lost_id WHERE n.lost_id = ? AND n.user_id = ? AND l.status = 'active'");
        $c->execute([$lid, $uid]);
        if (!$c->fetch()) fail('forbidden', '받은 알림이 아니거나 이미 끝난 신고예요.', 403);
        $db->prepare('UPDATE nk_lost_notices SET seen_at = ? WHERE lost_id = ? AND user_id = ? AND seen_at IS NULL')->execute([now(), $lid, $uid]);
        if ($action === 'reply') {
            throttle('lost_reply', 30, 3600);
            $db->prepare('INSERT INTO nk_lost_replies (lost_id, user_id, seen, note, created_at) VALUES (?, ?, ?, ?, ?)')
                ->execute([$lid, $uid, !empty($in['seen']) ? 1 : 0, cut((string)($in['note'] ?? ''), 300), now()]);
        }
        out(['ok' => true]);
    }

    if ($action === 'close') {
        $l = find_lost((int)($in['lost_id'] ?? 0));
        if (!$l || (int)$l['user_id'] !== $uid) fail('forbidden', '내 신고가 아니에요.', 403);
        $db->prepare('UPDATE nk_lost SET status = ?, updated_at = ? WHERE id = ?')->execute([!empty($in['found']) ? 'found' : 'closed', now(), (int)$l['id']]);
        out(['ok' => true]);
    }

    fail('not_found', '없는 요청이에요.', 404);
} catch (Throwable $e) {
    error_log('nyangs-kitchen lost error: ' . $e->getMessage());
    fail('server_error', '서버에 문제가 생겼어요. 잠시 뒤에 다시 해주세요.', 500);
}
