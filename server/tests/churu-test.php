<?php
// 츄르 챌린지 점검: 연속 기록 계산, 위치·사진·하루 1번, 30일 달성 → 번호 → 운영자 보냄/반려, 탈퇴 시 삭제
$B = 'http://127.0.0.1:8099'; $fails = 0;
$pdo = new PDO(getenv('DBDSN')); $pdo->exec('DELETE FROM nk_attempts');
function now(): int { return time(); }
function storage_dir(): string { return getenv('STORAGE'); }
require __DIR__ . '/../lib/churu.php';
function ok($name, $cond, $extra = '') { global $fails; echo ($cond ? 'PASS ' : 'FAIL ') . $name . ($cond ? '' : "  $extra") . "\n"; if (!$cond) $fails++; }
function req($m, $u, $data = null, $tok = null) { $ch = curl_init($u); $hd = ['Content-Type: application/json', 'Origin: https://localhost']; if ($tok) $hd[] = "X-NK-Token: $tok";
  curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => 1, CURLOPT_CUSTOMREQUEST => $m, CURLOPT_HTTPHEADER => $hd]);
  if ($data !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data)); $r = curl_exec($ch);
  return ['s' => curl_getinfo($ch, CURLINFO_RESPONSE_CODE), 'raw' => $r, 'j' => json_decode($r, true)]; }
$jar = tempnam(sys_get_temp_dir(), 'nkc');
function adm($path, $post = null) { global $B, $jar; $ch = curl_init("$B/$path"); curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => 1, CURLOPT_COOKIEJAR => $jar, CURLOPT_COOKIEFILE => $jar, CURLOPT_FOLLOWLOCATION => 0]);
  if ($post !== null) { curl_setopt($ch, CURLOPT_POST, 1); curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($post)); } $r = curl_exec($ch); return ['s' => curl_getinfo($ch, CURLINFO_RESPONSE_CODE), 'raw' => $r]; }
function csrf_of($html) { return preg_match('/name="csrf" value="([a-f0-9]{64})"/', $html, $m) ? $m[1] : ''; }
function user($email, $nick) { global $B; $r = req('POST', "$B/api.php?action=signup", ['email' => $email, 'password' => 'abcd1234', 'nickname' => $nick]); return [$r['j']['token'], $r['j']['user']['id']]; }

// ---- 연속 기록 계산 (순수 함수) ----
$T = '2026-10-24';
$seq = fn($from, $n) => array_map(fn($i) => day_add($from, $i), range(0, $n - 1));
$s = churu_streak($seq('2026-10-20', 5), '2026-10-01', $T); ok('5 days incl today', $s['count'] === 5 && $s['today'] && !$s['rests']);
$s = churu_streak($seq('2026-10-19', 5), '2026-10-01', $T); ok('today pending keeps streak', $s['count'] === 5 && !$s['today']);
$d = array_merge($seq('2026-10-10', 5), $seq('2026-10-16', 9)); // 10-15 빠짐
$s = churu_streak($d, '2026-10-01', $T); ok('one rest day bridges', $s['count'] === 14 && $s['rests'] === ['2026-10-15'] && !$s['rest_left'], json_encode($s));
$d = array_merge($seq('2026-10-05', 3), $seq('2026-10-09', 3), $seq('2026-10-13', 12)); // 10-08, 10-12 빠짐 (30일 안에 두 번)
$s = churu_streak($d, '2026-10-01', $T); ok('second rest within 30 days breaks', $s['count'] === 15 && $s['start'] === '2026-10-09', json_encode($s));
$d = array_merge($seq('2026-10-15', 5), $seq('2026-10-22', 3)); // 이틀 연속 빠짐
$s = churu_streak($d, '2026-10-01', $T); ok('two missing days break', $s['count'] === 3);
$s = churu_streak($seq('2026-10-20', 3), '2026-10-01', $T); ok('yesterday missed but today pending: rest used', $s['count'] === 3 && $s['rests'] === ['2026-10-23'], json_encode($s));
$s = churu_streak($seq('2026-10-10', 10), '2026-10-15', $T); ok('days before start ignored', $s['count'] === 0);
ok('phone normalize', normalize_phone('01012345678') === '010-1234-5678' && normalize_phone('010 123 4567') === '010-123-4567' && normalize_phone('02-123-4567') === null);

