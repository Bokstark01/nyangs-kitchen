<?php
// 이웃 게시판 (공통 도구)
// 글의 위치는 대략 100m 단위로 줄여서 저장하고, 다른 사용자에게는 좌표 대신 '동네 이름'과 '대략 거리'만 보낸다.
declare(strict_types=1);

const NK_BOARD_CATS = ['report' => '제보', 'info' => '정보', 'ask' => '질문', 'free' => '자유'];
const NK_BOARD_MAX_PHOTOS = 4;
const NK_BOARD_PHOTO_BYTES = 450000;
const NK_BOARD_PHOTO_PX = 1600;
const NK_BOARD_HIDE_AT = 3;          // 서로 다른 3명이 신고하면 운영자 확인 전까지 숨김
const NK_BOARD_NEAR_M = 5000;
const NK_BOARD_PAGE = 20;

function board_photo_dir(int $postId): string { return storage_dir() . '/board/' . $postId; }

function find_post(int $id): ?array {
    $st = db()->prepare('SELECT * FROM nk_posts WHERE id = ?');
    $st->execute([$id]);
    $p = $st->fetch();
    return $p ?: null;
}

function geo_m(float $a, float $b, float $c, float $d): float {
    $r = 6371000; $p1 = deg2rad($a); $p2 = deg2rad($c);
    $x = sin(($p2 - $p1) / 2) ** 2 + cos($p1) * cos($p2) * sin(deg2rad($d - $b) / 2) ** 2;
    return 2 * $r * asin(min(1, sqrt($x)));
}
// 거리는 정확히 보내지 않고 뭉뚱그려 보낸다
function rough_dist(float $m): string {
    if ($m < 1000) return '1km 안';
    if ($m < 10000) return '약 ' . (int)round($m / 1000) . 'km';
    return '10km 넘게';
}

