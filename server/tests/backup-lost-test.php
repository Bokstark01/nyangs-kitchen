<?php
// 급식소 서버 백업 · 관리자 페이지 · 탐정모드 점검
$B='http://127.0.0.1:8099'; $fails=0;
function req($m,$u,$data=null,$tok=null){ $ch=curl_init($u); $hd=['Content-Type: application/json','Origin: https://localhost']; if($tok)$hd[]="X-NK-Token: $tok";
 curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>1,CURLOPT_CUSTOMREQUEST=>$m,CURLOPT_HTTPHEADER=>$hd]);
 if($data!==null) curl_setopt($ch,CURLOPT_POSTFIELDS,json_encode($data)); $r=curl_exec($ch);
 return ['s'=>curl_getinfo($ch,CURLINFO_RESPONSE_CODE),'raw'=>$r,'j'=>json_decode($r,true)]; }
$jar=tempnam(sys_get_temp_dir(),'nkadm');
function adm($path,$post=null){ global $B,$jar; $ch=curl_init("$B/$path"); curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>1,CURLOPT_COOKIEJAR=>$jar,CURLOPT_COOKIEFILE=>$jar,CURLOPT_FOLLOWLOCATION=>0]);
 if($post!==null){ curl_setopt($ch,CURLOPT_POST,1); curl_setopt($ch,CURLOPT_POSTFIELDS,http_build_query($post)); } $r=curl_exec($ch); return ['s'=>curl_getinfo($ch,CURLINFO_RESPONSE_CODE),'raw'=>$r]; }
