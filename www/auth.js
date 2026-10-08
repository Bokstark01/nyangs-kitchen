/* 냥's 키친 로그인: 이메일 회원가입 · 카카오 · 구글 (Supabase Auth) */
(function () {
'use strict';

const CFG = window.NK_CONFIG || {};
const Cap = window.Capacitor;
const isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
const P = (Cap && Cap.Plugins) || {};
const APP_REDIRECT = 'com.nyangskitchen.app://auth';
const REDIRECT = isNative ? APP_REDIRECT : location.href.split('#')[0].split('?')[0];
const PRIVACY_URL = 'https://bokstark01.github.io/nyangs-kitchen/privacy.html';
const configured = !!(CFG.supabaseUrl && CFG.supabaseKey && window.supabase && window.supabase.createClient);

const sb = configured ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, {
  auth: { flowType: 'pkce', detectSessionInUrl: false, persistSession: true, autoRefreshToken: true, storage: window.localStorage }
}) : null;

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const el = document.getElementById('auth');

let user = null;
let view = 'start';        // start | email | check | forgot | newpw | setup
let mode = 'login';        // login | signup (email view)
let busy = false;
let notice = '';           // 안내 문구
let noticeKind = 'info';   // info | error
let lastEmail = '';
let recovering = false;
let entered = false;
let resolveReady;
const ready = new Promise(r => { resolveReady = r; });
const listeners = [];

/* ---------- 사용자 정보 ---------- */
function displayName(u) {
  if (!u) return '';
  const m = u.user_metadata || {};
  return m.nickname || m.name || m.full_name || m.user_name || m.preferred_username || (u.email || '').split('@')[0] || '집사';
}
function providerOf(u) { return (u && u.app_metadata && u.app_metadata.provider) || 'email'; }
const PROVIDER_LABEL = { email: '이메일', kakao: '카카오', google: '구글' };

/* ---------- 오류 문구 ---------- */
function friendly(err) {
  const m = String((err && (err.message || err.error_description || err)) || '');
  if (/Invalid login credentials/i.test(m)) return '이메일이나 비밀번호가 맞지 않아요.';
  if (/Email not confirmed/i.test(m)) return '메일함에서 가입 인증 링크를 먼저 눌러주세요.';
  if (/already registered|already been registered|User already exists/i.test(m)) return '이미 가입된 이메일이에요. 로그인해 주세요.';
  if (/Password should be at least|weak password/i.test(m)) return '비밀번호는 8자 이상, 영문과 숫자를 섞어 주세요.';
  if (/rate limit|too many/i.test(m)) return '요청이 너무 많아요. 잠시 뒤에 다시 해주세요.';
  if (/network|Failed to fetch/i.test(m)) return '인터넷 연결을 확인해 주세요.';
  if (/provider is not enabled|Unsupported provider/i.test(m)) return '이 로그인 방식이 아직 서버에서 켜지지 않았어요.';
  if (/access_denied|cancel/i.test(m)) return '로그인을 취소했어요.';
  return m ? `문제가 생겼어요: ${m}` : '문제가 생겼어요. 다시 시도해 주세요.';
}
function say(msg, kind) { notice = msg || ''; noticeKind = kind || 'info'; render(); }

/* ---------- 화면 ---------- */
const catSvg = () => {
  const s = document.querySelector('#intro svg');
  return s ? s.outerHTML.replace('class="intro-art"', 'class="auth-art"') : '';
};
let CAT = '';

const KAKAO_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#000" d="M12 3.2C6.5 3.2 2 6.7 2 11c0 2.8 1.9 5.2 4.7 6.6l-1 3.7c-.1.4.3.7.6.5l4.4-2.9c.4 0 .9.1 1.3.1 5.5 0 10-3.5 10-7.9S17.5 3.2 12 3.2z"/></svg>';
const GOOGLE_ICON = '<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
const MAIL_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>';
const BACK_ICON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';

function noticeHtml() {
  return notice ? `<p class="auth-notice ${noticeKind === 'error' ? 'err' : ''}" role="${noticeKind === 'error' ? 'alert' : 'status'}">${esc(notice)}</p>` : '';
}
function backRow(title) {
  return `<div class="auth-top"><button class="auth-back" data-auth="back" aria-label="뒤로">${BACK_ICON}</button><h2>${esc(title)}</h2></div>`;
}

function cardHtml() {
  if (view === 'setup') {
    return `<button class="sbtn kakao" data-auth="notReady">${KAKAO_ICON}<span>카카오로 시작하기</span></button>
      <button class="sbtn google" data-auth="notReady">${GOOGLE_ICON}<span>Google로 계속하기</span></button>
      <button class="sbtn email" data-auth="notReady">${MAIL_ICON}<span>이메일로 시작하기</span></button>
      ${noticeHtml()}
      <button class="auth-link" data-auth="browse">로그인 없이 둘러보기 (테스트 버전)</button>`;
  }
  if (view === 'start') {
    return `<button class="sbtn kakao" data-auth="kakao" ${busy ? 'disabled' : ''}>${KAKAO_ICON}<span>카카오로 시작하기</span></button>
      <button class="sbtn google" data-auth="google" ${busy ? 'disabled' : ''}>${GOOGLE_ICON}<span>Google로 계속하기</span></button>
      <button class="sbtn email" data-auth="toEmail" ${busy ? 'disabled' : ''}>${MAIL_ICON}<span>이메일로 시작하기</span></button>
      ${noticeHtml()}
      <p class="auth-fine">시작하면 <a href="${PRIVACY_URL}" target="_blank" rel="noopener">개인정보처리방침</a>에 동의하는 것으로 봐요.</p>`;
  }
  if (view === 'email') {
    const signup = mode === 'signup';
    return `${backRow(signup ? '이메일로 회원가입' : '이메일로 로그인')}
      <div class="auth-seg" role="group" aria-label="로그인 또는 회원가입">
        <button data-auth="mode" data-v="login" aria-pressed="${!signup}">로그인</button>
        <button data-auth="mode" data-v="signup" aria-pressed="${signup}">회원가입</button>
      </div>
      <form id="authForm" class="auth-form" novalidate>
        ${signup ? `<div class="field"><label for="aNick">닉네임</label><input id="aNick" maxlength="12" autocomplete="nickname" placeholder="예: 골목집사"></div>` : ''}
        <div class="field"><label for="aEmail">이메일</label><input id="aEmail" type="email" inputmode="email" autocomplete="email" autocapitalize="off" value="${esc(lastEmail)}" placeholder="name@example.com"></div>
        <div class="field"><label for="aPw">비밀번호</label><input id="aPw" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" placeholder="${signup ? '8자 이상, 영문과 숫자' : '비밀번호'}"></div>
        ${signup ? `<div class="field"><label for="aPw2">비밀번호 확인</label><input id="aPw2" type="password" autocomplete="new-password"></div>
        <label class="auth-check"><input type="checkbox" id="aAgree"><span><a href="${PRIVACY_URL}" target="_blank" rel="noopener">개인정보처리방침</a>을 읽었고 동의해요 (필수)</span></label>` : ''}
        ${noticeHtml()}
        <button class="btn primary" type="submit" ${busy ? 'disabled' : ''}>${busy ? '잠시만요…' : (signup ? '가입하기' : '로그인')}</button>
      </form>
      ${signup ? '' : `<button class="auth-link" data-auth="toForgot">비밀번호를 잊었어요</button>`}`;
  }
  if (view === 'check') {
    return `${backRow('메일함을 확인해 주세요')}
      <p class="auth-p"><b>${esc(lastEmail)}</b>로 가입 인증 메일을 보냈어요. 메일의 링크를 이 휴대폰에서 누르면 바로 로그인돼요.</p>
      ${noticeHtml()}
      <button class="btn" data-auth="resend" ${busy ? 'disabled' : ''}>인증 메일 다시 보내기</button>
      <button class="btn primary" data-auth="toLogin">로그인 화면으로</button>`;
  }
  if (view === 'forgot') {
    return `${backRow('비밀번호 찾기')}
      <p class="auth-p">가입한 이메일로 비밀번호를 새로 정하는 링크를 보내드려요.</p>
      <form id="forgotForm" class="auth-form" novalidate>
        <div class="field"><label for="fEmail">이메일</label><input id="fEmail" type="email" inputmode="email" autocomplete="email" autocapitalize="off" value="${esc(lastEmail)}"></div>
        ${noticeHtml()}
        <button class="btn primary" type="submit" ${busy ? 'disabled' : ''}>링크 보내기</button>
      </form>`;
  }
  if (view === 'newpw') {
    return `<h2 class="auth-h">새 비밀번호 정하기</h2>
      <form id="newpwForm" class="auth-form" novalidate>
        <div class="field"><label for="nPw">새 비밀번호</label><input id="nPw" type="password" autocomplete="new-password" placeholder="8자 이상, 영문과 숫자"></div>
        <div class="field"><label for="nPw2">새 비밀번호 확인</label><input id="nPw2" type="password" autocomplete="new-password"></div>
        ${noticeHtml()}
        <button class="btn primary" type="submit" ${busy ? 'disabled' : ''}>저장하고 시작하기</button>
      </form>`;
  }
  return '';
}

function render() {
  if (!el || el.hidden) return;
  if (!CAT) CAT = catSvg();
  const compact = view !== 'start' && view !== 'setup';
  el.innerHTML = `<div class="auth-hero ${compact ? 'compact' : ''}">${CAT}<h1 class="auth-title">냥's 키친</h1>${compact ? '' : '<p class="auth-sub">우리 동네 길고양이 밥 지도</p>'}</div>
    <div class="auth-card">${cardHtml()}</div>`;
  bindForms();
}
function show() { if (!el) return; el.hidden = false; el.classList.remove('hide'); render(); }
function hide() { if (!el) return; el.classList.add('hide'); setTimeout(() => { el.hidden = true; el.innerHTML = ''; }, 320); }

function enter() {
  if (recovering) { view = 'newpw'; show(); return; }
  notice = '';
  hide();
  if (!entered) { entered = true; resolveReady(user); }
  listeners.forEach(f => { try { f(user); } catch (e) {} });
}

/* ---------- 동작 ---------- */
const validEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const validPw = v => v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v);

