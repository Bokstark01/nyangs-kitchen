<?php
// 이웃과 함께: 급식소 공유 · 초대 코드 · 밥 부탁 · 밥 줬어요 기록 (공통 도구)
declare(strict_types=1);

const NK_INVITE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // 헷갈리는 0 O 1 I L 제외
const NK_INVITE_DAYS = 7;
const NK_MAX_CATS = 12;
const NK_MAX_HEALTH = 30;   // 고양이 한 마리당 건강 기록 수
const NK_MAX_PHOTO_BYTES = 250000;
const NK_LOGS_PER_SHARE = 30;

function storage_dir(): string {
    $d = (string)cfg('storage_dir', __DIR__ . '/../storage');
    return rtrim($d, '/');
}
function share_photo_dir(int $shareId): string { return storage_dir() . '/shares/' . $shareId; }

function find_share(int $id): ?array {
    $st = db()->prepare('SELECT * FROM nk_shares WHERE id = ?');
    $st->execute([$id]);
    $s = $st->fetch();
    return $s ?: null;
}
function is_member(int $shareId, int $userId): bool {
    $st = db()->prepare('SELECT 1 FROM nk_share_members WHERE share_id = ? AND user_id = ?');
    $st->execute([$shareId, $userId]);
    return (bool)$st->fetch();
}
// 주인이거나 공유받은 사람만 볼 수 있다
function share_for(int $shareId, int $userId, bool $ownerOnly = false): array {
    $s = find_share($shareId);
    if (!$s) fail('share_not_found', '공유가 끝났거나 없는 급식소예요.', 404);
    $isOwner = (int)$s['owner_id'] === $userId;
    if ($ownerOnly && !$isOwner) fail('forbidden', '급식소 주인만 할 수 있어요.', 403);
    if (!$isOwner && !is_member($shareId, $userId)) fail('forbidden', '공유받지 않은 급식소예요.', 403);
    $s['_owner'] = $isOwner;
    return $s;
}

function delete_share(int $shareId): void {
    $db = db();
    foreach (['nk_share_members', 'nk_invites', 'nk_requests', 'nk_feed_logs'] as $t) {
        $db->prepare("DELETE FROM $t WHERE share_id = ?")->execute([$shareId]);
    }
    $db->prepare('DELETE FROM nk_shares WHERE id = ?')->execute([$shareId]);
    $dir = share_photo_dir($shareId);
    if (is_dir($dir)) {
        foreach (glob($dir . '/*') ?: [] as $f) @unlink($f);
        @rmdir($dir);
    }
}

// 회원탈퇴: 내가 공유한 급식소는 통째로, 공유받은 기록과 내 밥 기록은 지운다
function delete_user_shares(int $userId): void {
    $db = db();
    // 급식소 서버 백업과 동의 기록도 함께 지운다
    $db->prepare('DELETE FROM nk_backup_points WHERE user_id = ?')->execute([$userId]);
    $db->prepare('DELETE FROM nk_consents WHERE user_id = ?')->execute([$userId]);
    $st = $db->prepare('SELECT id FROM nk_shares WHERE owner_id = ?');
    $st->execute([$userId]);
    foreach ($st->fetchAll() as $r) delete_share((int)$r['id']);
    $db->prepare('DELETE FROM nk_share_members WHERE user_id = ?')->execute([$userId]);
    $db->prepare('DELETE FROM nk_feed_logs WHERE user_id = ?')->execute([$userId]);
    $db->prepare("UPDATE nk_requests SET status = 'cancelled', helper_id = NULL, updated_at = ? WHERE helper_id = ? AND status IN ('pending','accepted')")
        ->execute([now(), $userId]);
    // 탐정모드: 내 유실 신고(사진 포함), 내가 받은 알림, 내가 남긴 답장
    $st = $db->prepare('SELECT id FROM nk_lost WHERE user_id = ?');
    $st->execute([$userId]);
    foreach ($st->fetchAll() as $r) delete_lost((int)$r['id']);
    $db->prepare('DELETE FROM nk_lost_notices WHERE user_id = ?')->execute([$userId]);
    $db->prepare('DELETE FROM nk_lost_replies WHERE user_id = ?')->execute([$userId]);
    // 이웃 게시판: 내 글·댓글·신고·차단 기록
    delete_user_board($userId);
    // 츄르 챌린지: 인증 사진·급식소 위치·받을 번호
    delete_user_churu($userId);
}

function clean_times($v): array {
    $outT = [];
    foreach (is_array($v) ? $v : [] as $t) {
        if (is_string($t) && preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $t)) $outT[] = $t;
    }
    $outT = array_values(array_unique($outT));
    sort($outT);
    return array_slice($outT, 0, 8);
}
function valid_date(string $d): bool {
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $d)) return false;
    [$y, $m, $dd] = array_map('intval', explode('-', $d));
    return checkdate($m, $dd, $y);
}

