<?php
// 츄르 챌린지 공통 함수
//  - 날짜는 서버의 한국 날짜로만 센다 (휴대폰 시계를 바꿔도 소용없게)
//  - 하루 1번, 급식소 근처(NK_CHURU_NEAR_M 안)에서 사진을 찍어야 인증
//  - 한 달(30일)에 하루는 빠져도 이어진다 ('쉬어도 이어지는 날')
//  - 30일을 채우면 휴대폰 번호를 받고, 운영자가 사진을 확인한 뒤 쿠폰을 보낸다. 계정당 평생 1번
declare(strict_types=1);

const NK_CHURU_GOAL = 30;
const NK_CHURU_NEAR_M = 200;
const NK_CHURU_PHOTO_BYTES = 450000;
const NK_CHURU_PHOTO_PX = 1280;
const NK_CHURU_REST_EVERY = 30;   // 쉬는 날은 30일에 한 번

function churu_dir(int $uid): string { return storage_dir() . '/churu/' . $uid; }
function kst_day(int $offsetDays = 0, ?int $ts = null): string {
    $d = new DateTimeImmutable('@' . ($ts ?? now()));
    $d = $d->setTimezone(new DateTimeZone('Asia/Seoul'));
    if ($offsetDays) $d = $d->modify(($offsetDays > 0 ? '+' : '') . $offsetDays . ' day');
    return $d->format('Y-m-d');
}
function day_add(string $day, int $n): string {
    return (new DateTimeImmutable($day . ' 00:00:00', new DateTimeZone('Asia/Seoul')))->modify(($n >= 0 ? '+' : '') . $n . ' day')->format('Y-m-d');
}
function day_diff(string $a, string $b): int {   // a - b (일)
    $z = new DateTimeZone('Asia/Seoul');
    return (int)round(((new DateTimeImmutable($a, $z))->getTimestamp() - (new DateTimeImmutable($b, $z))->getTimestamp()) / 86400);
}
function find_churu(int $uid): ?array {
    $st = db()->prepare('SELECT * FROM nk_churu WHERE user_id = ?');
    $st->execute([$uid]);
    return $st->fetch() ?: null;
}
function churu_days(int $uid): array {
    $st = db()->prepare('SELECT day FROM nk_churu_days WHERE user_id = ? ORDER BY day DESC');
    $st->execute([$uid]);
    return array_column($st->fetchAll(), 'day');
}

/** 지금 이어지고 있는 연속 기록. 오늘 아직 인증 전이면 어제부터 센다.
 *  @return array{count:int, today:bool, rests:string[], start:?string, rest_left:bool} */
function churu_streak(array $days, string $from, ?string $today = null): array {
    $today = $today ?? kst_day();
    $set = array_flip(array_filter($days, fn($d) => $d >= $from && $d <= $today));
    $todayDone = isset($set[$today]);
    $d = $todayDone ? $today : day_add($today, -1);
    $count = 0; $rests = []; $start = null;
    while ($d >= $from) {
        if (isset($set[$d])) { $count++; $start = $d; $d = day_add($d, -1); continue; }
        // 하루 빠짐: 그 전날 인증이 있고, 30일 안에 다른 쉬는 날이 없으면 이어진다
        $prev = day_add($d, -1);
        $near = false;
        foreach ($rests as $r) if (abs(day_diff($r, $d)) < NK_CHURU_REST_EVERY) $near = true;
        if (isset($set[$prev]) && !$near) { $rests[] = $d; $d = $prev; continue; }
        break;
    }
    // 오늘 아직 안 했고 어제가 쉬는 날로 쓰였는데 그 전 기록도 없다면 의미 없음 → 쉬는 날 취소
    if ($count === 0) $rests = [];
    $restLeft = true;
    foreach ($rests as $r) if (day_diff($today, $r) < NK_CHURU_REST_EVERY) $restLeft = false;
    return ['count' => $count, 'today' => $todayDone, 'rests' => $rests, 'start' => $start, 'rest_left' => $restLeft];
}

