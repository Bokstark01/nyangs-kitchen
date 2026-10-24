<?php
// 이웃과 함께 API 점검
$B='http://127.0.0.1:8099'; $fails=0;
function req($m,$u,$data=null,$tok=null){ $ch=curl_init($u); $hd=['Content-Type: application/json','Origin: https://localhost']; if($tok)$hd[]="X-NK-Token: $tok";
 curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>1,CURLOPT_CUSTOMREQUEST=>$m,CURLOPT_HTTPHEADER=>$hd]);
 if($data!==null) curl_setopt($ch,CURLOPT_POSTFIELDS,json_encode($data)); $r=curl_exec($ch);
 return ['s'=>curl_getinfo($ch,CURLINFO_RESPONSE_CODE),'raw'=>$r,'j'=>json_decode($r,true),'ct'=>curl_getinfo($ch,CURLINFO_CONTENT_TYPE)]; }
function ok($name,$cond,$extra=''){ global $fails; echo ($cond?'PASS ':'FAIL ').$name.($cond?'':"  $extra")."\n"; if(!$cond)$fails++; }
function user($email,$nick){ global $B; $r=req('POST',"$B/api.php?action=signup",['email'=>$email,'password'=>'abcd1234','nickname'=>$nick]); return [$r['j']['token'],$r['j']['user']['id']]; }
[$ta,$ia]=user('owner@ex.com','주인'); [$tb,$ib]=user('helper@ex.com','이웃'); [$tc,$ic]=user('other@ex.com','남');

// 작은 JPEG 하나 만들기
$im=imagecreatetruecolor(64,48); imagefill($im,0,0,imagecolorallocate($im,200,150,90)); ob_start(); imagejpeg($im,null,70); $jpg=base64_encode(ob_get_clean());

$r=req('GET',"$B/share.php?action=list"); ok('list needs login',$r['s']==401);
$pt=['nid'=>'p1','name'=>'공원 벤치','lat'=>37.5,'lng'=>127.0,'memo'=>'뒤쪽','times'=>['19:00','07:00','25:00'],'cats'=>[['id'=>'c1','name'=>'치즈','photo'=>$jpg],['id'=>'c2','name'=>'고등어']]];
$r=req('POST',"$B/share.php?action=upsert",$pt,$ta); ok('upsert share',$r['s']==200&&$r['j']['share']['owner']===true, $r['raw']);
$sid=$r['j']['share']['id']; $photo=$r['j']['share']['cats'][0]['photo'];
ok('times cleaned + sorted',$r['j']['share']['times']===['07:00','19:00'], json_encode($r['j']['share']['times']));
ok('photo saved',preg_match('/^[a-f0-9]{32}\.jpg$/',(string)$photo)===1 && is_file(getenv('STORAGE')."/shares/$sid/$photo"));
$bad=$pt; $bad['cats']=[['id'=>'c1','name'=>'x','photo'=>base64_encode('<?php echo 1; ?>'.str_repeat('a',200))]];
$r=req('POST',"$B/share.php?action=upsert",$bad,$ta); ok('non-jpeg photo ignored',$r['s']==200&&$r['j']['share']['cats'][0]['photo']===null);
$r=req('POST',"$B/share.php?action=upsert",array_merge($pt,['cats'=>[['id'=>'c1','name'=>'치즈','keep'=>true]]]),$ta);
ok('re-upsert same nid keeps id',$r['j']['share']['id']===$sid);
ok('old non-jpeg cleared, keep restores nothing',$r['j']['share']['cats'][0]['photo']===null);
$r=req('POST',"$B/share.php?action=upsert",$pt,$ta); $photo=$r['j']['share']['cats'][0]['photo'];
$r=req('POST',"$B/share.php?action=upsert",array_merge($pt,['cats'=>[['id'=>'c1','name'=>'치즈','keep'=>true]]]),$ta);
ok('keep keeps existing photo',$r['j']['share']['cats'][0]['photo']===$photo);
// 건강·중성화 기록
$hc=['id'=>'c1','name'=>'치즈','keep'=>true,'sex'=>'f','neuter'=>'yes','health'=>[['d'=>'2026-10-20','k'=>'vet','t'=>'눈 염증 진료'],['d'=>'bad','k'=>'vet','t'=>'x'],['d'=>'2026-10-21','k'=>'evil','t'=>'x'],['d'=>'2026-10-22','k'=>'med','t'=>'']]];
$r=req('POST',"$B/share.php?action=upsert",array_merge($pt,['cats'=>[$hc,['id'=>'c2','name'=>'고등어','sex'=>'x','neuter'=>'maybe']]]),$ta);
$c0=$r['j']['share']['cats'][0]; $c1=$r['j']['share']['cats'][1];
ok('health saved, bad rows dropped',$c0['sex']==='f'&&$c0['neuter']==='yes'&&count($c0['health'])===1&&$c0['health'][0]['t']==='눈 염증 진료'&&$c0['photo']===$photo, json_encode($c0,JSON_UNESCAPED_UNICODE));
ok('invalid sex/neuter ignored',!isset($c1['sex'])&&!isset($c1['neuter'])&&!isset($c1['health']));

