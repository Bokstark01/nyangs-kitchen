<?php
// 급식소 서버 백업 (선택 동의한 사용자만). 로그인 토큰 필요.
//   GET  backup.php?action=status              → {consent:bool|null, count, updated_at}
//   POST backup.php?action=consent {on}        → {ok}   on=false 이면 서버의 백업을 모두 지운다
//   POST backup.php?action=sync    {points:[…]}→ {ok, count}  휴대폰의 급식소 목록을 그대로 맞춘다
//   GET  backup.php?action=restore             → {points:[…]}
// 저장 항목: 급식소 이름·위치·밥 시간·고양이 이름. 사진은 저장하지 않는다.
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';

const NK_CONSENT_VERSION = '1.4';
const NK_MAX_BACKUP_POINTS = 200;

cors();
$action = (string)($_GET['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function consent_of(int $uid): ?bool {
    $st = db()->prepare('SELECT backup FROM nk_consents WHERE user_id = ?');
    $st->execute([$uid]);
    $r = $st->fetch();
    return $r ? ((int)$r['backup'] === 1) : null;
}

try {
    $me = require_user();
    $uid = (int)$me['id'];
    $db = db();

    if ($action === 'status') {
        $st = $db->prepare('SELECT COUNT(*) c, MAX(updated_at) u FROM nk_backup_points WHERE user_id = ?');
        $st->execute([$uid]);
        $r = $st->fetch();
        out(['consent' => consent_of($uid), 'count' => (int)$r['c'], 'updated_at' => (int)($r['u'] ?? 0)]);
    }

    if ($action === 'restore') {
        if (consent_of($uid) !== true) out(['points' => []]);
        $st = $db->prepare('SELECT nid, name, lat, lng, times, cats FROM nk_backup_points WHERE user_id = ? ORDER BY id');
        $st->execute([$uid]);
        $pts = array_map(fn($r) => [
            'nid' => $r['nid'], 'name' => $r['name'], 'lat' => (float)$r['lat'], 'lng' => (float)$r['lng'],
            'times' => json_decode((string)$r['times'], true) ?: [], 'cats' => json_decode((string)$r['cats'], true) ?: [],
        ], $st->fetchAll());
        out(['points' => $pts]);
    }

    if ($method !== 'POST') fail('method_not_allowed', 'POST로 요청해 주세요.', 405);
    $in = body();

    if ($action === 'consent') {
        $on = !empty($in['on']);
        $exists = consent_of($uid) !== null;
        $db->prepare($exists ? 'UPDATE nk_consents SET backup = ?, version = ?, consented_at = ? WHERE user_id = ?'
                             : 'INSERT INTO nk_consents (backup, version, consented_at, user_id) VALUES (?, ?, ?, ?)')
           ->execute([$on ? 1 : 0, NK_CONSENT_VERSION, now(), $uid]);
        if (!$on) $db->prepare('DELETE FROM nk_backup_points WHERE user_id = ?')->execute([$uid]);
        out(['ok' => true]);
    }

    if ($action === 'sync') {
        throttle('backup_sync', 240, 3600);
        if (consent_of($uid) !== true) fail('no_consent', '급식소 백업에 동의하지 않았어요.', 403);
        $points = is_array($in['points'] ?? null) ? array_slice($in['points'], 0, NK_MAX_BACKUP_POINTS) : [];
        $keep = [];
        $db->beginTransaction();
        foreach ($points as $p) {
            if (!is_array($p)) continue;
            $nid = cut((string)($p['nid'] ?? ''), 40);
            $name = cut((string)($p['name'] ?? ''), 60);
            $lat = (float)($p['lat'] ?? 0); $lng = (float)($p['lng'] ?? 0);
            if ($nid === '' || $name === '' || $lat < -90 || $lat > 90 || $lng < -180 || $lng > 180 || ($lat == 0.0 && $lng == 0.0)) continue;
            $times = [];
            foreach (array_slice(is_array($p['times'] ?? null) ? $p['times'] : [], 0, 8) as $t) {
                if (is_array($t) && preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', (string)($t['t'] ?? ''))) {
                    $times[] = ['t' => (string)$t['t'], 'label' => cut((string)($t['label'] ?? ''), 10)];
                }
            }
            $cats = [];
            foreach (array_slice(is_array($p['cats'] ?? null) ? $p['cats'] : [], 0, 20) as $c) {
                $n = cut(is_array($c) ? (string)($c['name'] ?? '') : (string)$c, 30);
                if ($n !== '') $cats[] = $n;
            }
            $keep[] = $nid;
            $st = $db->prepare('SELECT id FROM nk_backup_points WHERE user_id = ? AND nid = ?');
            $st->execute([$uid, $nid]);
            $args = [$name, $lat, $lng, json_encode($times, JSON_UNESCAPED_UNICODE), json_encode($cats, JSON_UNESCAPED_UNICODE), now()];
            if ($row = $st->fetch()) {
                $db->prepare('UPDATE nk_backup_points SET name = ?, lat = ?, lng = ?, times = ?, cats = ?, updated_at = ? WHERE id = ?')->execute([...$args, (int)$row['id']]);
            } else {
                $db->prepare('INSERT INTO nk_backup_points (name, lat, lng, times, cats, updated_at, user_id, nid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')->execute([...$args, $uid, $nid]);
            }
        }
        // 휴대폰에서 지운 급식소는 서버에서도 지운다
        if ($keep) {
            $ph = implode(',', array_fill(0, count($keep), '?'));
            $db->prepare("DELETE FROM nk_backup_points WHERE user_id = ? AND nid NOT IN ($ph)")->execute([$uid, ...$keep]);
        } else {
            $db->prepare('DELETE FROM nk_backup_points WHERE user_id = ?')->execute([$uid]);
        }
        $db->commit();
        out(['ok' => true, 'count' => count($keep)]);
    }

    fail('not_found', '없는 요청이에요.', 404);
} catch (Throwable $e) {
    if (db()->inTransaction()) db()->rollBack();
    error_log('nyangs-kitchen backup error: ' . $e->getMessage());
    fail('server_error', '서버에 문제가 생겼어요. 잠시 뒤에 다시 해주세요.', 500);
}
