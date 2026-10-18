<?php
// 이웃 게시판 API 점검
$B='http://127.0.0.1:8099'; $fails=0;
(new PDO(getenv('DBDSN')))->exec('DELETE FROM nk_attempts');   // 앞 테스트의 가입 횟수 제한 비우기
function req($m,$u,$data=null,$tok=null){ $ch=curl_init($u); $hd=['Content-Type: application/json','Origin: https://localhost']; if($tok)$hd[]="X-NK-Token: $tok";
 curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>1,CURLOPT_CUSTOMREQUEST=>$m,CURLOPT_HTTPHEADER=>$hd]);
 if($data!==null) curl_setopt($ch,CURLOPT_POSTFIELDS,json_encode($data)); $r=curl_exec($ch);
 return ['s'=>curl_getinfo($ch,CURLINFO_RESPONSE_CODE),'raw'=>$r,'j'=>json_decode($r,true),'ct'=>curl_getinfo($ch,CURLINFO_CONTENT_TYPE)]; }
$jar=tempnam(sys_get_temp_dir(),'nkb');
function adm($path,$post=null){ global $B,$jar; $ch=curl_init("$B/$path"); curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>1,CURLOPT_COOKIEJAR=>$jar,CURLOPT_COOKIEFILE=>$jar,CURLOPT_FOLLOWLOCATION=>0]);
 if($post!==null){ curl_setopt($ch,CURLOPT_POST,1); curl_setopt($ch,CURLOPT_POSTFIELDS,http_build_query($post)); } $r=curl_exec($ch); return ['s'=>curl_getinfo($ch,CURLINFO_RESPONSE_CODE),'raw'=>$r]; }
function csrf_of($html){ return preg_match('/name="csrf" value="([a-f0-9]{64})"/',$html,$m)?$m[1]:''; }
function ok($name,$cond,$extra=''){ global $fails; echo ($cond?'PASS ':'FAIL ').$name.($cond?'':"  $extra")."\n"; if(!$cond)$fails++; }
function user($email,$nick){ global $B; $r=req('POST',"$B/api.php?action=signup",['email'=>$email,'password'=>'abcd1234','nickname'=>$nick]); return [$r['j']['token'],$r['j']['user']['id']]; }
[$ta,$ia]=user('b1@ex.com','글쓴이'); [$tb,$ib]=user('b2@ex.com','이웃1'); [$tc,$ic]=user('b3@ex.com','이웃2'); [$td,$id_]=user('b4@ex.com','이웃3');

$im=imagecreatetruecolor(1400,1000); imagefill($im,0,0,imagecolorallocate($im,90,150,200)); ob_start(); imagejpeg($im,null,60); $big=base64_encode(ob_get_clean());
$im=imagecreatetruecolor(800,600); imagefill($im,0,0,imagecolorallocate($im,200,150,90)); ob_start(); imagejpeg($im,null,70); $jpg='data:image/jpeg;base64,'.base64_encode(ob_get_clean());

$r=req('GET',"$B/board.php?action=list"); ok('list needs login',$r['s']==401);
$r=req('POST',"$B/board.php?action=write",['cat'=>'report','body'=>''],$ta); ok('empty post rejected',$r['s']==400);
$r=req('POST',"$B/board.php?action=write",['cat'=>'report','body'=>'망원시장 뒤에서 다친 치즈냥 봤어요','photos'=>[$jpg,$big,'not-a-photo'],'lat'=>37.556123,'lng'=>126.901987],$ta);
ok('write with photos',$r['s']==201 && $r['j']['photos']===2, $r['raw']); $p1=$r['j']['id'];
ok('area from location',$r['j']['area']==='마포구 망원1동');
$r=req('POST',"$B/board.php?action=write",['cat'=>'weird','body'=>'위치 없는 글'],$tb); ok('write without location, bad cat → free',$r['s']==201); $p2=$r['j']['id'];
$r=req('POST',"$B/board.php?action=write",['cat'=>'info','body'=>'먼 동네 글','lat'=>35.1,'lng'=>129.0],$tc); $p3=$r['j']['id'];

$r=req('GET',"$B/board.php?action=list",null,$tb); ok('list all',$r['s']==200 && count($r['j']['posts'])===3, $r['raw']);
$first=$r['j']['posts'][0]; ok('newest first',$first['id']===$p3);
ok('no coordinates leaked',!array_key_exists('lat',$first) && strpos($r['raw'],'37.556')===false);
$r=req('GET',"$B/board.php?action=list&near=1&lat=37.56&lng=126.91",null,$tb);
ok('near filter (5km)',count($r['j']['posts'])===1 && $r['j']['posts'][0]['id']===$p1 && $r['j']['posts'][0]['dist']==='1km 안', $r['raw']);
$r=req('GET',"$B/board.php?action=list&near=1",null,$tb); ok('near needs location',$r['s']==400);
$r=req('GET',"$B/board.php?action=list&cat=free",null,$tb); ok('category filter',count($r['j']['posts'])===1 && $r['j']['posts'][0]['cat']==='free');

$r=req('GET',"$B/board.php?action=post&id=$p1",null,$tb); $ph=$r['j']['post']['photos'];
ok('post detail',$r['s']==200 && $r['j']['post']['author']==='글쓴이' && count($ph)===2);
ok('big photo kept within limits', is_file(getenv('STORAGE')."/board/$p1/{$ph[1]}"));
$r=req('GET',"$B/board.php?action=photo&id=$p1&f={$ph[0]}",null,$tb); ok('photo served',$r['s']==200 && $r['ct']==='image/jpeg');
$r=req('GET',"$B/board.php?action=photo&id=$p1&f=../../config.php",null,$tb); ok('photo traversal blocked',$r['s']==404);
$r=req('GET',"$B/board.php?action=photo&id=$p2&f={$ph[0]}",null,$tb); ok('photo must belong to post',$r['s']==404);

