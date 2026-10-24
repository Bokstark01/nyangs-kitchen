<?php
// 츄르 챌린지 API (로그인 토큰 필요)
//   GET  churu.php?action=status                               → 상태 (churu_view)
//   POST churu.php?action=join    {name,lat,lng,agree,reset?}  → 상태   (인증할 급식소 정하기. 바꾸면 처음부터)
//   POST churu.php?action=checkin {lat,lng,photo}              → 상태   (하루 1번, 급식소 근처에서 사진)
//   POST churu.php?action=claim   {phone,agree}                → 상태   (30일 채운 뒤 쿠폰 받을 번호)
//   POST churu.php?action=quit                                 → 상태   (진행 중인 챌린지 그만두기, 기록 삭제)
// 현재 위치 좌표는 저장하지 않는다. 급식소까지의 거리만 남긴다.
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';

cors();
$action = (string)($_GET['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    $me = require_user();
    $uid = (int)$me['id'];
    $db = db();
    $in = $method === 'POST' ? body() : [];
    $c = find_churu($uid);

    if ($action === 'status') out(churu_view($uid));

    if ($method !== 'POST') fail('bad_method', 'POST로 보내주세요.', 405);

    if ($action === 'join') {
        throttle('churu_join', 20, 3600);
        if (empty($in['agree'])) fail('need_agree', '안내에 동의해야 시작할 수 있어요.');
        $name = cut((string)($in['name'] ?? ''), 40);
        $lat = (float)($in['lat'] ?? 0); $lng = (float)($in['lng'] ?? 0);
        if ($name === '') $name = '내 급식소';
        if ($lat < 33 || $lat > 39 || $lng < 124 || $lng > 132) fail('bad_location', '급식소 위치를 확인해 주세요.');
        if ($c && in_array($c['status'], ['done', 'claimed', 'sent'], true)) fail('already_done', '츄르는 계정당 한 번만 받을 수 있어요.', 409);
        if ($c && $c['status'] === 'rejected') fail('rejected', '이전 챌린지가 반려되어 다시 참여할 수 없어요.', 409);
        if ($c && $c['status'] === 'active') {
            $v = churu_view($uid);
            if ($v['count'] > 0 && empty($in['reset'])) fail('need_reset', '급식소를 바꾸면 연속 기록이 처음부터 시작돼요.', 409);
            churu_wipe_photos($uid);
            $db->prepare('UPDATE nk_churu SET spot_name = ?, lat = ?, lng = ?, start_day = ?, updated_at = ? WHERE user_id = ?')
                ->execute([$name, $lat, $lng, kst_day(), now(), $uid]);
        } else {
            $db->prepare('INSERT INTO nk_churu (user_id, status, spot_name, lat, lng, start_day, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                ->execute([$uid, 'active', $name, $lat, $lng, kst_day(), now(), now()]);
        }
        out(churu_view($uid));
    }

    if ($action === 'checkin') {
        throttle('churu_checkin', 30, 3600);
        if (!$c || $c['status'] !== 'active') fail('not_active', '진행 중인 챌린지가 없어요.', 409);
        $today = kst_day();
        $st = $db->prepare('SELECT 1 FROM nk_churu_days WHERE user_id = ? AND day = ?');
        $st->execute([$uid, $today]);
        if ($st->fetchColumn()) fail('already_today', '오늘은 이미 인증했어요. 내일 또 만나요!', 409);
        if (!isset($in['lat'], $in['lng'])) fail('need_location', '위치를 확인할 수 없어요. 위치 권한을 켜 주세요.');
        $m = geo_m((float)$in['lat'], (float)$in['lng'], (float)$c['lat'], (float)$c['lng']);
        if ($m > NK_CHURU_NEAR_M) fail('too_far', '급식소에서 ' . (int)round($m) . 'm 떨어져 있어요. ' . NK_CHURU_NEAR_M . 'm 안에서 인증해 주세요.', 422);
        $photo = is_string($in['photo'] ?? null) ? save_jpeg_to(churu_dir($uid), $in['photo'], NK_CHURU_PHOTO_BYTES, NK_CHURU_PHOTO_PX) : null;
        if (!$photo) fail('need_photo', '급식 사진을 찍어 주세요.');
        $db->prepare('INSERT INTO nk_churu_days (user_id, day, photo, meters, created_at) VALUES (?, ?, ?, ?, ?)')
            ->execute([$uid, $today, $photo, (int)round($m), now()]);
        $v = churu_view($uid);
        if ($v['count'] >= NK_CHURU_GOAL) {
            $db->prepare("UPDATE nk_churu SET status = 'done', done_day = ?, updated_at = ? WHERE user_id = ?")->execute([$today, now(), $uid]);
            $v = churu_view($uid);
        }
        out($v);
    }

    if ($action === 'claim') {
        throttle('churu_claim', 10, 3600);
        if (!$c || $c['status'] !== 'done') fail('not_done', '30일을 채우면 신청할 수 있어요.', 409);
        if (empty($in['agree'])) fail('need_agree', '번호 수집에 동의해야 받을 수 있어요.');
        $phone = normalize_phone((string)($in['phone'] ?? ''));
        if (!$phone) fail('bad_phone', '휴대폰 번호를 다시 확인해 주세요.');
        $db->prepare("UPDATE nk_churu SET status = 'claimed', phone = ?, updated_at = ? WHERE user_id = ?")->execute([$phone, now(), $uid]);
        out(churu_view($uid));
    }

    if ($action === 'quit') {
        if ($c && $c['status'] === 'active') delete_user_churu($uid);
        out(churu_view($uid));
    }

    fail('bad_action', '알 수 없는 요청이에요.', 404);
} catch (Throwable $e) {
    error_log('churu.php: ' . $e->getMessage());
    fail('server_error', '잠시 뒤에 다시 시도해 주세요.', 500);
}
