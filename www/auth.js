/* 냥's 키친 로그인: 이메일 회원가입 · 카카오 · 구글 (자체 PHP 서버: server/public/api.php) */
(function () {
'use strict';

const CFG = window.NK_CONFIG || {};
const Cap = window.Capacitor;
const isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
const P = (Cap && Cap.Plugins) || {};
const APP_REDIRECT = 'com.nyangskitchen.app://auth';
const PRIVACY_URL = 'https://bokstark01.github.io/nyangs-kitchen/privacy.html';
const API = String(CFG.apiBase || '').replace(/\/+$/, '');   // 예: https://도메인 (server/public 이 열리는 주소)
const configured = /^https:\/\//.test(API) || (!!CFG.devAllowHttp && /^http:\/\//.test(API));  // 실제 앱은 https만
const TOKEN_KEY = 'nk-auth-token', USER_KEY = 'nk-auth-user';
const SUPPORT_EMAIL = '1984bok@gmail.com';

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
let token = store.get(TOKEN_KEY);

async function api(action, data, method) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-NK-Token'] = token;
  let res;
  try {
    res = await fetch(`${API}/api.php?action=${action}`, { method: method || 'POST', headers, body: (method || 'POST') === 'GET' ? undefined : JSON.stringify(data || {}) });
  } catch (e) { return { error: 'network', message: '인터넷 연결을 확인해 주세요.', status: 0 }; }
  let j = {};
  try { j = await res.json(); } catch (e) {}
  if (!res.ok) return { error: j.error || 'http_' + res.status, message: j.message || '서버에 문제가 생겼어요. 잠시 뒤에 다시 해주세요.', status: res.status };
  return j;
}
function saveSession(t, u) { token = t; user = u; store.set(TOKEN_KEY, t); store.set(USER_KEY, JSON.stringify(u)); }
function clearSession() { token = null; user = null; store.del(TOKEN_KEY); store.del(USER_KEY); }

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const el = document.getElementById('auth');

let user = null;
let view = 'start';        // start | email | forgot | setup
let mode = 'login';        // login | signup (email view)
let busy = false;
let notice = '';           // 안내 문구
let noticeKind = 'info';   // info | error
let lastEmail = '';
let entered = false;
let resolveReady;
const ready = new Promise(r => { resolveReady = r; });
const listeners = [];

/* ---------- 사용자 정보 ---------- */
function displayName(u) { return u ? (u.nickname || (u.email || '').split('@')[0] || '집사') : ''; }
function providerOf(u) { return (u && u.provider) || 'email'; }
const PROVIDER_LABEL = { email: '이메일', kakao: '카카오', google: '구글' };

/* ---------- 오류 문구 ---------- */
function friendly(err) {
  if (err && err.message) return err.message;
  const m = String(err || '');
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
        <button class="btn primary" type="submit" ${busy ? 'disabled' : ''}>${busy ? '잠시만요…' : (signup ? '가입하고 시작하기' : '로그인')}</button>
      </form>
      ${signup ? '' : `<button class="auth-link" data-auth="toForgot">비밀번호를 잊었어요</button>`}`;
  }
  if (view === 'forgot') {
    return `${backRow('비밀번호 찾기')}
      <p class="auth-p">비밀번호를 잊으셨다면 가입한 이메일로 <b>${SUPPORT_EMAIL}</b>에 메일을 보내주세요. 확인 후 다시 정할 수 있게 도와드려요.</p>
      <button class="btn primary" data-auth="toLogin">로그인 화면으로</button>`;
  }
  return '';
}

let renderedKey = '';
function render() {
  if (!el || el.hidden) return;
  if (!CAT) CAT = catSvg();
  // 같은 화면을 다시 그릴 때(안내 문구만 바뀔 때) 입력한 값이 지워지지 않게 보관
  const key = view + ':' + mode, kept = {};
  if (key === renderedKey) el.querySelectorAll('input[id]').forEach(i => { kept[i.id] = i.type === 'checkbox' ? i.checked : i.value; });
  const focusedId = document.activeElement && el.contains(document.activeElement) ? document.activeElement.id : '';
  const compact = view !== 'start' && view !== 'setup';
  el.innerHTML = `<div class="auth-hero ${compact ? 'compact' : ''}">${CAT}<h1 class="auth-title">냥's 키친</h1>${compact ? '' : '<p class="auth-sub">우리 동네 길고양이 밥 지도</p>'}</div>
    <div class="auth-card">${cardHtml()}</div>`;
  Object.keys(kept).forEach(id => { const i = document.getElementById(id); if (!i) return; if (i.type === 'checkbox') i.checked = kept[id]; else i.value = kept[id]; });
  if (focusedId && document.getElementById(focusedId)) document.getElementById(focusedId).focus();
  renderedKey = key;
  bindForms();
}
function show() { if (!el) return; el.hidden = false; el.classList.remove('hide'); render(); }
function hide() { if (!el) return; el.classList.add('hide'); setTimeout(() => { el.hidden = true; el.innerHTML = ''; }, 320); }

function enter() {
  notice = '';
  hide();
  if (!entered) { entered = true; resolveReady(user); }
  listeners.forEach(f => { try { f(user); } catch (e) {} });
}

/* ---------- 동작 ---------- */
const validEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const validPw = v => v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v);

async function oauth(provider) {
  if (!configured) return;
  const url = `${API}/${provider}.php`;
  if (isNative && P.Browser) { try { await P.Browser.open({ url }); } catch (e) { say('브라우저를 열지 못했어요.', 'error'); } }
  else location.href = url;
}

async function handleRedirect(url) {
  if (!configured || !url || !url.startsWith(APP_REDIRECT)) return;
  let u;
  try { u = new URL(url); } catch (e) { return; }
  const q = u.searchParams;
  if (isNative && P.Browser) { try { await P.Browser.close(); } catch (e) {} }
  const err = q.get('error_description') || q.get('error');
  if (err) { view = 'start'; show(); say(err, 'error'); return; }
  const code = q.get('code');
  if (!code) return;
  busy = true; show();
  const r = await api('exchange', { code });
  busy = false;
  if (r.error) { view = 'start'; show(); say(friendly(r), 'error'); return; }
  saveSession(r.token, r.user);
  enter();
}

async function submitEmail(e) {
  e.preventDefault();
  const signup = mode === 'signup';
  const email = (document.getElementById('aEmail').value || '').trim();
  const pw = document.getElementById('aPw').value || '';
  lastEmail = email;
  if (!validEmail(email)) return say('이메일 주소를 확인해 주세요.', 'error');
  let r;
  if (signup) {
    const nick = (document.getElementById('aNick').value || '').trim();
    const pw2 = document.getElementById('aPw2').value || '';
    if (!nick) return say('닉네임을 적어주세요.', 'error');
    if (!validPw(pw)) return say('비밀번호는 8자 이상, 영문과 숫자를 섞어 주세요.', 'error');
    if (pw !== pw2) return say('비밀번호 확인이 달라요.', 'error');
    if (!document.getElementById('aAgree').checked) return say('개인정보처리방침에 동의해 주세요.', 'error');
    busy = true; say('');
    r = await api('signup', { email, password: pw, nickname: nick });
  } else {
    if (!pw) return say('비밀번호를 적어주세요.', 'error');
    busy = true; say('');
    r = await api('login', { email, password: pw });
  }
  busy = false;
  if (r.error) return say(friendly(r), 'error');
  saveSession(r.token, r.user);
  enter();
}

function bindForms() {
  const f1 = document.getElementById('authForm'); if (f1) f1.addEventListener('submit', submitEmail);
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
};
if (el) el.addEventListener('click', e => {
  const b = e.target.closest('[data-auth]'); if (!b || busy) return;
  const f = ACT[b.dataset.auth]; if (f) { e.preventDefault(); f(b.dataset.v); }
});

function handleBack() {
  if (!el || el.hidden) return false;
  if (view === 'email') { view = 'start'; say(''); return true; }
  if (view === 'forgot') { view = 'email'; mode = 'login'; say(''); return true; }
  return false;
}

/* ---------- 시작 ---------- */
async function init() {
  if (!el) return;
  if (isNative && P.App) {
    P.App.addListener('appUrlOpen', ev => handleRedirect(ev && ev.url));
  }
  if (!configured) { view = 'setup'; show(); return; }
  if (token) {
    try { user = JSON.parse(store.get(USER_KEY) || 'null'); } catch (e) { user = null; }
    const r = await api('me', null, 'GET');
    if (!r.error) { user = r.user; store.set(USER_KEY, JSON.stringify(user)); enter(); }
    else if (r.status === 401) { clearSession(); show(); }
    else if (user) enter();          // 인터넷이 없어도 마지막 로그인 상태로 들어간다
    else show();
  } else show();
  if (isNative && P.App) {
    try { const l = await P.App.getLaunchUrl(); if (l && l.url) handleRedirect(l.url); } catch (e) {}
  }
}

function signedOut() {
  clearSession(); view = 'start'; notice = ''; show();
  listeners.forEach(f => { try { f(null); } catch (e) {} });
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
  async signOut() {
    if (!configured) { entered = false; view = 'setup'; show(); return; }
    if (token) await api('logout', {});
    signedOut();
  },
  async deleteAccount() {
    if (!user) return { error: '로그인 상태가 아니에요.' };
    const r = await api('delete', {});
    if (r.error) return { error: friendly(r) };
    signedOut();
    return { error: null };
  }
};

init();
})();
