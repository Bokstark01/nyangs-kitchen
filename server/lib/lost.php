<?php
// 탐정모드 공통 도구: 유실 신고 → 운영자 확인 → 50m·100m 안 급식소 주인에게 알림 → 봤어요 답장
declare(strict_types=1);

const NK_LOST_STAGES = [50, 100];

function lost_photo_dir(int $lostId): string { return storage_dir() . '/lost/' . $lostId; }

function find_lost(int $id): ?array {
    $st = db()->prepare('SELECT * FROM nk_lost WHERE id = ?');
    $st->execute([$id]);
    $r = $st->fetch();
    return $r ?: null;
}
function delete_lost(int $id): void {
    $db = db();
    $db->prepare('DELETE FROM nk_lost_notices WHERE lost_id = ?')->execute([$id]);
    $db->prepare('DELETE FROM nk_lost_replies WHERE lost_id = ?')->execute([$id]);
    $db->prepare('DELETE FROM nk_lost WHERE id = ?')->execute([$id]);
    $dir = lost_photo_dir($id);
    if (is_dir($dir)) { foreach (glob($dir . '/*') ?: [] as $f) @unlink($f); @rmdir($dir); }
}
function geo_meters(float $a, float $b, float $c, float $d): float {
    $p1 = deg2rad($a); $p2 = deg2rad($c); $dp = deg2rad($c - $a); $dl = deg2rad($d - $b);
    $x = sin($dp / 2) ** 2 + cos($p1) * cos($p2) * sin($dl / 2) ** 2;
    return 2 * 6371000 * asin(min(1, sqrt($x)));
}
// 반경 안 급식소(서버 백업에 동의한 사람만)를 주인별로 가장 가까운 것 하나씩
function owners_near(float $lat, float $lng, int $radius, int $excludeUser): array {
    $dLat = $radius / 111320; $dLng = $radius / (111320 * max(0.2, cos(deg2rad($lat))));
    $st = db()->prepare('SELECT b.user_id, b.name, b.lat, b.lng FROM nk_backup_points b JOIN nk_consents c ON c.user_id = b.user_id AND c.backup = 1 WHERE b.lat BETWEEN ? AND ? AND b.lng BETWEEN ? AND ? AND b.user_id <> ?');
    $st->execute([$lat - $dLat, $lat + $dLat, $lng - $dLng, $lng + $dLng, $excludeUser]);
    $best = [];
    foreach ($st->fetchAll() as $r) {
        $m = (int)round(geo_meters($lat, $lng, (float)$r['lat'], (float)$r['lng']));
        if ($m > $radius) continue;
        $u = (int)$r['user_id'];
        if (!isset($best[$u]) || $m < $best[$u]['m']) $best[$u] = ['uid' => $u, 'name' => (string)$r['name'], 'm' => $m];
    }
    usort($best, fn($a, $b) => $a['m'] <=> $b['m']);
    return array_values($best);
}
// 운영자가 확인한 신고를 다음 반경까지 넓혀 알린다. 새로 알린 사람 수를 돌려준다
function lost_notify(array $lost, int $radius): int {
    $db = db();
    $n = 0;
    foreach (owners_near((float)$lost['lat'], (float)$lost['lng'], $radius, (int)$lost['user_id']) as $o) {
        $chk = $db->prepare('SELECT 1 FROM nk_lost_notices WHERE lost_id = ? AND user_id = ?');
        $chk->execute([(int)$lost['id'], $o['uid']]);
        if ($chk->fetch()) continue;
        $db->prepare('INSERT INTO nk_lost_notices (lost_id, user_id, point_name, meters, created_at) VALUES (?, ?, ?, ?, ?)')
            ->execute([(int)$lost['id'], $o['uid'], cut($o['name'], 60), $o['m'], now()]);
        $n++;
    }
    $db->prepare("UPDATE nk_lost SET status = 'active', radius = ?, updated_at = ? WHERE id = ?")->execute([max($radius, (int)$lost['radius']), now(), (int)$lost['id']]);
    return $n;
}
function lost_counts(int $lostId): array {
    $st = db()->prepare('SELECT COUNT(*) n, SUM(CASE WHEN seen_at IS NULL THEN 0 ELSE 1 END) s FROM nk_lost_notices WHERE lost_id = ?');
    $st->execute([$lostId]);
    $r = $st->fetch();
    return ['notified' => (int)$r['n'], 'opened' => (int)($r['s'] ?? 0)];
}