/** 연속 기록에서 떨어져 나간 지난 인증(사진 포함)은 바로 지운다 */
function churu_prune(int $uid, ?string $keepFrom): void {
    $db = db();
    $st = $db->prepare('SELECT day, photo FROM nk_churu_days WHERE user_id = ?' . ($keepFrom ? ' AND day < ?' : ''));
    $st->execute($keepFrom ? [$uid, $keepFrom] : [$uid]);
    foreach ($st->fetchAll() as $r) {
        @unlink(churu_dir($uid) . '/' . basename((string)$r['photo']));
        $db->prepare('DELETE FROM nk_churu_days WHERE user_id = ? AND day = ?')->execute([$uid, $r['day']]);
    }
}
function churu_wipe_photos(int $uid): void {
    churu_prune($uid, null);
    $dir = churu_dir($uid);
    foreach (glob($dir . '/*.jpg') ?: [] as $f) @unlink($f);
    @rmdir($dir);
}
function delete_user_churu(int $uid): void {
    churu_wipe_photos($uid);
    db()->prepare('DELETE FROM nk_churu WHERE user_id = ?')->execute([$uid]);
}
function normalize_phone(string $p): ?string {
    $d = preg_replace('/\D/', '', $p) ?? '';
    if (!preg_match('/^01[016789]\d{7,8}$/', $d)) return null;
    return strlen($d) === 10 ? substr($d, 0, 3) . '-' . substr($d, 3, 3) . '-' . substr($d, 6) : substr($d, 0, 3) . '-' . substr($d, 3, 4) . '-' . substr($d, 7);
}
function mask_phone(?string $p): string { return $p ? preg_replace('/^(\d{3})-(\d{3,4})-(\d{2})(\d{2})$/', '$1-****-**$4', $p) ?? '' : ''; }

/** 앱에 보낼 상태 */
function churu_view(int $uid): array {
    $c = find_churu($uid);
    if (!$c) return ['status' => 'none', 'goal' => NK_CHURU_GOAL, 'near_m' => NK_CHURU_NEAR_M];
    $today = kst_day();
    $days = churu_days($uid);
    $from = (string)$c['start_day'];
    if ($c['status'] === 'active') {
        $s = churu_streak($days, $from, $today);
        // 끊긴 기록은 지우고, 새로 시작하는 날로 옮긴다
        if ($s['count'] === 0 && $days) { churu_prune($uid, $today); $days = churu_days($uid); }
        elseif ($s['start'] && $s['start'] > $from) {
            $keep = $s['rests'] ? min($s['start'], min($s['rests'])) : $s['start'];
            churu_prune($uid, $keep); $days = churu_days($uid);
        }
    } else {
        $s = churu_streak($days, $from, (string)($c['done_day'] ?? $today));
        $s['today'] = in_array($today, $days, true);
    }
    // 최근 35일 달력
    $set = array_flip($days); $rest = array_flip($s['rests']); $cal = [];
    for ($i = 34; $i >= 0; $i--) {
        $d = kst_day(-$i);
        $cal[] = ['d' => $d, 's' => isset($set[$d]) ? 'done' : (isset($rest[$d]) ? 'rest' : ($d === $today ? 'today' : 'miss'))];
    }
    return [
        'status' => (string)$c['status'], 'goal' => NK_CHURU_GOAL, 'near_m' => NK_CHURU_NEAR_M,
        'spot' => ['name' => (string)$c['spot_name']],
        'count' => min(NK_CHURU_GOAL, $s['count']), 'today_done' => $s['today'], 'rest_left' => $s['rest_left'],
        'rest_days' => $s['rests'], 'start' => $s['start'], 'today' => $today, 'calendar' => $cal,
        'done_day' => $c['done_day'], 'phone' => mask_phone($c['phone'] ?? null), 'note' => (string)$c['note'],
    ];
}