// 좌표 → '구 동' (카카오 REST 키가 있으면 카카오, 안 되면 OpenStreetMap). 100m 단위로 캐시한다.
function region_name(float $lat, float $lng): string {
    $key = sprintf('%.3f,%.3f', $lat, $lng);
    $db = db();
    $st = $db->prepare('SELECT name FROM nk_regions WHERE k = ?');
    $st->execute([$key]);
    $row = $st->fetch();
    if ($row) return (string)$row['name'];
    $name = '';
    if (cfg('offline_regions', false)) return (string)cfg('offline_regions');   // 테스트용
    $rk = (string)cfg('kakao_rest_key', '');
    if ($rk !== '') {
        $r = http_call('GET', 'https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=' . rawurlencode((string)$lng) . '&y=' . rawurlencode((string)$lat), [], ['Authorization: KakaoAK ' . $rk]);
        foreach ($r['json']['documents'] ?? [] as $d) {
            if (($d['region_type'] ?? '') === 'H') { $name = trim(($d['region_2depth_name'] ?? '') . ' ' . ($d['region_3depth_name'] ?? '')); break; }
        }
    }
    if ($name === '') {
        $r = http_call('GET', 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&accept-language=ko&lat=' . rawurlencode((string)$lat) . '&lon=' . rawurlencode((string)$lng), [], ['User-Agent: nyangs-kitchen/1.0 (https://nyangs-kitchen.com)']);
        $a = $r['json']['address'] ?? [];
        $gu = $a['borough'] ?? $a['city_district'] ?? $a['county'] ?? $a['city'] ?? $a['town'] ?? '';
        $dong = $a['quarter'] ?? $a['suburb'] ?? $a['neighbourhood'] ?? $a['village'] ?? '';
        $name = trim($gu . ' ' . $dong);
    }
    $name = cut($name, 40);
    if ($name !== '') {
        try { $db->prepare('INSERT INTO nk_regions (k, name) VALUES (?, ?)')->execute([$key, $name]); } catch (Throwable $e) {}
    }
    return $name;
}

function blocked_ids(int $userId): array {
    $st = db()->prepare('SELECT blocked_id FROM nk_blocks WHERE user_id = ?');
    $st->execute([$userId]);
    return array_map('intval', array_column($st->fetchAll(), 'blocked_id'));
}

function post_view(array $p, int $me, ?float $lat, ?float $lng, bool $full): array {
    $photos = json_decode((string)$p['photos'], true) ?: [];
    $body = (string)$p['body'];
    $dist = null;
    if ($lat !== null && $lng !== null && $p['lat'] !== null) $dist = rough_dist(geo_m($lat, $lng, (float)$p['lat'], (float)$p['lng']));
    return [
        'id' => (int)$p['id'], 'cat' => $p['category'], 'cat_name' => NK_BOARD_CATS[$p['category']] ?? '자유',
        'body' => $full ? $body : cut($body, 140) . (mb_strlen($body) > 140 ? '…' : ''),
        'photos' => $photos, 'author_id' => (int)$p['user_id'], 'author' => (string)($p['nickname'] ?? '탈퇴한 회원'),
        'mine' => (int)$p['user_id'] === $me, 'area' => $p['area'], 'dist' => $dist,
        'comments' => (int)$p['comment_count'], 'hidden' => (int)$p['hidden'] === 1,
        'created_at' => (int)$p['created_at'],
    ];
}

function delete_post(int $postId): void {
    $db = db();
    $st = $db->prepare('SELECT id FROM nk_comments WHERE post_id = ?');
    $st->execute([$postId]);
    $cids = array_column($st->fetchAll(), 'id');
    foreach ($cids as $cid) $db->prepare("DELETE FROM nk_board_reports WHERE kind = 'comment' AND target_id = ?")->execute([(int)$cid]);
    $db->prepare('DELETE FROM nk_comments WHERE post_id = ?')->execute([$postId]);
    $db->prepare("DELETE FROM nk_board_reports WHERE kind = 'post' AND target_id = ?")->execute([$postId]);
    $db->prepare('DELETE FROM nk_posts WHERE id = ?')->execute([$postId]);
    $dir = board_photo_dir($postId);
    if (is_dir($dir)) { foreach (glob($dir . '/*') ?: [] as $f) @unlink($f); @rmdir($dir); }
}

function delete_comment(int $commentId): void {
    $db = db();
    $st = $db->prepare('SELECT post_id FROM nk_comments WHERE id = ?');
    $st->execute([$commentId]);
    $c = $st->fetch();
    if (!$c) return;
    $db->prepare("DELETE FROM nk_board_reports WHERE kind = 'comment' AND target_id = ?")->execute([$commentId]);
    $db->prepare('DELETE FROM nk_comments WHERE id = ?')->execute([$commentId]);
    board_recount((int)$c['post_id']);
}
function board_recount(int $postId): void {
    db()->prepare('UPDATE nk_posts SET comment_count = (SELECT COUNT(*) FROM nk_comments WHERE post_id = ? AND hidden = 0) WHERE id = ?')->execute([$postId, $postId]);
}

// 회원탈퇴: 내 글(사진 포함)·댓글·신고·차단 기록을 지운다
function delete_user_board(int $userId): void {
    $db = db();
    $st = $db->prepare('SELECT id FROM nk_posts WHERE user_id = ?');
    $st->execute([$userId]);
    foreach ($st->fetchAll() as $r) delete_post((int)$r['id']);
    $st = $db->prepare('SELECT id FROM nk_comments WHERE user_id = ?');
    $st->execute([$userId]);
    foreach ($st->fetchAll() as $r) delete_comment((int)$r['id']);
    $db->prepare('DELETE FROM nk_board_reports WHERE user_id = ?')->execute([$userId]);
    $db->prepare('DELETE FROM nk_blocks WHERE user_id = ? OR blocked_id = ?')->execute([$userId, $userId]);
}

// 내 글에 다른 사람이 남긴 새 댓글 수 (이웃 탭 배지)
function board_unread(int $userId): int {
    $st = db()->prepare('SELECT COUNT(*) FROM nk_comments c JOIN nk_posts p ON p.id = c.post_id WHERE p.user_id = ? AND c.user_id <> ? AND c.hidden = 0 AND c.id > p.seen_cid');
    $st->execute([$userId, $userId]);
    return (int)$st->fetchColumn();
}