// ---- API ----
[$ta, $ia] = user('c1@ex.com', '츄르집사'); [$tb, $ib] = user('c2@ex.com', '이웃');
$im = imagecreatetruecolor(800, 600); imagefill($im, 0, 0, imagecolorallocate($im, 120, 160, 90)); ob_start(); imagejpeg($im, null, 70); $jpg = 'data:image/jpeg;base64,' . base64_encode(ob_get_clean());
$spot = ['name' => '골목 화단', 'lat' => 37.5563, 'lng' => 126.9019];

$r = req('GET', "$B/churu.php?action=status"); ok('needs login', $r['s'] == 401);
$r = req('GET', "$B/churu.php?action=status", null, $ta); ok('status none', $r['j']['status'] === 'none' && $r['j']['goal'] === 30);
$r = req('POST', "$B/churu.php?action=join", $spot, $ta); ok('join needs agree', $r['s'] == 400);
$r = req('POST', "$B/churu.php?action=join", $spot + ['agree' => true], $ta); ok('join', $r['s'] == 200 && $r['j']['status'] === 'active' && $r['j']['count'] === 0, $r['raw']);
ok('spot coords not echoed', !isset($r['j']['spot']['lat']) && strpos($r['raw'], '126.9019') === false);
$r = req('POST', "$B/churu.php?action=checkin", ['lat' => 37.5563, 'lng' => 126.9019], $ta); ok('photo required', $r['s'] == 400 && $r['j']['error'] === 'need_photo');
$r = req('POST', "$B/churu.php?action=checkin", ['lat' => 37.5663, 'lng' => 126.9019, 'photo' => $jpg], $ta); ok('too far rejected', $r['s'] == 422 && strpos($r['j']['message'], '1112m') !== false, $r['raw']);
$r = req('POST', "$B/churu.php?action=checkin", ['lat' => 37.5570, 'lng' => 126.9020, 'photo' => $jpg], $ta); ok('checkin near (78m)', $r['s'] == 200 && $r['j']['count'] === 1 && $r['j']['today_done'], $r['raw']);
$row = $pdo->query("SELECT * FROM nk_churu_days WHERE user_id = $ia")->fetch(PDO::FETCH_ASSOC);
ok('only distance stored, not location', $row && (int)$row['meters'] === 78 && !array_key_exists('lat', $row));
$r = req('POST', "$B/churu.php?action=checkin", ['lat' => 37.5563, 'lng' => 126.9019, 'photo' => $jpg], $ta); ok('once per day', $r['s'] == 409 && $r['j']['error'] === 'already_today');
$r = req('POST', "$B/churu.php?action=claim", ['phone' => '01012345678', 'agree' => true], $ta); ok('cannot claim before 30', $r['s'] == 409);

// 지난 28일을 DB에 직접 채우고 (10일 전 하루는 쉬는 날) 오늘 인증 = 29일 → 하나 더 필요
$today = kst_day();
$photoName = $row['photo'];
$pdo->exec("UPDATE nk_churu SET start_day = '" . kst_day(-40) . "' WHERE user_id = $ia");
for ($i = 1; $i <= 29; $i++) { if ($i === 10) continue; $pdo->exec("INSERT INTO nk_churu_days (user_id, day, photo, meters, created_at) VALUES ($ia, '" . kst_day(-$i) . "', '$photoName', 10, 0)"); }
$r = req('GET', "$B/churu.php?action=status", null, $ta); ok('29 days with one rest', $r['j']['count'] === 29 && $r['j']['rest_days'] === [kst_day(-10)] && !$r['j']['rest_left'] && $r['j']['status'] === 'active', $r['raw']);
ok('calendar has 35 days', count($r['j']['calendar']) === 35 && end($r['j']['calendar'])['s'] === 'done');
// 하루 더 (어제 날짜로 30번째 넣고 상태 갱신은 체크인에서) → 30일차를 오늘 인증으로 만들기 위해 가장 오래된 날 하나 추가
$pdo->exec("INSERT INTO nk_churu_days (user_id, day, photo, meters, created_at) VALUES ($ia, '" . kst_day(-30) . "', '$photoName', 10, 0)");
$pdo->exec("DELETE FROM nk_churu_days WHERE user_id = $ia AND day = '$today'");
$r = req('POST', "$B/churu.php?action=checkin", ['lat' => 37.5563, 'lng' => 126.9019, 'photo' => $jpg], $ta); ok('30th day → done', $r['j']['status'] === 'done' && $r['j']['count'] === 30, $r['raw']);
$r = req('POST', "$B/churu.php?action=join", $spot + ['agree' => true], $ta); ok('cannot restart after done', $r['s'] == 409);
$r = req('POST', "$B/churu.php?action=claim", ['phone' => '02-123-4567', 'agree' => true], $ta); ok('bad phone', $r['s'] == 400);
$r = req('POST', "$B/churu.php?action=claim", ['phone' => '010-1234-5678', 'agree' => true], $ta); ok('claim', $r['j']['status'] === 'claimed' && $r['j']['phone'] === '010-****-**78', $r['raw']);