$r=req('POST',"$B/board.php?action=comment",['post_id'=>$p1,'body'=>'어디쯤이에요? 가볼게요'],$tb); ok('comment',$r['s']==201);
$r=req('POST',"$B/board.php?action=comment",['post_id'=>$p1,'body'=>'시장 주차장 쪽이요'],$ta);
$r=req('GET',"$B/board.php?action=list",null,$ta); ok('unread comment badge for writer',$r['j']['unread']===1, $r['raw']);
$r=req('GET',"$B/board.php?action=post&id=$p1",null,$ta); ok('comments + writer mark',count($r['j']['comments'])===2 && $r['j']['comments'][1]['by_writer']===true && $r['j']['post']['comments']===2);
$r=req('GET',"$B/board.php?action=list",null,$ta); ok('badge cleared after opening',$r['j']['unread']===0);
$cid=req('GET',"$B/board.php?action=post&id=$p1",null,$tb)['j']['comments'][0]['id'];
$r=req('POST',"$B/board.php?action=delete_comment",['comment_id'=>$cid],$tc); ok('cannot delete others comment',$r['s']==403);
$r=req('POST',"$B/board.php?action=delete",['post_id'=>$p1],$tb); ok('cannot delete others post',$r['s']==403);

// 신고 3번 → 숨김
$r=req('POST',"$B/board.php?action=report",['kind'=>'post','id'=>$p1,'reason'=>'광고'],$ta); ok('cannot report own',$r['s']==400);
foreach([$tb,$tb,$tc] as $t) req('POST',"$B/board.php?action=report",['kind'=>'post','id'=>$p1,'reason'=>'욕설'],$t);
$r=req('GET',"$B/board.php?action=post&id=$p1",null,$td); ok('2 distinct reports: still visible',$r['s']==200);
req('POST',"$B/board.php?action=report",['kind'=>'post','id'=>$p1],$td);
$r=req('GET',"$B/board.php?action=post&id=$p1",null,$td); ok('3 reports: hidden from others',$r['s']==404);
$r=req('GET',"$B/board.php?action=post&id=$p1",null,$ta); ok('writer still sees own hidden post',$r['s']==200 && $r['j']['post']['hidden']===true);
$r=req('POST',"$B/board.php?action=comment",['post_id'=>$p1,'body'=>'x'],$ta); ok('no comments on hidden post',$r['s']==403);

// 운영자 확인
$c=csrf_of(adm('admin.php')['raw']); adm('admin.php',['csrf'=>$c,'pw'=>'test-admin-pass-123']);
$h=adm('admin.php?p=board')['raw']; ok('admin board lists hidden post',strpos($h,'신고 누적 숨김')!==false && strpos($h,'다친 치즈냥')!==false && strpos($h,'욕설')!==false, substr($h,0,300));
ok('admin nav badge',strpos($h,'게시판 (신고')!==false);
$r=adm("admin.php?p=boardphoto&id=$p1&f={$ph[0]}"); ok('admin sees board photo',$r['s']==200);
adm('admin.php?p=board_act',['csrf'=>csrf_of($h),'kind'=>'post','id'=>$p1,'do'=>'show']);
$r=req('GET',"$B/board.php?action=post&id=$p1",null,$td); ok('admin "문제없음" restores post',$r['s']==200);
$r=req('POST',"$B/board.php?action=report",['kind'=>'post','id'=>$p1],$tb); $r=req('GET',"$B/board.php?action=post&id=$p1",null,$td); ok('reports reset after review',$r['s']==200);
adm('admin.php?p=board_act',['csrf'=>csrf_of($h),'kind'=>'post','id'=>$p1,'do'=>'hide']);
$r=req('GET',"$B/board.php?action=post&id=$p1",null,$td); ok('admin hide',$r['s']==404);

// 차단
$r=req('POST',"$B/board.php?action=block",['user_id'=>$ib],$tc); ok('block',$r['s']==200);
$r=req('GET',"$B/board.php?action=list",null,$tc); ok('blocked author hidden in list',!in_array($p2,array_column($r['j']['posts'],'id')));
$r=req('GET',"$B/board.php?action=post&id=$p2",null,$tc); ok('blocked author post 404',$r['s']==404);
$r=req('POST',"$B/board.php?action=comment",['post_id'=>$p3,'body'=>'안녕하세요'],$tb); ok('blocked user cannot comment on blocker post',$r['s']==403);
$r=req('GET',"$B/board.php?action=blocks",null,$tc); ok('blocks list',$r['j']['blocks'][0]['nickname']==='이웃1');
req('POST',"$B/board.php?action=unblock",['user_id'=>$ib],$tc);
$r=req('GET',"$B/board.php?action=list",null,$tc); ok('unblock restores',in_array($p2,array_column($r['j']['posts'],'id')));

// 내 글 지우기 + 사진 폴더 정리
$r=req('POST',"$B/board.php?action=delete",['post_id'=>$p1],$ta); ok('delete own post',$r['s']==200 && !is_dir(getenv('STORAGE')."/board/$p1"));
// 회원탈퇴하면 글·댓글이 지워진다
req('POST',"$B/board.php?action=comment",['post_id'=>$p3,'body'=>'탈퇴 전 댓글'],$td);
$r=req("POST","$B/api.php?action=delete",["password"=>"abcd1234"],$td); ok("account delete",$r["s"]==200,$r["raw"]);
$r=req('GET',"$B/board.php?action=post&id=$p3",null,$tc); ok('withdrawn user comments removed',$r['j']['post']['comments']===0 && count($r['j']['comments'])===0, $r['raw']);

echo $fails ? "$fails FAILED\n" : "ALL PASSED\n";