// 앱이 보낸 작은 JPEG(base64)를 저장하고 파일 이름을 돌려준다
function save_photo(int $shareId, string $b64): ?string { return save_jpeg_to(share_photo_dir($shareId), $b64); }
// 앱이 보낸 작은 JPEG(base64)를 검사해서 저장하고 파일 이름을 돌려준다
function save_jpeg_to(string $dir, string $b64, int $maxBytes = NK_MAX_PHOTO_BYTES, int $maxPx = 1200): ?string {
    $b64 = preg_replace('#^data:image/jpeg;base64,#', '', $b64) ?? '';
    $bin = base64_decode($b64, true);
    if ($bin === false || strlen($bin) < 100 || strlen($bin) > $maxBytes) return null;
    if (substr($bin, 0, 3) !== "\xFF\xD8\xFF") return null;                 // JPEG만
    if (function_exists('getimagesizefromstring')) {
        $info = @getimagesizefromstring($bin);
        if (!$info || ($info[2] ?? 0) !== IMAGETYPE_JPEG || $info[0] > $maxPx || $info[1] > $maxPx) return null;
    }
    if (!is_dir($dir) && !@mkdir($dir, 0750, true)) throw new RuntimeException('cannot create photo dir');
    $name = substr(sha($bin), 0, 32) . '.jpg';
    if (!is_file("$dir/$name")) file_put_contents("$dir/$name", $bin, LOCK_EX);
    return $name;
}
function prune_photos(int $shareId, array $keep): void {
    $dir = share_photo_dir($shareId);
    foreach (glob($dir . '/*.jpg') ?: [] as $f) {
        if (!in_array(basename($f), $keep, true)) @unlink($f);
    }
}

function nick_of(int $userId): string {
    $u = find_user($userId);
    return $u ? (string)$u['nickname'] : '탈퇴한 회원';
}

// 앱으로 보낼 급식소 정보
function share_view(array $s, int $me): array {
    $db = db();
    $sid = (int)$s['id'];
    $isOwner = (int)$s['owner_id'] === $me;

    $st = $db->prepare('SELECT m.user_id, m.joined_at, u.nickname FROM nk_share_members m LEFT JOIN nk_users u ON u.id = m.user_id WHERE m.share_id = ? ORDER BY m.joined_at');
    $st->execute([$sid]);
    $members = array_map(fn($r) => ['id' => (int)$r['user_id'], 'nickname' => (string)($r['nickname'] ?? '탈퇴한 회원'), 'joined_at' => (int)$r['joined_at']], $st->fetchAll());

    $st = $db->prepare("SELECT * FROM nk_requests WHERE share_id = ? AND (status IN ('pending','accepted') OR updated_at > ?) ORDER BY start_date, id");
    $st->execute([$sid, now() - 14 * 86400]);
    $reqs = [];
    foreach ($st->fetchAll() as $r) {
        $helper = $r['helper_id'] !== null ? (int)$r['helper_id'] : null;
        if (!$isOwner && $helper !== null && $helper !== $me && $r['status'] === 'pending') continue;   // 다른 사람에게 온 부탁은 안 보임
        $reqs[] = [
            'id' => (int)$r['id'], 'start' => $r['start_date'], 'end' => $r['end_date'], 'note' => $r['note'],
            'status' => $r['status'], 'helper_id' => $helper, 'helper' => $helper !== null ? nick_of($helper) : null,
            'for_me' => $helper === $me || ($helper === null && !$isOwner),
        ];
    }

    $st = $db->prepare('SELECT l.*, u.nickname FROM nk_feed_logs l LEFT JOIN nk_users u ON u.id = l.user_id WHERE l.share_id = ? ORDER BY l.fed_at DESC LIMIT ' . NK_LOGS_PER_SHARE);
    $st->execute([$sid]);
    $logs = array_map(fn($r) => ['at' => (int)$r['fed_at'], 'by' => (string)($r['nickname'] ?? '탈퇴한 회원'), 'mine' => (int)$r['user_id'] === $me, 'note' => $r['note']], $st->fetchAll());

    $cats = json_decode((string)$s['cats'], true) ?: [];
    return [
        'id' => $sid, 'nid' => $s['nid'], 'owner' => $isOwner, 'owner_name' => nick_of((int)$s['owner_id']),
        'name' => $s['name'], 'lat' => (float)$s['lat'], 'lng' => (float)$s['lng'], 'memo' => $s['memo'],
        'times' => json_decode((string)$s['times'], true) ?: [], 'cats' => $cats, 'updated_at' => (int)$s['updated_at'],
        'members' => $isOwner ? $members : null, 'member_count' => count($members),
        'requests' => $reqs, 'logs' => $logs,
    ];
}

function new_invite_code(): string {
    $a = NK_INVITE_ALPHABET;
    $c = '';
    for ($i = 0; $i < 6; $i++) $c .= $a[random_int(0, strlen($a) - 1)];
    return $c;
}
