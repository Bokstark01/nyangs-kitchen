<?php
$B='http://127.0.0.1:8099'; $fails=0;
function req($m,$u,$data=null,$h=[]){ $ch=curl_init($u); $hd=array_merge(['Content-Type: application/json','Origin: https://localhost'],$h);
 curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>1,CURLOPT_CUSTOMREQUEST=>$m,CURLOPT_HTTPHEADER=>$hd,CURLOPT_HEADER=>1]);
 if($data!==null) curl_setopt($ch,CURLOPT_POSTFIELDS,json_encode($data)); $r=curl_exec($ch); $hs=curl_getinfo($ch,CURLINFO_HEADER_SIZE);
 return ['s'=>curl_getinfo($ch,CURLINFO_RESPONSE_CODE),'h'=>substr($r,0,$hs),'j'=>json_decode(substr($r,$hs),true)]; }
function ok($name,$cond,$extra=''){ global $fails; echo ($cond?'PASS ':'FAIL ').$name.($cond?'':"  $extra")."\n"; if(!$cond)$fails++; }
$r=req('GET',"$B/api.php?action=health"); ok('health',$r['s']==200&&$r['j']['ok']===true, json_encode($r['j']));
$r=req('OPTIONS',"$B/api.php?action=login"); ok('preflight 204 + CORS',$r['s']==204 && stripos($r['h'],'Access-Control-Allow-Origin: https://localhost')!==false);
$r=req('POST',"$B/api.php?action=signup",['email'=>'cat@ex.com','password'=>'short','nickname'=>'집사']); ok('weak password rejected',$r['s']==400&&$r['j']['error']==='weak_password');
$r=req('POST',"$B/api.php?action=signup",['email'=>'Cat@Ex.com','password'=>'abcd1234','nickname'=>'골목집사입니다아주긴닉네임은스무자에서잘려야해요']); ok('signup 201',$r['s']==201&&strlen($r['j']['token'])==64, json_encode($r['j']));
ok('nickname cut to 20 chars', mb_strlen($r['j']['user']['nickname'])==20, $r['j']['user']['nickname']);
$t1=$r['j']['token'];
$r=req('POST',"$B/api.php?action=signup",['email'=>'cat@ex.com','password'=>'abcd1234','nickname'=>'x']); ok('duplicate email 409',$r['s']==409&&$r['j']['error']==='email_taken');
$r=req('POST',"$B/api.php?action=login",['email'=>'cat@ex.com','password'=>'wrong123']); ok('wrong password 401',$r['s']==401);
$r=req('POST',"$B/api.php?action=login",['email'=>'CAT@ex.com','password'=>'abcd1234']); ok('login 200',$r['s']==200&&$r['j']['user']['provider']==='email'); $t2=$r['j']['token'];
$r=req('GET',"$B/api.php?action=me",null,["X-NK-Token: $t2"]); ok('me via X-NK-Token',$r['s']==200&&$r['j']['user']['email']==='cat@ex.com');
$r=req('GET',"$B/api.php?action=me",null,["Authorization: Bearer $t1"]); ok('me via Bearer',$r['s']==200);
$r=req('GET',"$B/api.php?action=me"); ok('me without token 401',$r['s']==401);
$r=req('POST',"$B/api.php?action=logout",[], ["X-NK-Token: $t2"]); $r=req('GET',"$B/api.php?action=me",null,["X-NK-Token: $t2"]); ok('logout invalidates token',$r['s']==401);
// social: kakao start redirects with state
$ch=curl_init("$B/kakao.php"); curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>1,CURLOPT_HEADER=>1]); $raw=curl_exec($ch);
ok('kakao start -> kauth.kakao.com', preg_match('#Location: https://kauth\.kakao\.com/oauth/authorize\?[^\r\n]*state=([a-f0-9]{64})#',$raw,$m)===1);
$ch=curl_init("$B/kakao.php?code=abc&state=".str_repeat('0',64)); curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>1,CURLOPT_HEADER=>1]); $raw=curl_exec($ch);
ok('kakao bad state -> app error', strpos($raw,'Location: com.nyangskitchen.app://auth?error=bad_state')!==false);
$ch=curl_init("$B/google.php"); curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>1,CURLOPT_HEADER=>1]); $raw=curl_exec($ch);
ok('google not configured -> app error', strpos($raw,'error=google_not_configured')!==false);
// exchange: simulate a finished social login
$db=new PDO(getenv('DBDSN')); $db->exec("INSERT INTO nk_users(provider,provider_id,email,password_hash,nickname,created_at,last_login_at) VALUES('kakao','12345',NULL,NULL,'카카오집사',".time().",".time().")");
$uid=$db->lastInsertId(); $code=bin2hex(random_bytes(32)); $db->prepare('INSERT INTO nk_codes VALUES(?,?,?)')->execute([hash('sha256',$code),$uid,time()+300]);
$r=req('POST',"$B/api.php?action=exchange",['code'=>$code]); ok('exchange code -> token',$r['s']==200&&$r['j']['user']['provider']==='kakao'); $t3=$r['j']['token'];
$r=req('POST',"$B/api.php?action=exchange",['code'=>$code]); ok('code is single use',$r['s']==401);
$r=req('POST',"$B/api.php?action=delete",[], ["X-NK-Token: $t3"]); ok('delete account',$r['s']==200);
$r=req('GET',"$B/api.php?action=me",null,["X-NK-Token: $t3"]); ok('deleted user token dead',$r['s']==401);
ok('user row gone', (int)$db->query("SELECT COUNT(*) FROM nk_users WHERE id=$uid")->fetchColumn()===0);
echo $fails? "\n$fails FAILED\n" : "\nALL PASSED\n";
