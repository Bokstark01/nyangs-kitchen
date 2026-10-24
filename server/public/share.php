<?php
// 이웃과 함께 API (모두 로그인 토큰 필요)
//   GET  share.php?action=list                                   → {owned:[…], joined:[…], pending:n}
//   POST share.php?action=upsert  {nid,name,lat,lng,memo,times,cats:[{id,name,photo?,keep?,sex?,neuter?,health?:[{d,k,t}]}]} → {share}
//   POST share.php?action=delete  {share_id}                     → {ok}   (공유 끝내기, 주인)
//   POST share.php?action=invite  {share_id}                     → {code, expires_at}
//   POST share.php?action=join    {code}                         → {share}
//   POST share.php?action=leave   {share_id}                     → {ok}   (공유받은 사람이 나가기)
//   POST share.php?action=kick    {share_id,user_id}             → {ok}   (주인이 내보내기)
//   POST share.php?action=request {share_id,helper_id?,start,end,note} → {ok}
//   POST share.php?action=respond {id,accept}                    → {ok}
//   POST share.php?action=cancel  {id}                           → {ok}   (주인이 부탁 취소)
//   POST share.php?action=fed     {share_id,note?}               → {ok}   (밥 줬어요)
//   GET  share.php?action=photo&share_id=1&f=abc.jpg             → JPEG
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';