function csrf_of($html){ return preg_match('/name="csrf" value="([a-f0-9]{64})"/',$html,$m)?$m[1]:''; }
function ok($name,$cond,$extra=''){ global $fails; echo ($cond?'PASS ':'FAIL ').$name.($cond?'':"  $extra")."\n"; if(!$cond)$fails++; }
function user($email,$nick){ global $B; $r=req('POST',"$B/api.php?action=signup",['email'=>$email,'password'=>'abcd1234','nickname'=>$nick]); return [$r['j']['token'],$r['j']['user']['id']]; }
[$tA,$iA]=user('feeder-a@ex.com','가까운집사'); [$tB,$iB]=user('feeder-b@ex.com','조금먼집사'); [$tC,$iC]=user('nobackup@ex.com','백업안함'); [$tL,$iL]=user('lost@ex.com','보호자');
$base=[37.50000,127.00000]; $off=fn($m)=>$base[0]+$m/111320;   // 북쪽으로 m 미터
// --- 백업 ---
$r=req('GET',"$B/backup.php?action=status",null,$tA); ok('status: no consent yet',$r['s']==200&&$r['j']['consent']===null);
$pts=[['nid'=>'a1','name'=>'골목 화단','lat'=>$off(30),'lng'=>$base[1],'times'=>[['t'=>'18:00','label'=>'저녁'],['t'=>'99:00']],'cats'=>[['name'=>'치즈','photo'=>'data:...']]]];
$r=req('POST',"$B/backup.php?action=sync",['points'=>$pts],$tA); ok('sync without consent 403',$r['s']==403);
req('POST',"$B/backup.php?action=consent",['on'=>true],$tA);
$r=req('POST',"$B/backup.php?action=sync",['points'=>$pts],$tA); ok('sync after consent',$r['s']==200&&$r['j']['count']===1,$r['raw']);
$r=req('GET',"$B/backup.php?action=restore",null,$tA); $p0=$r['j']['points'][0]??[];
ok('restore returns point, bad time dropped, cat name only',($p0['name']??'')==='골목 화단'&&count($p0['times'])===1&&$p0['cats']===['치즈'],json_encode($p0,JSON_UNESCAPED_UNICODE));
$pts[]=['nid'=>'a2','name'=>'두번째','lat'=>$off(500),'lng'=>$base[1],'times'=>[],'cats'=>[]];
req('POST',"$B/backup.php?action=sync",['points'=>$pts],$tA);
$r=req('POST',"$B/backup.php?action=sync",['points'=>[$pts[0]]],$tA); $r=req('GET',"$B/backup.php?action=status",null,$tA); ok('sync removes deleted points',$r['j']['count']===1);
req('POST',"$B/backup.php?action=consent",['on'=>true],$tB);
req('POST',"$B/backup.php?action=sync",['points'=>[['nid'=>'b1','name'=>'놀이터 뒤','lat'=>$off(80),'lng'=>$base[1]]]],$tB);
req('POST',"$B/backup.php?action=consent",['on'=>false],$tC);
$r=req('POST',"$B/backup.php?action=sync",['points'=>[['nid'=>'c1','name'=>'몰래','lat'=>$off(10),'lng'=>$base[1]]]],$tC); ok('no-consent user cannot sync',$r['s']==403);
// --- 관리자 ---
$r=adm('admin.php?p=points'); ok('admin data needs login',strpos($r['raw'],'관리자 비밀번호')!==false&&strpos($r['raw'],'골목')===false);
$c=csrf_of(adm('admin.php')['raw']); $r=adm('admin.php',['csrf'=>$c,'pw'=>'wrong']); ok('admin wrong password',strpos($r['raw'],'맞지 않아요')!==false);
$c=csrf_of($r['raw']); $r=adm('admin.php',['csrf'=>$c,'pw'=>'test-admin-pass-123']); ok('admin login redirect',$r['s']==302);
$r=adm('admin.php?p=points'); $j=json_decode($r['raw'],true); ok('admin map shows only consented points (2)',is_array($j)&&count($j)===2,$r['raw']);
$h=adm('admin.php')['raw']; $c=csrf_of($h); ok('dashboard stats',strpos($h,'백업된 급식소')!==false);
$r=adm('admin.php?p=near',['csrf'=>$c,'lat'=>$base[0],'lng'=>$base[1],'r'=>100,'reason'=>'']); ok('near search needs reason',$r['s']==400);
$r=adm('admin.php?p=near',['csrf'=>$c,'lat'=>$base[0],'lng'=>$base[1],'r'=>50,'reason'=>'테스트']); $j=json_decode($r['raw'],true); ok('near 50m finds A only',count($j)===1&&$j[0]['owner']==='가까운집사',$r['raw']);
$r=adm('admin.php?p=near',['csrf'=>'bad','lat'=>1,'lng'=>1,'r'=>50,'reason'=>'x']); ok('near without csrf blocked',$r['s']==403);
// --- 탐정모드 ---
$im=imagecreatetruecolor(80,60); ob_start(); imagejpeg($im,null,70); $jpg=base64_encode(ob_get_clean());
$r=req('POST',"$B/lost.php?action=report",['cat_name'=>'까망이','description'=>'검은 고양이, 빨간 목걸이','photo'=>$jpg,'lat'=>$base[0],'lng'=>$base[1],'lost_date'=>date('Y-m-d'),'contact'=>'010-0000-0000'],$tL);
ok('lost report created',$r['s']==201,$r['raw']); $lid=$r['j']['id'];
$r=req('GET',"$B/lost.php?action=list",null,$tL); ok('reporter sees pending',($r['j']['mine'][0]['status']??'')==='pending');
$r=req('GET',"$B/lost.php?action=list",null,$tA); ok('owner sees nothing before approval',count($r['j']['nearby'])===0);
$r=req('GET',"$B/lost.php?action=photo&id=$lid",null,$tA); ok('owner cannot see photo before notice',$r['s']==403);
$h=adm('admin.php?p=lost')['raw']; ok('admin lost list shows report',strpos($h,'까망이')!==false&&strpos($h,'50m 1명 · 100m 2명')!==false,'');
$c=csrf_of($h); adm('admin.php?p=lost_act',['csrf'=>$c,'id'=>$lid,'do'=>'notify','r'=>50]);
$r=req('GET',"$B/lost.php?action=list",null,$tA); $n=$r['j']['nearby'][0]??[]; ok('A notified at 50m with own point name',($n['point_name']??'')==='골목 화단'&&$n['meters']===30&&$r['j']['unread']===1,json_encode($n,JSON_UNESCAPED_UNICODE));
ok('notice has no reporter location',!isset($n['lat'])&&!isset($n['lng']));
$r=req('GET',"$B/lost.php?action=list",null,$tB); ok('B (80m) not yet notified',count($r['j']['nearby'])===0);
$r=req('GET',"$B/lost.php?action=list",null,$tC); ok('no-backup user never notified',count($r['j']['nearby'])===0);
$r=req('GET',"$B/lost.php?action=photo&id=$lid",null,$tA); ok('notified owner sees photo',$r['s']==200);
$c=csrf_of(adm('admin.php?p=lost')['raw']); adm('admin.php?p=lost_act',['csrf'=>$c,'id'=>$lid,'do'=>'notify','r'=>100]);
$r=req('GET',"$B/lost.php?action=list",null,$tB); ok('B notified after 100m',count($r['j']['nearby'])===1);
$r=req('POST',"$B/lost.php?action=reply",['lost_id'=>$lid,'seen'=>true,'note'=>'어제 저녁 화단 근처에서 봤어요'],$tA); ok('owner replies seen',$r['s']==200);
$r=req('POST',"$B/lost.php?action=reply",['lost_id'=>$lid,'seen'=>true],$tC); ok('stranger cannot reply',$r['s']==403);
$r=req('GET',"$B/lost.php?action=list",null,$tL); $m=$r['j']['mine'][0];
ok('reporter sees reply + counts, no point location',$m['status']==='active'&&$m['counts']['notified']===2&&($m['replies'][0]['note']??'')==='어제 저녁 화단 근처에서 봤어요'&&!isset($m['replies'][0]['lat']),json_encode($m,JSON_UNESCAPED_UNICODE));
$r=req('POST',"$B/lost.php?action=close",['lost_id'=>$lid,'found'=>true],$tA); ok('only reporter can close',$r['s']==403);
$r=req('POST',"$B/lost.php?action=close",['lost_id'=>$lid,'found'=>true],$tL); ok('reporter closes as found',$r['s']==200);
$r=req('GET',"$B/lost.php?action=list",null,$tA); ok('closed report disappears for owners',count($r['j']['nearby'])===0);
$r=req('POST',"$B/lost.php?action=delete",['lost_id'=>$lid],$tA); ok('only reporter can delete',$r['s']==403);
$r=req('POST',"$B/lost.php?action=delete",['lost_id'=>$lid],$tL); ok('reporter deletes finished report',$r['s']==200);
$r=req('GET',"$B/lost.php?action=list",null,$tL); ok('deleted report gone + photo removed',count($r['j']['mine'])===0&&!is_dir(getenv('STORAGE')."/lost/$lid"));
$h=adm('admin.php?p=log')['raw']; ok('admin log records searches',strpos($h,'near_search')!==false&&strpos($h,'lost_notify')!==false);
// --- 탈퇴 연쇄 삭제 ---
req('POST',"$B/api.php?action=delete",[],$tL); $db=new PDO(getenv('DBDSN'));
ok('reporter deletion removes report + photo',(int)$db->query("SELECT COUNT(*) FROM nk_lost WHERE id=$lid")->fetchColumn()===0&&!is_dir(getenv('STORAGE')."/lost/$lid"));
req('POST',"$B/api.php?action=delete",[],$tA);
ok('owner deletion removes backup + consent',(int)$db->query("SELECT COUNT(*) FROM nk_backup_points WHERE user_id=$iA")->fetchColumn()===0&&(int)$db->query("SELECT COUNT(*) FROM nk_consents WHERE user_id=$iA")->fetchColumn()===0);
req('POST',"$B/backup.php?action=consent",['on'=>false],$tB); ok('consent off deletes backup',(int)$db->query("SELECT COUNT(*) FROM nk_backup_points WHERE user_id=$iB")->fetchColumn()===0);
@unlink($jar);
echo $fails? "\n$fails FAILED\n" : "\nALL PASSED\n";