$r=req('GET',"$B/share.php?action=photo&share_id=$sid&f=$photo",null,$tb); ok('stranger cannot see photo',$r['s']==403);
$r=req('POST',"$B/share.php?action=invite",['share_id'=>$sid],$tb); ok('stranger cannot invite',$r['s']==403);
$r=req('POST',"$B/share.php?action=invite",['share_id'=>$sid],$ta); $code=$r['j']['code']??''; ok('invite code',preg_match('/^[A-HJ-NP-Z2-9]{6}$/',$code)===1,$r['raw']);
$r=req('POST',"$B/share.php?action=invite",['share_id'=>$sid],$ta); ok('same code reused',($r['j']['code']??'')===$code);
$r=req('POST',"$B/share.php?action=join",['code'=>'ZZZZZZ'],$tb); ok('wrong code 404',$r['s']==404);
$r=req('POST',"$B/share.php?action=join",['code'=>$code],$ta); ok('owner cannot join own',$r['s']==409);
$r=req('POST',"$B/share.php?action=join",['code'=>strtolower(substr($code,0,3)).'-'.substr($code,3)],$tb); ok('join (case/dash tolerant)',$r['s']==200&&$r['j']['share']['owner']===false,$r['raw']);
ok('member sees no member list',$r['j']['share']['members']===null);
$r=req('GET',"$B/share.php?action=photo&share_id=$sid&f=$photo",null,$tb); ok('member sees photo',$r['s']==200&&$r['ct']==='image/jpeg');
$r=req('GET',"$B/share.php?action=photo&share_id=$sid&f=../../config.php",null,$tb); ok('photo path traversal blocked',$r['s']==404);
$r=req('POST',"$B/share.php?action=join",['code'=>$code],$tc);
$r=req('GET',"$B/share.php?action=list",null,$ta); ok('owner sees 2 members',count($r['j']['owned'][0]['members'])===2);

$today=date('Y-m-d'); $later=date('Y-m-d',time()+3*86400);
$r=req('POST',"$B/share.php?action=request",['share_id'=>$sid,'helper_id'=>$ib,'start'=>$later,'end'=>$today],$ta); ok('end before start rejected',$r['s']==400);
$r=req('POST',"$B/share.php?action=request",['share_id'=>$sid,'helper_id'=>$ib,'start'=>$today,'end'=>$later,'note'=>'출장 가요'],$ta); ok('request to helper',$r['s']==200,$r['raw']);
$r=req('POST',"$B/share.php?action=request",['share_id'=>$sid,'start'=>$today,'end'=>$today],$tb); ok('member cannot create request',$r['s']==403);
$r=req('GET',"$B/share.php?action=list",null,$tb); ok('helper sees pending 1',$r['j']['pending']===1); $rid=$r['j']['joined'][0]['requests'][0]['id'];
$r=req('GET',"$B/share.php?action=list",null,$tc); ok('other member does not see request to helper',count($r['j']['joined'][0]['requests'])===0);
$r=req('POST',"$B/share.php?action=respond",['id'=>$rid,'accept'=>true],$tc); ok('other cannot accept',$r['s']==403);
$r=req('POST',"$B/share.php?action=respond",['id'=>$rid,'accept'=>true],$tb); ok('helper accepts',$r['s']==200);
$r=req('GET',"$B/share.php?action=list",null,$ta); ok('owner sees accepted by 이웃',$r['j']['owned'][0]['requests'][0]['status']==='accepted'&&$r['j']['owned'][0]['requests'][0]['helper']==='이웃');
$r=req('POST',"$B/share.php?action=fed",['share_id'=>$sid,'note'=>'다 먹었어요'],$tb); ok('helper logs feeding',$r['s']==200);
$r=req('GET',"$B/share.php?action=list",null,$ta); ok('owner sees feed log',($r['j']['owned'][0]['logs'][0]['by']??'')==='이웃');
// 누구에게나 부탁
$r=req('POST',"$B/share.php?action=request",['share_id'=>$sid,'start'=>$today,'end'=>$today],$ta);
$r=req('GET',"$B/share.php?action=list",null,$tc); ok('open request visible to all members',$r['j']['pending']===1);
$rid2=0; foreach($r['j']['joined'][0]['requests'] as $q) if($q['status']==='pending') $rid2=$q['id'];
$r=req('POST',"$B/share.php?action=respond",['id'=>$rid2,'accept'=>true],$tc); ok('first member takes open request',$r['s']==200);
$r=req('POST',"$B/share.php?action=respond",['id'=>$rid2,'accept'=>true],$tb); ok('second cannot take it',$r['s']==409||$r['s']==403);

$r=req('POST',"$B/share.php?action=kick",['share_id'=>$sid,'user_id'=>$ic],$ta); ok('owner kicks',$r['s']==200);
$r=req('GET',"$B/share.php?action=list",null,$tc); ok('kicked user sees nothing',count($r['j']['joined'])===0);

// 회원탈퇴하면 공유가 모두 지워짐
$r=req('POST',"$B/api.php?action=delete",[],$ta); ok('owner deletes account',$r['s']==200);
$r=req('GET',"$B/share.php?action=list",null,$tb); ok('share gone for member',count($r['j']['joined'])===0);
ok('photos removed',!is_dir(getenv('STORAGE')."/shares/$sid"));
echo $fails? "\n$fails FAILED\n" : "\nALL PASSED\n";
