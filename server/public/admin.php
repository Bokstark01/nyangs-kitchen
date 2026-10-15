<?php
// 냥's 키친 관리자 페이지 (운영자 전용)
//  - 비밀번호는 서버에서  bash server/tools/admin-password.sh  로 정한다 (server/admin.hash, GitHub에 올라가지 않음)
//  - 서버 백업에 동의한 사용자의 급식소만 보인다. 공유 기능의 급식소는 보이지 않는다.
//  - 모든 로그인·열람·검색은 nk_admin_log 에 남는다.
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';

const NK_ADMIN_IDLE = 7200;   // 2시간 동안 아무것도 안 하면 로그아웃
const STATUS_KO = ['pending' => '확인 필요', 'active' => '찾는 중', 'rejected' => '반려', 'found' => '찾음', 'closed' => '닫힘'];

$secure = (($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off');
session_name('nk_admin');
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Strict']);
session_start();
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');   // 지도 타일 서버가 출처(도메인)만 확인할 수 있게
header('Cache-Control: no-store');

function admin_hash(): string {
    $f = (string)cfg('admin_hash_file', __DIR__ . '/../admin.hash');
    return is_file($f) ? trim((string)file_get_contents($f)) : '';
}
function alog(string $action, string $detail = ''): void {
    db()->prepare('INSERT INTO nk_admin_log (at, ip, action, detail) VALUES (?, ?, ?, ?)')->execute([now(), client_ip(), $action, cut($detail, 300)]);
}
function logged_in(): bool {
    if (empty($_SESSION['nk_admin'])) return false;
    if (now() - (int)($_SESSION['nk_seen'] ?? 0) > NK_ADMIN_IDLE) { $_SESSION = []; return false; }
    $_SESSION['nk_seen'] = now();
    return true;
}
function csrf(): string { if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = rand_token(); return $_SESSION['csrf']; }
function check_csrf(): void { if (!hash_equals((string)($_SESSION['csrf'] ?? ''), (string)($_POST['csrf'] ?? $_SERVER['HTTP_X_CSRF'] ?? ''))) { http_response_code(403); exit('요청이 만료됐어요. 새로고침해 주세요.'); } }
function h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function meters(float $a, float $b, float $c, float $d): float {
    $r = 6371000; $p1 = deg2rad($a); $p2 = deg2rad($c); $dp = deg2rad($c - $a); $dl = deg2rad($d - $b);
    $x = sin($dp / 2) ** 2 + cos($p1) * cos($p2) * sin($dl / 2) ** 2;
    return 2 * $r * asin(min(1, sqrt($x)));
}

$p = (string)($_GET['p'] ?? '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    /* ---------- 로그인 ---------- */
    if ($p === 'logout') { if (logged_in()) alog('logout'); $_SESSION = []; session_destroy(); header('Location: admin.php'); exit; }
    if (!logged_in()) {
        $err = '';
        if ($method === 'POST') {
            check_csrf();
            throttle('admin_login', 5, 900);
            $hash = admin_hash();
            if ($hash === '') $err = '관리자 비밀번호가 아직 없어요. 서버에서 bash server/tools/admin-password.sh 를 실행하세요.';
            elseif (password_verify((string)($_POST['pw'] ?? ''), $hash)) {
                session_regenerate_id(true);
                $_SESSION['nk_admin'] = true; $_SESSION['nk_seen'] = now();
                alog('login');
                header('Location: admin.php'); exit;
            } else { alog('login_failed'); $err = '비밀번호가 맞지 않아요.'; }
        }
        page_head('관리자 로그인');
        echo '<main class="login"><h1>냥\'s 키친 관리자</h1>'
           . ($err ? '<p class="err">' . h($err) . '</p>' : '')
           . '<form method="post"><input type="hidden" name="csrf" value="' . h(csrf()) . '">'
           . '<input type="password" name="pw" placeholder="관리자 비밀번호" autocomplete="current-password" autofocus required>'
           . '<button>로그인</button></form><p class="muted">15분에 5번까지 시도할 수 있어요. 모든 접속은 기록돼요.</p></main></body></html>';
        exit;
    }

    $db = db();

    /* ---------- 데이터 ---------- */
    if ($p === 'points') {   // 지도에 올릴 전체 급식소 (이름·위치만)
        alog('view_map');
        $rows = $db->query('SELECT b.id, b.name, b.lat, b.lng FROM nk_backup_points b JOIN nk_consents c ON c.user_id = b.user_id AND c.backup = 1')->fetchAll();
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(array_map(fn($r) => [(int)$r['id'], $r['name'], round((float)$r['lat'], 6), round((float)$r['lng'], 6)], $rows), JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($p === 'near') {     // 한 지점 반경 안 급식소와 주인 (유실묘 찾기용)
        if ($method !== 'POST') { http_response_code(405); exit; }
        check_csrf();
        $lat = (float)($_POST['lat'] ?? 0); $lng = (float)($_POST['lng'] ?? 0);
        $radius = min(1000, max(10, (int)($_POST['r'] ?? 100)));
        $reason = cut((string)($_POST['reason'] ?? ''), 120);
        if ($reason === '') { http_response_code(400); exit('검색 이유를 적어주세요.'); }
        alog('near_search', sprintf('%.5f,%.5f r=%d · %s', $lat, $lng, $radius, $reason));
        $dLat = $radius / 111320; $dLng = $radius / (111320 * max(0.2, cos(deg2rad($lat))));
        $st = $db->prepare('SELECT b.*, u.nickname, u.email, u.provider FROM nk_backup_points b JOIN nk_consents c ON c.user_id = b.user_id AND c.backup = 1 JOIN nk_users u ON u.id = b.user_id WHERE b.lat BETWEEN ? AND ? AND b.lng BETWEEN ? AND ?');
        $st->execute([$lat - $dLat, $lat + $dLat, $lng - $dLng, $lng + $dLng]);
        $out = [];
        foreach ($st->fetchAll() as $r) {
            $m = meters($lat, $lng, (float)$r['lat'], (float)$r['lng']);
            if ($m > $radius) continue;
            $out[] = ['m' => (int)round($m), 'name' => $r['name'], 'lat' => (float)$r['lat'], 'lng' => (float)$r['lng'],
                'times' => array_map(fn($t) => $t['t'], json_decode((string)$r['times'], true) ?: []), 'cats' => json_decode((string)$r['cats'], true) ?: [],
                'owner' => $r['nickname'], 'uid' => (int)$r['user_id'], 'contact' => $r['email'] ?: '(' . $r['provider'] . ' 로그인, 이메일 없음)'];
        }
        usort($out, fn($a, $b) => $a['m'] <=> $b['m']);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($out, JSON_UNESCAPED_UNICODE);
        exit;
    }

    /* ---------- 유실 신고 ---------- */
    if ($p === 'lostphoto') {
        $l = find_lost((int)($_GET['id'] ?? 0));
        if (!$l || !$l['photo']) { http_response_code(404); exit; }
        $f = lost_photo_dir((int)$l['id']) . '/' . basename((string)$l['photo']);
        if (!is_file($f)) { http_response_code(404); exit; }
        header('Content-Type: image/jpeg'); readfile($f); exit;
    }
    if ($p === 'lost_act' && $method === 'POST') {
        check_csrf();
        $l = find_lost((int)($_POST['id'] ?? 0));
        $do = (string)($_POST['do'] ?? '');
        if ($l) {
            if ($do === 'notify') {
                $r = (int)($_POST['r'] ?? 50);
                if (!in_array($r, NK_LOST_STAGES, true)) $r = 50;
                $n = lost_notify($l, $r);
                alog('lost_notify', "#{$l['id']} r={$r} new={$n}");
                $_SESSION['flash'] = "신고 #{$l['id']}: {$r}m 안 급식소 주인 {$n}명에게 새로 알렸어요.";
            } elseif ($do === 'reject') {
                db()->prepare("UPDATE nk_lost SET status = 'rejected', admin_note = ?, updated_at = ? WHERE id = ?")->execute([cut((string)($_POST['note'] ?? ''), 300), now(), (int)$l['id']]);
                alog('lost_reject', "#{$l['id']}");
                $_SESSION['flash'] = "신고 #{$l['id']}를 반려했어요.";
            } elseif ($do === 'note') {
                db()->prepare('UPDATE nk_lost SET admin_note = ?, updated_at = ? WHERE id = ?')->execute([cut((string)($_POST['note'] ?? ''), 300), now(), (int)$l['id']]);
                alog('lost_note', "#{$l['id']}");
            }
        }
        header('Location: admin.php?p=lost'); exit;
    }
    if ($p === 'lost') {
        alog('view_lost');
        $rows = db()->query("SELECT l.*, u.nickname, u.email, u.provider FROM nk_lost l LEFT JOIN nk_users u ON u.id = l.user_id ORDER BY CASE l.status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 ELSE 2 END, l.id DESC LIMIT 60")->fetchAll();
        page_head('유실 신고');
        $flash = (string)($_SESSION['flash'] ?? ''); unset($_SESSION['flash']);
        $c = h(csrf());
        echo '<header><b>냥\'s 키친 관리자</b><nav><a href="admin.php">지도</a><a href="admin.php?p=lost" class="on">유실 신고</a><a href="admin.php?p=log">열람 기록</a><a href="admin.php?p=logout">로그아웃</a></nav></header><main class="pad">';
        if ($flash) echo '<p class="flash">' . h($flash) . '</p>';
        echo '<h2>유실 신고</h2><p class="muted">보호자 정보와 사진·특징을 확인한 뒤 <b>50m 알림</b>을 보내고, 소식이 없으면 <b>100m로 넓히기</b>를 누르세요. 급식소 위치는 보호자에게 보이지 않아요.</p>';
        if (!$rows) echo '<p class="muted">아직 신고가 없어요.</p>';
        foreach ($rows as $l) {
            $id = (int)$l['id']; $cnt = lost_counts($id);
            $near50 = count(owners_near((float)$l['lat'], (float)$l['lng'], 50, (int)$l['user_id']));
            $near100 = count(owners_near((float)$l['lat'], (float)$l['lng'], 100, (int)$l['user_id']));
            $rs = db()->prepare('SELECT r.*, u.nickname FROM nk_lost_replies r LEFT JOIN nk_users u ON u.id = r.user_id WHERE r.lost_id = ? ORDER BY r.id DESC');
            $rs->execute([$id]);
            echo '<article class="lost"><div class="ph">' . ($l['photo'] ? '<img src="admin.php?p=lostphoto&id=' . $id . '" alt="">' : '<span>사진 없음</span>') . '</div><div class="bd">'
               . '<b>#' . $id . ' ' . h($l['cat_name']) . '</b> <span class="st st-' . h($l['status']) . '">' . h(STATUS_KO[$l['status']] ?? $l['status']) . '</span>'
               . '<p>' . nl2br(h($l['description'])) . '</p>'
               . '<p class="muted">잃어버린 날 ' . h($l['lost_date']) . ' · 위치 ' . sprintf('%.5f, %.5f', $l['lat'], $l['lng']) . ' · 신고 ' . h(date('m/d H:i', (int)$l['created_at'])) . '<br>보호자 ' . h($l['nickname'] ?? '탈퇴') . ' (회원 #' . (int)$l['user_id'] . ', ' . h($l['email'] ?: $l['provider'] . ' 로그인') . ')' . ($l['contact'] ? ' · 공개 연락처 ' . h($l['contact']) : '') . '</p>'
               . '<p class="muted">반경 안 백업 급식소 주인: 50m ' . $near50 . '명 · 100m ' . $near100 . '명 · 지금까지 알림 ' . $cnt['notified'] . '명 (확인 ' . $cnt['opened'] . ')</p>';
            if (in_array($l['status'], ['pending', 'active'], true)) {
                echo '<div class="acts">';
                foreach (NK_LOST_STAGES as $r) {
                    if ((int)$l['radius'] >= $r) continue;
                    echo '<form method="post" action="admin.php?p=lost_act"><input type="hidden" name="csrf" value="' . $c . '"><input type="hidden" name="id" value="' . $id . '"><input type="hidden" name="do" value="notify"><input type="hidden" name="r" value="' . $r . '"><button>' . ($r === 50 ? '확인 · 50m 알림 보내기' : '100m로 넓히기') . '</button></form>';
                }
                if ($l['status'] === 'pending') echo '<form method="post" action="admin.php?p=lost_act" class="rej"><input type="hidden" name="csrf" value="' . $c . '"><input type="hidden" name="id" value="' . $id . '"><input type="hidden" name="do" value="reject"><input name="note" placeholder="반려 이유 (보호자에게 보여요)"><button class="ghost">반려</button></form>';
                echo '</div>';
            }
            foreach ($rs->fetchAll() as $r) echo '<p class="reply">' . ((int)$r['seen'] ? '👀 봤어요' : '🙅 못 봤어요') . ' · ' . h($r['nickname'] ?? '') . ' · ' . h(date('m/d H:i', (int)$r['created_at'])) . ($r['note'] !== '' ? ' — ' . h($r['note']) : '') . '</p>';
            echo '</div></article>';
        }
        echo '</main></body></html>';
        exit;
    }

    /* ---------- 화면 ---------- */
    $stat = fn(string $sql) => (int)$db->query($sql)->fetchColumn();
    $users = $stat('SELECT COUNT(*) FROM nk_users');
    $consented = $stat('SELECT COUNT(*) FROM nk_consents WHERE backup = 1');
    $points = $stat('SELECT COUNT(*) FROM nk_backup_points b JOIN nk_consents c ON c.user_id = b.user_id AND c.backup = 1');
    $shares = $stat('SELECT COUNT(*) FROM nk_shares');
    $new7 = $db->prepare('SELECT COUNT(*) FROM nk_users WHERE created_at > ?'); $new7->execute([now() - 7 * 86400]); $new7 = (int)$new7->fetchColumn();

    if ($p === 'log') {
        alog('view_log');
        $rows = $db->query('SELECT * FROM nk_admin_log ORDER BY id DESC LIMIT 300')->fetchAll();
        page_head('관리자 기록');
        echo '<header><b>냥\'s 키친 관리자</b><nav><a href="admin.php">지도</a><a href="admin.php?p=lost">유실 신고</a><a href="admin.php?p=log" class="on">열람 기록</a><a href="admin.php?p=logout">로그아웃</a></nav></header><main class="pad"><h2>최근 관리자 기록 300건</h2><table><tr><th>시각</th><th>IP</th><th>동작</th><th>내용</th></tr>';
        foreach ($rows as $r) echo '<tr><td>' . h(date('Y-m-d H:i', (int)$r['at'])) . '</td><td>' . h($r['ip']) . '</td><td>' . h($r['action']) . '</td><td>' . h($r['detail']) . '</td></tr>';
        echo '</table></main></body></html>';
        exit;
    }

    $pend = $stat("SELECT COUNT(*) FROM nk_lost WHERE status = 'pending'");
    $pendingBadge = $pend ? " ({$pend})" : '';
    page_head('관리자');
    $csrf = h(csrf());
    echo <<<HTML
<header><b>냥's 키친 관리자</b><nav><a href="admin.php" class="on">지도</a><a href="admin.php?p=lost">유실 신고{$pendingBadge}</a><a href="admin.php?p=log">열람 기록</a><a href="admin.php?p=logout">로그아웃</a></nav></header>
<section class="stats">
  <div><span>회원</span><b>{$users}</b><small>최근 7일 +{$new7}</small></div>
  <div><span>백업 동의</span><b>{$consented}</b><small>명</small></div>
  <div><span>백업된 급식소</span><b>{$points}</b><small>곳 (지도 표시)</small></div>
  <div><span>공유 중인 급식소</span><b>{$shares}</b><small>곳 (내용은 보지 않음)</small></div>
</section>
<section class="split">
  <div id="map"></div>
  <aside>
    <h2>유실묘 찾기 · 반경 검색</h2>
    <p class="muted">지도에서 유실 지점을 누르고, 이유를 적은 뒤 검색하세요. 검색은 모두 기록돼요.</p>
    <form id="near">
      <input type="hidden" name="csrf" value="{$csrf}">
      <div class="row"><input name="lat" id="lat" placeholder="위도" required><input name="lng" id="lng" placeholder="경도" required></div>
      <div class="row"><select name="r"><option value="50">50m</option><option value="100" selected>100m</option><option value="300">300m</option></select></div>
      <div class="row"><input name="reason" placeholder="검색 이유 (예: 유실 신고 #12 확인)" required></div>
      <button>검색</button>
    </form>
    <div id="res"></div>
  </aside>
</section>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function(){
  var map = L.map('map').setView([36.4, 127.8], 7);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution:'© OpenStreetMap contributors'}).addTo(map);
  var esc = function(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  fetch('admin.php?p=points').then(function(r){ return r.json(); }).then(function(rows){
    var b = [];
    rows.forEach(function(p){ L.circleMarker([p[2], p[3]], {radius:6, color:'#1F4A36', fillColor:'#2F6B4F', fillOpacity:.9, weight:2}).bindTooltip(esc(p[1])).addTo(map); b.push([p[2], p[3]]); });
    if (b.length) map.fitBounds(b, {padding:[30,30], maxZoom:16});
  });
  var pin = null, rings = [];
  map.on('click', function(e){
    document.getElementById('lat').value = e.latlng.lat.toFixed(6);
    document.getElementById('lng').value = e.latlng.lng.toFixed(6);
    if (pin) pin.remove(); pin = L.marker(e.latlng).addTo(map);
  });
  document.getElementById('near').addEventListener('submit', function(ev){
    ev.preventDefault();
    var fd = new FormData(ev.target), lat = +fd.get('lat'), lng = +fd.get('lng'), r = +fd.get('r');
    rings.forEach(function(x){ x.remove(); }); rings = [50, 100].concat(r > 100 ? [r] : []).map(function(m){ return L.circle([lat, lng], {radius:m, color:'#C2560F', weight:2, dashArray:'6 6', fill:false}).addTo(map); });
    map.setView([lat, lng], 17);
    fetch('admin.php?p=near', {method:'POST', body:fd}).then(function(res){ return res.ok ? res.json() : res.text().then(function(t){ throw new Error(t); }); }).then(function(rows){
      document.getElementById('res').innerHTML = rows.length ? '<p><b>' + rows.length + '곳</b> 찾았어요 (가까운 순)</p>' + rows.map(function(p){
        return '<div class="hit"><b>' + p.m + 'm · ' + esc(p.name) + '</b><span>주인: ' + esc(p.owner) + ' (회원 #' + p.uid + ') · ' + esc(p.contact) + '</span><span>밥 시간 ' + esc(p.times.join(', ') || '-') + ' · 고양이 ' + esc(p.cats.join(', ') || '-') + '</span></div>';
      }).join('') : '<p class="muted">반경 안에 백업된 급식소가 없어요.</p>';
    }).catch(function(e){ document.getElementById('res').innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  });
})();
</script>
</body></html>
HTML;
} catch (Throwable $e) {
    error_log('nyangs-kitchen admin error: ' . $e->getMessage());
    http_response_code(500);
    echo '서버 오류가 났어요.';
}

function page_head(string $title): void {
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>' . h($title) . '</title><style>'
       . ':root{--g:#2F6B4F;--d:#1F4A36;--line:#D5DBD5;--bg:#F4F6F2}*{box-sizing:border-box}body{margin:0;font:15px/1.55 system-ui,"Noto Sans KR",sans-serif;background:var(--bg);color:#1D2B24}'
       . 'header{display:flex;justify-content:space-between;align-items:center;padding:12px 18px;background:var(--d);color:#F4ECD6}header nav a{color:#F4ECD6;margin-left:14px;text-decoration:none;opacity:.8}header nav a.on{opacity:1;font-weight:700;text-decoration:underline}'
       . '.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:14px 18px}.stats div{background:#fff;border-radius:12px;padding:12px 14px;display:flex;flex-direction:column}.stats span{font-size:13px;color:#56635C}.stats b{font-size:26px}.stats small{color:#56635C}'
       . '.split{display:grid;grid-template-columns:1fr 380px;gap:12px;padding:0 18px 18px;height:calc(100vh - 190px);min-height:480px}#map{border-radius:12px;min-height:380px}aside{background:#fff;border-radius:12px;padding:14px;overflow:auto}aside h2{font-size:17px;margin:0 0 6px}'
       . 'input,select{border:1px solid var(--line);border-radius:10px;padding:10px;font:inherit;width:100%;min-width:0}.row{display:flex;gap:8px;margin-bottom:8px}button{background:var(--g);color:#fff;border:0;border-radius:10px;padding:11px 16px;font:inherit;font-weight:700;cursor:pointer;width:100%}'
       . '.hit{border-top:1px solid var(--line);padding:9px 0;display:flex;flex-direction:column;gap:2px}.hit span{font-size:13px;color:#56635C}.muted{color:#56635C;font-size:13px}.err{color:#A84A0C}'
       . '.login{max-width:360px;margin:12vh auto;background:#fff;border-radius:16px;padding:24px;display:flex;flex-direction:column;gap:12px}.login h1{font-size:20px;margin:0}.login form{display:flex;flex-direction:column;gap:10px}'
       . '.pad{padding:18px}table{width:100%;border-collapse:collapse;background:#fff;font-size:13px}th,td{border-bottom:1px solid var(--line);padding:7px 9px;text-align:left}'
       . '.flash{background:#DDEBE2;padding:10px 14px;border-radius:10px}.lost{display:flex;gap:14px;background:#fff;border-radius:12px;padding:14px;margin:12px 0}.lost .ph{width:140px;flex-shrink:0}.lost img{width:140px;border-radius:10px}.lost .ph span{display:block;width:140px;height:100px;background:#EEF1EC;border-radius:10px;text-align:center;line-height:100px;color:#56635C;font-size:13px}.lost .bd{flex:1;min-width:0}.lost p{margin:6px 0}'
       . '.acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.acts form{display:flex;gap:6px}.acts button{width:auto}.acts .rej input{width:220px}button.ghost{background:#fff;color:#A84A0C;border:1px solid #C2560F}.reply{background:#F4F6F2;border-radius:8px;padding:6px 10px;font-size:13px}'
       . '.st{font-size:12px;font-weight:700;padding:2px 8px;border-radius:8px;background:#EEF1EC}.st-pending{background:#FBE9DD;color:#A84A0C}.st-active{background:#DDEBE2;color:#1F4A36}'
       . '@media(max-width:800px){.stats{grid-template-columns:repeat(2,1fr)}.split{grid-template-columns:1fr;height:auto}#map{height:55vh}}'
       . '</style></head><body>';
}