cors();
$action = (string)($_GET['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    $me = require_user();
    $uid = (int)$me['id'];
    $db = db();

    if ($action === 'list') {
        $st = $db->prepare('SELECT * FROM nk_shares WHERE owner_id = ? ORDER BY id');
        $st->execute([$uid]);
        $owned = array_map(fn($s) => share_view($s, $uid), $st->fetchAll());
        $st = $db->prepare('SELECT s.* FROM nk_shares s JOIN nk_share_members m ON m.share_id = s.id WHERE m.user_id = ? ORDER BY m.joined_at');
        $st->execute([$uid]);
        $joined = array_map(fn($s) => share_view($s, $uid), $st->fetchAll());
        $pending = 0;
        foreach ($joined as $s) foreach ($s['requests'] as $r) if ($r['status'] === 'pending' && $r['for_me']) $pending++;
        out(['owned' => $owned, 'joined' => $joined, 'pending' => $pending]);
    }

    if ($action === 'photo') {
        $sid = (int)($_GET['share_id'] ?? 0);
        $f = (string)($_GET['f'] ?? '');
        share_for($sid, $uid);
        if (!preg_match('/^[a-f0-9]{32}\.jpg$/', $f) || !is_file(share_photo_dir($sid) . "/$f")) fail('not_found', '사진이 없어요.', 404);
        header('Content-Type: image/jpeg');
        header('Cache-Control: private, max-age=86400');
        readfile(share_photo_dir($sid) . "/$f");
        exit;
    }

    if ($method !== 'POST') fail('method_not_allowed', 'POST로 요청해 주세요.', 405);
    $in = body();

    if ($action === 'upsert') {
        throttle('share_upsert', 120, 3600);
        $nid = cut((string)($in['nid'] ?? ''), 40);
        $name = cut((string)($in['name'] ?? ''), 60);
        $lat = (float)($in['lat'] ?? 0);
        $lng = (float)($in['lng'] ?? 0);
        if ($nid === '' || $name === '') fail('invalid', '급식소 정보를 확인해 주세요.');
        if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180 || ($lat == 0.0 && $lng == 0.0)) fail('invalid', '급식소 위치를 확인해 주세요.');
        $memo = cut((string)($in['memo'] ?? ''), 300);
        $times = clean_times($in['times'] ?? []);

        $st = $db->prepare('SELECT * FROM nk_shares WHERE owner_id = ? AND nid = ?');
        $st->execute([$uid, $nid]);
        $s = $st->fetch();
        if (!$s) {
            $cnt = $db->prepare('SELECT COUNT(*) FROM nk_shares WHERE owner_id = ?');
            $cnt->execute([$uid]);
            if ((int)$cnt->fetchColumn() >= 50) fail('too_many', '공유할 수 있는 급식소는 50곳까지예요.');
            $db->prepare('INSERT INTO nk_shares (owner_id, nid, name, lat, lng, memo, times, cats, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                ->execute([$uid, $nid, $name, $lat, $lng, $memo, json_encode($times), '[]', now(), now()]);
            $s = find_share((int)$db->lastInsertId());
        }
        $sid = (int)$s['id'];
        $old = [];
        foreach (json_decode((string)$s['cats'], true) ?: [] as $c) $old[(string)($c['id'] ?? '')] = $c['photo'] ?? null;

        $cats = [];
        foreach (array_slice(is_array($in['cats'] ?? null) ? $in['cats'] : [], 0, NK_MAX_CATS) as $c) {
            if (!is_array($c)) continue;
            $cid = cut((string)($c['id'] ?? ''), 40);
            $cname = cut((string)($c['name'] ?? ''), 30);
            if ($cid === '') continue;
            $photo = null;
            if (!empty($c['photo']) && is_string($c['photo'])) $photo = save_photo($sid, $c['photo']);
            elseif (!empty($c['keep'])) $photo = $old[$cid] ?? null;
            $e = ['id' => $cid, 'name' => $cname !== '' ? $cname : '이름 없는 냥이', 'photo' => $photo];
            // 건강·중성화 기록 (함께 보는 사람에게도 보임)
            $sex = (string)($c['sex'] ?? ''); if (in_array($sex, ['m', 'f'], true)) $e['sex'] = $sex;
            $neu = (string)($c['neuter'] ?? ''); if (in_array($neu, ['yes', 'no'], true)) $e['neuter'] = $neu;
            $hl = [];
            foreach (array_slice(is_array($c['health'] ?? null) ? $c['health'] : [], 0, NK_MAX_HEALTH) as $h) {
                if (!is_array($h)) continue;
                $d = (string)($h['d'] ?? ''); $k = (string)($h['k'] ?? ''); $t = cut((string)($h['t'] ?? ''), 80);
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $d) || !in_array($k, ['vet', 'med', 'note'], true) || $t === '') continue;
                $hl[] = ['d' => $d, 'k' => $k, 't' => $t];
            }
            if ($hl) $e['health'] = $hl;
            $cats[] = $e;
        }
        prune_photos($sid, array_values(array_filter(array_column($cats, 'photo'))));
        $db->prepare('UPDATE nk_shares SET name = ?, lat = ?, lng = ?, memo = ?, times = ?, cats = ?, updated_at = ? WHERE id = ?')
            ->execute([$name, $lat, $lng, $memo, json_encode($times), json_encode($cats, JSON_UNESCAPED_UNICODE), now(), $sid]);
        out(['share' => share_view(find_share($sid), $uid)]);
    }

    if ($action === 'delete') {
        $s = share_for((int)($in['share_id'] ?? 0), $uid, true);
        delete_share((int)$s['id']);
        out(['ok' => true]);
    }

    if ($action === 'invite') {
        throttle('share_invite', 30, 3600);
        $s = share_for((int)($in['share_id'] ?? 0), $uid, true);
        $db->prepare('DELETE FROM nk_invites WHERE expires_at < ?')->execute([now()]);
        // 아직 유효한 코드가 있으면 그대로 돌려준다
        $st = $db->prepare('SELECT code, expires_at FROM nk_invites WHERE share_id = ? AND expires_at > ? ORDER BY expires_at DESC LIMIT 1');
        $st->execute([(int)$s['id'], now() + 86400]);
        if ($row = $st->fetch()) out(['code' => $row['code'], 'expires_at' => (int)$row['expires_at']]);
        for ($i = 0; $i < 5; $i++) {
            $code = new_invite_code();
            $chk = $db->prepare('SELECT 1 FROM nk_invites WHERE code = ?');
            $chk->execute([$code]);
            if (!$chk->fetch()) break;
        }
        $exp = now() + NK_INVITE_DAYS * 86400;
        $db->prepare('INSERT INTO nk_invites (code, share_id, created_at, expires_at) VALUES (?, ?, ?, ?)')->execute([$code, (int)$s['id'], now(), $exp]);
        out(['code' => $code, 'expires_at' => $exp]);
    }

    if ($action === 'join') {
        throttle('share_join', 20, 3600);
        $code = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string)($in['code'] ?? '')) ?? '');
        $st = $db->prepare('SELECT share_id FROM nk_invites WHERE code = ? AND expires_at > ?');
        $st->execute([$code, now()]);
        $row = $st->fetch();
        if (!$row) fail('invalid_code', '코드가 맞지 않거나 기간(7일)이 지났어요. 새 코드를 받아주세요.', 404);
        $s = find_share((int)$row['share_id']);
        if (!$s) fail('invalid_code', '공유가 끝난 급식소예요.', 404);
        if ((int)$s['owner_id'] === $uid) fail('own_share', '내가 공유한 급식소예요.', 409);
        if (!is_member((int)$s['id'], $uid)) {
            $cnt = $db->prepare('SELECT COUNT(*) FROM nk_share_members WHERE share_id = ?');
            $cnt->execute([(int)$s['id']]);
            if ((int)$cnt->fetchColumn() >= 30) fail('full', '이 급식소는 공유 인원(30명)이 가득 찼어요.');
            $db->prepare('INSERT INTO nk_share_members (share_id, user_id, joined_at) VALUES (?, ?, ?)')->execute([(int)$s['id'], $uid, now()]);
        }
        out(['share' => share_view($s, $uid)]);
    }

    if ($action === 'leave') {
        $s = share_for((int)($in['share_id'] ?? 0), $uid);
        if ($s['_owner']) fail('owner', '주인은 나갈 수 없어요. 공유 끝내기를 눌러주세요.');
        $db->prepare('DELETE FROM nk_share_members WHERE share_id = ? AND user_id = ?')->execute([(int)$s['id'], $uid]);
        $db->prepare("UPDATE nk_requests SET status = 'cancelled', updated_at = ? WHERE share_id = ? AND helper_id = ? AND status IN ('pending','accepted')")
            ->execute([now(), (int)$s['id'], $uid]);
        out(['ok' => true]);
    }

    if ($action === 'kick') {
        $s = share_for((int)($in['share_id'] ?? 0), $uid, true);
        $who = (int)($in['user_id'] ?? 0);
        $db->prepare('DELETE FROM nk_share_members WHERE share_id = ? AND user_id = ?')->execute([(int)$s['id'], $who]);
        $db->prepare("UPDATE nk_requests SET status = 'cancelled', updated_at = ? WHERE share_id = ? AND helper_id = ? AND status IN ('pending','accepted')")
            ->execute([now(), (int)$s['id'], $who]);
        out(['ok' => true]);
    }

    if ($action === 'request') {
        throttle('share_request', 60, 3600);
        $s = share_for((int)($in['share_id'] ?? 0), $uid, true);
        $start = (string)($in['start'] ?? '');
        $end = (string)($in['end'] ?? '');
        if (!valid_date($start) || !valid_date($end) || $end < $start) fail('invalid_date', '부탁할 날짜를 확인해 주세요.');
        if ($end < date('Y-m-d', now() - 86400)) fail('invalid_date', '지난 날짜는 부탁할 수 없어요.');
        $helper = (int)($in['helper_id'] ?? 0);
        if ($helper !== 0 && !is_member((int)$s['id'], $helper)) fail('invalid_helper', '공유받은 사람에게만 부탁할 수 있어요.');
        $db->prepare("INSERT INTO nk_requests (share_id, owner_id, helper_id, start_date, end_date, note, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)")
            ->execute([(int)$s['id'], $uid, $helper ?: null, $start, $end, cut((string)($in['note'] ?? ''), 300), now(), now()]);
        out(['ok' => true]);
    }

    if ($action === 'respond' || $action === 'cancel') {
        $st = $db->prepare('SELECT * FROM nk_requests WHERE id = ?');
        $st->execute([(int)($in['id'] ?? 0)]);
        $r = $st->fetch();
        if (!$r) fail('not_found', '없는 부탁이에요.', 404);
        $s = share_for((int)$r['share_id'], $uid);
        if ($action === 'cancel') {
            if (!$s['_owner']) fail('forbidden', '부탁한 사람만 취소할 수 있어요.', 403);
            $db->prepare("UPDATE nk_requests SET status = 'cancelled', updated_at = ? WHERE id = ?")->execute([now(), (int)$r['id']]);
            out(['ok' => true]);
        }
        if ($s['_owner']) fail('forbidden', '내가 한 부탁이에요.', 403);
        if ($r['status'] !== 'pending') fail('closed', '이미 처리된 부탁이에요.', 409);
        if ($r['helper_id'] !== null && (int)$r['helper_id'] !== $uid) fail('forbidden', '다른 분에게 온 부탁이에요.', 403);
        $accept = !empty($in['accept']);
        if ($accept) {
            $db->prepare("UPDATE nk_requests SET status = 'accepted', helper_id = ?, updated_at = ? WHERE id = ? AND status = 'pending'")->execute([$uid, now(), (int)$r['id']]);
        } elseif ($r['helper_id'] !== null) {
            $db->prepare("UPDATE nk_requests SET status = 'declined', updated_at = ? WHERE id = ?")->execute([now(), (int)$r['id']]);
        }
        // 누구에게나 한 부탁을 한 사람이 거절하면, 다른 사람이 받을 수 있게 그대로 둔다
        out(['ok' => true]);
    }

    if ($action === 'fed') {
        throttle('share_fed', 60, 3600);
        $s = share_for((int)($in['share_id'] ?? 0), $uid);
        $db->prepare('INSERT INTO nk_feed_logs (share_id, user_id, fed_at, note) VALUES (?, ?, ?, ?)')
            ->execute([(int)$s['id'], $uid, now(), cut((string)($in['note'] ?? ''), 200)]);
        $db->prepare('DELETE FROM nk_feed_logs WHERE share_id = ? AND fed_at < ?')->execute([(int)$s['id'], now() - 90 * 86400]);
        out(['ok' => true]);
    }

    fail('not_found', '없는 요청이에요.', 404);
} catch (Throwable $e) {
    error_log('nyangs-kitchen share error: ' . $e->getMessage());
    fail('server_error', '서버에 문제가 생겼어요. 잠시 뒤에 다시 해주세요.', 500);
}