async function oauth(provider) {
  if (!sb) return;
  busy = true; say('');
  try {
    const opts = { redirectTo: REDIRECT, skipBrowserRedirect: true };
    if (provider === 'google') opts.queryParams = { prompt: 'select_account' };
    const { data, error } = await sb.auth.signInWithOAuth({ provider, options: opts });
    if (error) throw error;
    if (isNative && P.Browser) await P.Browser.open({ url: data.url, presentationStyle: 'popover' });
    else location.href = data.url;
  } catch (e) { say(friendly(e), 'error'); }
  busy = false; render();
}

async function handleRedirect(url) {
  if (!sb || !url) return;
  if (isNative && !url.startsWith(APP_REDIRECT)) return;
  let u;
  try { u = new URL(url); } catch (e) { return; }
  const q = u.searchParams;
  const h = new URLSearchParams((u.hash || '').replace(/^#/, ''));
  const err = q.get('error_description') || h.get('error_description') || q.get('error') || h.get('error');
  const code = q.get('code');
  const isRecovery = q.get('type') === 'recovery' || h.get('type') === 'recovery';
  if (isNative && P.Browser) { try { await P.Browser.close(); } catch (e) {} }
  if (!isNative && (code || err)) history.replaceState(null, '', REDIRECT);
  if (err) { view = view === 'email' ? 'email' : 'start'; say(friendly(err.replace(/\+/g, ' ')), 'error'); return; }
  if (!code) return;
  busy = true; render();
  if (isRecovery) recovering = true;
  const { error } = await sb.auth.exchangeCodeForSession(code);
  busy = false;
  if (error) { recovering = false; view = 'start'; show(); say(friendly(error), 'error'); return; }
  if (recovering) { view = 'newpw'; show(); }
}

async function submitEmail(e) {
  e.preventDefault();
  const signup = mode === 'signup';
  const email = (document.getElementById('aEmail').value || '').trim();
  const pw = document.getElementById('aPw').value || '';
  lastEmail = email;
  if (!validEmail(email)) return say('이메일 주소를 확인해 주세요.', 'error');
  if (signup) {
    const nick = (document.getElementById('aNick').value || '').trim();
    const pw2 = document.getElementById('aPw2').value || '';
    if (!nick) return say('닉네임을 적어주세요.', 'error');
    if (!validPw(pw)) return say('비밀번호는 8자 이상, 영문과 숫자를 섞어 주세요.', 'error');
    if (pw !== pw2) return say('비밀번호 확인이 달라요.', 'error');
    if (!document.getElementById('aAgree').checked) return say('개인정보처리방침에 동의해 주세요.', 'error');
    busy = true; say('');
    const { data, error } = await sb.auth.signUp({ email, password: pw, options: { emailRedirectTo: REDIRECT, data: { nickname: nick } } });
    busy = false;
    if (error) return say(friendly(error), 'error');
    if (data && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return say('이미 가입된 이메일이에요. 로그인해 주세요.', 'error');
    if (data && data.session) return; // 메일 인증을 끈 서버: 바로 로그인됨
    view = 'check'; say('');
    return;
  }
  if (!pw) return say('비밀번호를 적어주세요.', 'error');
  busy = true; say('');
  const { error } = await sb.auth.signInWithPassword({ email, password: pw });
  busy = false;
  if (error) say(friendly(error), 'error'); else render();
}

async function submitForgot(e) {
  e.preventDefault();
  const email = (document.getElementById('fEmail').value || '').trim();
  lastEmail = email;
  if (!validEmail(email)) return say('이메일 주소를 확인해 주세요.', 'error');
  busy = true; say('');
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${REDIRECT}?type=recovery` });
  busy = false;
  if (error) say(friendly(error), 'error'); else say('메일을 보냈어요. 메일의 링크를 이 휴대폰에서 눌러주세요.');
}

async function submitNewPw(e) {
  e.preventDefault();
  const pw = document.getElementById('nPw').value || '', pw2 = document.getElementById('nPw2').value || '';
  if (!validPw(pw)) return say('비밀번호는 8자 이상, 영문과 숫자를 섞어 주세요.', 'error');
  if (pw !== pw2) return say('비밀번호 확인이 달라요.', 'error');
  busy = true; say('');
  const { error } = await sb.auth.updateUser({ password: pw });
  busy = false;
  if (error) return say(friendly(error), 'error');
  recovering = false;
  enter();
}

async function resend() {
  busy = true; say('');
  const { error } = await sb.auth.resend({ type: 'signup', email: lastEmail, options: { emailRedirectTo: REDIRECT } });
  busy = false;
  if (error) say(friendly(error), 'error'); else say('인증 메일을 다시 보냈어요.');
}

function bindForms() {
  const f1 = document.getElementById('authForm'); if (f1) f1.addEventListener('submit', submitEmail);
  const f2 = document.getElementById('forgotForm'); if (f2) f2.addEventListener('submit', submitForgot);
  const f3 = document.getElementById('newpwForm'); if (f3) f3.addEventListener('submit', submitNewPw);
}

const ACT = {
  kakao: () => oauth('kakao'),
  google: () => oauth('google'),
  toEmail: () => { view = 'email'; mode = 'login'; say(''); },
  toLogin: () => { view = 'email'; mode = 'login'; say(''); },
  toForgot: () => { const i = document.getElementById('aEmail'); if (i) lastEmail = i.value.trim(); view = 'forgot'; say(''); },
  mode: v => { const i = document.getElementById('aEmail'); if (i) lastEmail = i.value.trim(); mode = v; say(''); },
  back: () => handleBack(),
  notReady: () => say('로그인 서버를 연결하는 중이에요. 지금은 둘러보기로 써주세요.'),
  browse: () => { entered = true; hide(); resolveReady(null); },
  resend: () => resend()
};
if (el) el.addEventListener('click', e => {
  const b = e.target.closest('[data-auth]'); if (!b || busy) return;
  const f = ACT[b.dataset.auth]; if (f) { e.preventDefault(); f(b.dataset.v); }
});

function handleBack() {
  if (!el || el.hidden) return false;
  if (view === 'email' || view === 'check') { view = 'start'; say(''); return true; }
  if (view === 'forgot') { view = 'email'; mode = 'login'; say(''); return true; }
  return false;
}

/* ---------- 시작 ---------- */
async function init() {
  if (!el) return;
  if (!configured) { view = 'setup'; show(); return; }
  sb.auth.onAuthStateChange((event, session) => {
    user = session ? session.user : null;
    if (event === 'PASSWORD_RECOVERY') { recovering = true; view = 'newpw'; show(); return; }
    if (user) { setTimeout(enter, 0); }
    else if (event === 'SIGNED_OUT') { view = 'start'; notice = ''; show(); listeners.forEach(f => { try { f(null); } catch (e) {} }); }
  });
  const { data } = await sb.auth.getSession();
  user = data && data.session ? data.session.user : null;
  if (!user) show();
  if (isNative && P.App) {
    P.App.addListener('appUrlOpen', ev => handleRedirect(ev && ev.url));
    try { const l = await P.App.getLaunchUrl(); if (l && l.url) handleRedirect(l.url); } catch (e) {}
  } else if (/[?&#](code|error)=/.test(location.href)) {
    handleRedirect(location.href);
  }
}

window.NK_AUTH = {
  configured,
  ready,
  user: () => user,
  name: () => displayName(user),
  email: () => (user && user.email) || '',
  provider: () => PROVIDER_LABEL[providerOf(user)] || providerOf(user),
  onChange: f => listeners.push(f),
  handleBack,
  async signOut() { if (sb) await sb.auth.signOut(); },
  async deleteAccount() {
    if (!sb || !user) return { error: '로그인 상태가 아니에요.' };
    const { error } = await sb.rpc('delete_user');
    if (error) return { error: friendly(error) };
    await sb.auth.signOut();
    return { error: null };
  }
};

init();
})();