// 운영자: 확인 → 보냄 (번호·사진 삭제)
$c = csrf_of(adm('admin.php')['raw']); adm('admin.php', ['csrf' => $c, 'pw' => 'test-admin-pass-123']);
$h = adm('admin.php?p=churu')['raw']; ok('admin sees claim with phone + photos', strpos($h, '010-1234-5678') !== false && substr_count($h, 'p=churuphoto') >= 2 && strpos($h, '츄르 (1)') !== false, substr($h, 0, 200));
$r = adm("admin.php?p=churuphoto&u=$ia&f=$photoName"); ok('admin photo', $r['s'] == 200);
$r = req('GET', "$B/admin.php?p=churuphoto&u=$ia&f=$photoName"); ok('photo needs admin', $r['s'] != 200 || strpos((string)$r['raw'], "\xFF\xD8") !== 0);
adm('admin.php?p=churu_act', ['csrf' => csrf_of($h), 'u' => $ia, 'do' => 'sent']);
$row = $pdo->query("SELECT * FROM nk_churu WHERE user_id = $ia")->fetch(PDO::FETCH_ASSOC);
ok('sent: phone + location wiped', $row['status'] === 'sent' && $row['phone'] === null && (float)$row['lat'] === 0.0);
ok('sent: photos wiped', (int)$pdo->query("SELECT COUNT(*) FROM nk_churu_days WHERE user_id = $ia")->fetchColumn() === 0 && !glob(getenv('STORAGE') . "/churu/$ia/*.jpg"));
$r = req('GET', "$B/churu.php?action=status", null, $ta); ok('user sees sent', $r['j']['status'] === 'sent');

// 다른 회원: 시작 → 급식소 바꾸기는 reset 필요 → 그만두기 → 탈퇴하면 삭제
req('POST', "$B/churu.php?action=join", $spot + ['agree' => true], $tb);
req('POST', "$B/churu.php?action=checkin", ['lat' => 37.5563, 'lng' => 126.9019, 'photo' => $jpg], $tb);
$r = req('POST', "$B/churu.php?action=join", ['name' => '공원', 'lat' => 37.56, 'lng' => 126.91, 'agree' => true], $tb); ok('change spot needs reset', $r['s'] == 409 && $r['j']['error'] === 'need_reset');
$r = req('POST', "$B/churu.php?action=join", ['name' => '공원', 'lat' => 37.56, 'lng' => 126.91, 'agree' => true, 'reset' => true], $tb); ok('reset starts over', $r['j']['count'] === 0 && $r['j']['spot']['name'] === '공원');
$r = req('POST', "$B/churu.php?action=checkin", ['lat' => 37.56, 'lng' => 126.91, 'photo' => $jpg], $tb);
$r = req('POST', "$B/api.php?action=delete", ['password' => 'abcd1234'], $tb); ok('account delete', $r['s'] == 200);
ok('churu wiped on account delete', (int)$pdo->query("SELECT COUNT(*) FROM nk_churu WHERE user_id = $ib")->fetchColumn() === 0 && (int)$pdo->query("SELECT COUNT(*) FROM nk_churu_days WHERE user_id = $ib")->fetchColumn() === 0);

echo $fails ? "$fails FAILED\n" : "ALL PASSED\n";
