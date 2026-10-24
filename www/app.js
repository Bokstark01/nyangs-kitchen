/* 냥's 키친 1차: 카카오 지도, 급식 포인트, 고양이 사진(기기 저장), 급식 알람, 테스트 광고 */
(function () {
'use strict';

const Cap = window.Capacitor;
const isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
const P = (Cap && Cap.Plugins) || {};
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.9780 }; // 위치를 못 받을 때: 서울시청
const ADMOB_BANNER_TEST_ID = 'ca-app-pub-3940256099942544/6300978111';
const CFG = window.NK_CONFIG || {};
const ADMOB_BANNER_ID = CFG.admobBannerId || ADMOB_BANNER_TEST_ID;
const ADMOB_TESTING = ADMOB_BANNER_ID === ADMOB_BANNER_TEST_ID;
const PRIVACY_URL = 'https://nyangs-kitchen.com/privacy.html';
const APP_VERSION = CFG.version || '1.0.0';
const STORE_KEY = 'nyangs-kitchen-v1';

/* ---------- icons ---------- */
const I = {
  camera: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  bell: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>',
  gear: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  bowl: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13h16a8 8 0 0 1-16 0z"/><path d="M9 9c0-1.5 1-2 1-3.5"/><path d="M14 9c0-1.5 1-2 1-3.5"/></svg>',
  plus: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
  loc: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
  warn: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4"/><path d="M12 17h.01"/></svg>',
  back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
  more: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  trash: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/></svg>',
  phone: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>',
  phoneS: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"/></svg>',
  lock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  people: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14a6.5 6.5 0 0 1 3.5 6"/></svg>',
  map: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14"/><path d="M15 6v14"/></svg>',
  clock: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M9 2h6"/></svg>',
  chat: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>',
  search: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
  ok: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>',
  chatS: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>',
  refresh: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>',
  pen: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/></svg>',
  arrow: '<svg width="22" height="12" viewBox="0 0 28 12" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M0 6h24"/><path d="M20 1l6 5-6 5"/></svg>'
};

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const isDone = t => t.doneDate === today();
const CAT_COLORS = ['#E9C79A', '#3A3A3A', '#C9A27A', '#8C8F86', '#D8D2C6', '#B5835A'];

/* ---------- state ---------- */
function blank() { return { points: [], zones: [], filters: { mine: true, zone: true, shared: true }, kakaoKey: '', nextNid: 1000, center: null }; }
let S;
try { S = Object.assign(blank(), JSON.parse(localStorage.getItem(STORE_KEY)) || {}); } catch (e) { S = blank(); }
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { toast('저장 공간이 부족해요'); } try { backupSoon(); } catch (e) {} }
const pt = id => S.points.find(p => p.id === id);
const nextTime = p => p.times.filter(t => !isDone(t)).sort((a, b) => a.t.localeCompare(b.t))[0] || null;
const kakaoKey = () => (S.kakaoKey || (window.NK_CONFIG && window.NK_CONFIG.kakaoKey) || '').trim();
const photoSrc = c => c.photo ? (c.photo.startsWith('data:') ? c.photo : (Cap && Cap.convertFileSrc ? Cap.convertFileSrc(c.photo) : c.photo)) : null;
const catBg = c => { const s = photoSrc(c); return s ? `background-image:url('${s}')` : `background:${c.color}`; };

const R = { tab: 'map', screen: null, pointId: null, sel: null, adding: false };

/* ---------- overlays ---------- */
const layer = $('#layer');
let toastT;
function toast(msg) {
  clearTimeout(toastT);
  const old = layer.querySelector('.toast'); if (old) old.remove();
  const d = document.createElement('div'); d.className = 'toast'; d.setAttribute('role', 'status'); d.textContent = msg;
  layer.appendChild(d); toastT = setTimeout(() => d.remove(), 2400);
}
function sheet(inner) {
  const prev = layer.querySelector('.scrim'); if (prev) prev.remove();
  const s = document.createElement('div'); s.className = 'scrim'; s.dataset.act = 'scrim';
  s.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${inner}</div>`;
  layer.appendChild(s);
}
function closeSheet() { const p = document.getElementById('previewPin'); if (p) p.remove(); const s = layer.querySelector('.scrim'); if (s) { s.remove(); return true; } return false; }
const sw = (id, on, act, extra) => `<label class="switch"><input type="checkbox" id="${id}" ${on ? 'checked' : ''} data-act="${act}" ${extra || ''} aria-label="켜기"><span></span></label>`;

/* ---------- notifications ---------- */
const LN = P.LocalNotifications;
let notifReady = false;
async function ensureNotif() {
  if (!isNative || !LN) return false;
  if (notifReady) return true;
  try {
    let st = await LN.checkPermissions();
    if (st.display !== 'granted') st = await LN.requestPermissions();
    if (st.display !== 'granted') { toast('알림 권한을 허용해야 알람이 울려요'); return false; }
    try { await LN.createChannel({ id: 'feeding', name: '급식 알람', description: '급식 시간 알림', importance: 5, visibility: 1, vibration: true }); } catch (e) {}
    notifReady = true; return true;
  } catch (e) { return false; }
}
async function cancelAlarm(t) {
  if (!isNative || !LN || !t.nid) return;
  try { await LN.cancel({ notifications: [{ id: t.nid }] }); } catch (e) {}
}
async function scheduleAlarm(p, t) {
  await cancelAlarm(t);
  if (!t.alarm) return;
  if (!t.nid) { t.nid = S.nextNid++; save(); }
  if (!(await ensureNotif())) return;
  const [h, m] = t.t.split(':').map(Number);
  try {
    await LN.schedule({ notifications: [{
      id: t.nid, channelId: 'feeding',
      title: `밥 시간이에요 · ${t.t}`,
      body: `${p.name} 포인트 ${t.label} 급식 시간이에요${p.cats.length ? ` (${p.cats.map(c => c.name).slice(0, 3).join(', ')})` : ''}`,
      schedule: { on: { hour: h, minute: m }, allowWhileIdle: true },
      extra: { pointId: p.id }
    }] });
  } catch (e) { toast('알람을 맞추지 못했어요'); }
}
async function testNotification() {
  if (!isNative || !LN) { toast('알림은 휴대폰 앱에서만 울려요'); return; }
  if (!(await ensureNotif())) return;
  await LN.schedule({ notifications: [{ id: 999, channelId: 'feeding', title: '냥\'s 키친 알림 테스트', body: '이렇게 급식 시간에 알려드려요', schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true } }] });
  toast('5초 뒤 알림이 와요. 앱을 닫아도 돼요');
}

/* ---------- photos: 원본은 기기에만 ---------- */
async function pickPhoto() {
  if (isNative && P.Camera) {
    try {
      const r = await P.Camera.getPhoto({
        quality: 80, width: 1400, correctOrientation: true, resultType: 'base64', source: 'PROMPT', saveToGallery: false,
        promptLabelHeader: '고양이 사진', promptLabelCancel: '취소', promptLabelPhoto: '앨범에서 고르기', promptLabelPicture: '사진 찍기'
      });
      return { base64: r.base64String, format: r.format || 'jpeg' };
    } catch (e) {
      if (!/cancel/i.test(String(e && e.message))) toast('사진을 가져오지 못했어요. 카메라·사진 권한을 확인해 주세요');
      return null;
    }
  }
  return new Promise(res => {
    const inp = $('#photoInput'); inp.value = '';
    inp.onchange = () => {
      const f = inp.files && inp.files[0]; if (!f) return res(null);
      const rd = new FileReader(); rd.onload = () => res({ dataUrl: rd.result }); rd.readAsDataURL(f);
    };
    inp.click();
  });
}
async function storePhoto(catId, photo) {
  if (photo.dataUrl) return photo.dataUrl;
  const r = await P.Filesystem.writeFile({ path: `cats/${catId}.${photo.format}`, data: photo.base64, directory: 'DATA', recursive: true });
  return r.uri;
}
async function deletePhoto(c) {
  if (!c.photo || c.photo.startsWith('data:') || !P.Filesystem) return;
  const m = c.photo.match(/cats\/[^/?#]+$/);
  if (m) { try { await P.Filesystem.deleteFile({ path: m[0], directory: 'DATA' }); } catch (e) {} }
}

/* ---------- location ---------- */
async function getPosition() {
  try {
    if (isNative && P.Geolocation) {
      const st = await P.Geolocation.checkPermissions().catch(() => ({}));
      if (st.location !== 'granted') await P.Geolocation.requestPermissions().catch(() => {});
      const p = await P.Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
      return { lat: p.coords.latitude, lng: p.coords.longitude };
    }
    if (navigator.geolocation) {
      return await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lng: p.coords.longitude }), rej, { enableHighAccuracy: true, timeout: 12000 }));
    }
  } catch (e) {}
  return null;
}

/* ---------- map: 카카오 키가 있으면 카카오맵, 없거나 실패하면 오픈 지도(Leaflet) ---------- */
let kmap = null, engine = null, kObjs = [], meOverlay = null, myPos = null, mapState = 'idle'; // idle | loading | ready | failed
function loadMap() {
  const key = kakaoKey();
  if (key) loadKakao(key); else initLeaflet();
}
function loadKakao(key) {
  if (window.kakao && window.kakao.maps && window.kakao.maps.Map) { initKakao(); return; }
  mapState = 'loading'; renderMapUi();
  const old = document.getElementById('kakaoSdk'); if (old) old.remove();
  const s = document.createElement('script');
  s.id = 'kakaoSdk';
  s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`;
  const fallback = () => { if (engine) return; mapState = 'idle'; toast('카카오 지도를 열지 못해 기본 지도로 열었어요'); initLeaflet(); };
  s.onload = () => {
    if (!(window.kakao && window.kakao.maps && window.kakao.maps.load)) { fallback(); return; }
    try { window.kakao.maps.load(initKakao); } catch (e) { fallback(); }
  };
  s.onerror = fallback;
  document.head.appendChild(s);
  setTimeout(() => { if (mapState === 'loading') fallback(); }, 10000);
}
function resetMapBox() { kObjs = []; meOverlay = null; const el = $('#kmap'); const fresh = el.cloneNode(false); el.replaceWith(fresh); }
function onMapClick() {
  if (lpHeld) return;
  if (R.adding) { toast('원하는 곳을 꾸욱 눌러주세요'); return; }
  if (R.sel) { R.sel = null; syncOverlays(); renderMapUi(); }
}

/* ---------- 꾸욱 눌러 위치 지정 (long press) ---------- */
const LONG_PRESS_MS = 550, MOVE_TOLERANCE = 12;
let lp = null, suppressClickUntil = 0, lpHeld = false;
function screenToLatLng(x, y) {
  if (!kmap) return null;
  if (engine === 'kakao') {
    const ll = kmap.getProjection().coordsFromContainerPoint(new window.kakao.maps.Point(x, y));
    return { lat: ll.getLat(), lng: ll.getLng() };
  }
  const ll = kmap.containerPointToLatLng([x, y]);
  return { lat: ll.lat, lng: ll.lng };
}
function clearPressRing() { const r = $('#pressRing'); if (r) r.remove(); }
function clearPreviewPin() { const p = $('#previewPin'); if (p) p.remove(); }
function cancelLongPress() { if (lp) { clearTimeout(lp.timer); lp = null; } clearPressRing(); }
function setupLongPress() {
  const box = $('#mapBox');
  const ignore = t => t.closest('#mapUi button, #mapUi .peek, #mapUi .addhint, #mapUi .legend, #mapUi .mapfallback, .kpin, .kzone');
  let pointers = 0;
  box.addEventListener('pointerdown', e => {
    pointers++;
    if (pointers > 1 || mapState !== 'ready' || ignore(e.target)) { cancelLongPress(); return; }
    const r = box.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    cancelLongPress();
    const ring = document.createElement('div'); ring.id = 'pressRing'; ring.className = 'press-ring';
    ring.style.left = x + 'px'; ring.style.top = y + 'px';
    box.appendChild(ring);
    lp = { x0: e.clientX, y0: e.clientY, x, y, timer: setTimeout(() => {
      const at = screenToLatLng(x, y); const px = x, py = y;
      cancelLongPress();
      if (!at) return;
      lpHeld = true;
      try { if (navigator.vibrate) navigator.vibrate(30); } catch (_) {}
      const pin = document.createElement('div'); pin.id = 'previewPin'; pin.className = 'preview-pin';
      pin.style.left = px + 'px'; pin.style.top = py + 'px'; pin.innerHTML = `<div class="b">${I.bowl}</div>`;
      box.appendChild(pin);
      R.adding = false; renderMapUi();
      openAddSheet(at);
    }, LONG_PRESS_MS) };
  }, true);
  box.addEventListener('pointermove', e => {
    if (lp && Math.hypot(e.clientX - lp.x0, e.clientY - lp.y0) > MOVE_TOLERANCE) cancelLongPress();
  }, true);
  const up = () => {
    pointers = Math.max(0, pointers - 1); cancelLongPress();
    if (lpHeld) { lpHeld = false; suppressClickUntil = Date.now() + 350; }
  };
  document.addEventListener('pointerup', up, true);
  document.addEventListener('pointercancel', up, true);
  box.addEventListener('pointerleave', () => { pointers = 0; cancelLongPress(); }, true);
  box.addEventListener('contextmenu', e => e.preventDefault());
  // 꾸욱 누른 손가락을 뗄 때 생기는 클릭이 방금 연 시트를 닫지 않게 막는다
  document.addEventListener('click', e => {
    if (lpHeld || Date.now() < suppressClickUntil) { suppressClickUntil = 0; e.stopPropagation(); e.preventDefault(); }
  }, true);
}
function initKakao() {
  if (engine === 'kakao') return;
  if (kmap && engine === 'leaflet') { try { kmap.remove(); } catch (e) {} }
  resetMapBox();
  const K = window.kakao.maps;
  const c = S.center || DEFAULT_CENTER;
  kmap = new K.Map($('#kmap'), { center: new K.LatLng(c.lat, c.lng), level: 3 });
  engine = 'kakao';
  K.event.addListener(kmap, 'click', onMapClick);
  K.event.addListener(kmap, 'idle', () => { const cc = kmap.getCenter(); S.center = { lat: cc.getLat(), lng: cc.getLng() }; save(); });
  mapState = 'ready'; syncOverlays(); renderMapUi();
  if (!S.center) locate(true);
}
function initLeaflet() {
  if (engine === 'leaflet') return;
  if (!window.L) { mapState = 'failed'; renderMapUi(); return; }
  resetMapBox();
  const c = S.center || DEFAULT_CENTER;
  kmap = L.map($('#kmap'), { zoomControl: false, attributionControl: true }).setView([c.lat, c.lng], 17);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd', maxZoom: 20, attribution: '© OpenStreetMap © CARTO'
  }).addTo(kmap);
  engine = 'leaflet';
  kmap.on('click', onMapClick);
  kmap.on('moveend', () => { const cc = kmap.getCenter(); S.center = { lat: cc.lat, lng: cc.lng }; save(); });
  mapState = 'ready'; syncOverlays(); renderMapUi();
  if (!S.center) locate(true);
}
function mapCenterTo(lat, lng) {
  if (!kmap) return;
  if (engine === 'kakao') kmap.setCenter(new window.kakao.maps.LatLng(lat, lng));
  else kmap.setView([lat, lng], Math.max(kmap.getZoom(), 16));
}
function mapRelayout() { if (!kmap) return; if (engine === 'kakao') kmap.relayout(); else kmap.invalidateSize(); }
function pinEl(p) {
  const el = document.createElement('div');
  el.className = 'kpin' + (R.sel === p.id ? ' sel' : '');
  el.innerHTML = `<div class="b">${I.bowl}</div><div class="l">${esc(p.name)}</div>`;
  return el;
}
function sharedPinEl(s) {
  const el = document.createElement('div');
  el.className = 'kpin shared';
  el.innerHTML = `<div class="b">${I.people.replace('width="22" height="22"', 'width="20" height="20"')}</div><div class="l">${esc(s.name)}</div>`;
  return el;
}
function selectPin(id) { if (R.adding) return; R.sel = id; syncOverlays(); renderMapUi(); }
function syncOverlays() {
  if (!kmap) return;
  kObjs.forEach(o => engine === 'kakao' ? o.setMap(null) : o.remove()); kObjs = [];
  if (engine === 'kakao') {
    const K = window.kakao.maps;
    if (S.filters.zone) S.zones.forEach(z => {
      const pos = new K.LatLng(z.lat, z.lng);
      kObjs.push(new K.Circle({ map: kmap, center: pos, radius: z.radius || 40, strokeWeight: 2, strokeColor: '#E8735A', strokeOpacity: 0.9, strokeStyle: 'dash', fillColor: '#FF9F8A', fillOpacity: 0.16 }));
      const el = document.createElement('div'); el.className = 'kzone'; el.innerHTML = `${I.warn}${esc(z.label)}`;
      el.addEventListener('click', ev => { ev.stopPropagation(); zoneSheet(z.id); });
      kObjs.push(new K.CustomOverlay({ map: kmap, position: pos, content: el, yAnchor: 0.5, clickable: true }));
    });
    if (S.filters.mine) S.points.forEach(p => {
      const el = pinEl(p);
      el.addEventListener('click', ev => { ev.stopPropagation(); selectPin(p.id); });
      kObjs.push(new K.CustomOverlay({ map: kmap, position: new K.LatLng(p.lat, p.lng), content: el, yAnchor: 0.35, clickable: true, zIndex: 3 }));
    });
    if (S.filters.shared !== false) SH.joined.forEach(s => {
      const el = sharedPinEl(s);
      el.addEventListener('click', ev => { ev.stopPropagation(); A.openShared(s.id); });
      kObjs.push(new K.CustomOverlay({ map: kmap, position: new K.LatLng(s.lat, s.lng), content: el, yAnchor: 0.35, clickable: true, zIndex: 2 }));
    });
  } else {
    if (S.filters.zone) S.zones.forEach(z => {
      kObjs.push(L.circle([z.lat, z.lng], { radius: z.radius || 40, color: '#E8735A', weight: 2, dashArray: '6 6', fillColor: '#FF9F8A', fillOpacity: 0.16, interactive: false }).addTo(kmap));
      const icon = L.divIcon({ className: 'nk-icon', html: `<div class="kzone">${I.warn}${esc(z.label)}</div>`, iconSize: null });
      kObjs.push(L.marker([z.lat, z.lng], { icon }).on('click', () => zoneSheet(z.id)).addTo(kmap));
    });
    if (S.filters.mine) S.points.forEach(p => {
      const icon = L.divIcon({ className: 'nk-icon nk-pin', html: pinEl(p).outerHTML, iconSize: null });
      kObjs.push(L.marker([p.lat, p.lng], { icon, zIndexOffset: 500 }).on('click', () => selectPin(p.id)).addTo(kmap));
    });
    if (S.filters.shared !== false) SH.joined.forEach(s => {
      const icon = L.divIcon({ className: 'nk-icon nk-pin', html: sharedPinEl(s).outerHTML, iconSize: null });
      kObjs.push(L.marker([s.lat, s.lng], { icon, zIndexOffset: 400 }).on('click', () => A.openShared(s.id)).addTo(kmap));
    });
  }
  drawMe();
}
function drawMe() {
  if (!kmap || !myPos) return;
  if (meOverlay) { engine === 'kakao' ? meOverlay.setMap(null) : meOverlay.remove(); }
  if (engine === 'kakao') {
    const K = window.kakao.maps;
    const el = document.createElement('div'); el.className = 'kme';
    meOverlay = new K.CustomOverlay({ map: kmap, position: new K.LatLng(myPos.lat, myPos.lng), content: el, zIndex: 2 });
  } else {
    meOverlay = L.marker([myPos.lat, myPos.lng], { icon: L.divIcon({ className: 'nk-icon', html: '<div class="kme"></div>', iconSize: null }), interactive: false }).addTo(kmap);
  }
}
async function locate(silent) {
  const pos = await getPosition();
  if (!pos) { if (!silent) toast('위치를 찾지 못했어요. 위치 권한과 GPS를 확인해 주세요'); return; }
  myPos = pos;
  mapCenterTo(pos.lat, pos.lng); drawMe();
}

/* ---------- map UI (above the map) ---------- */
function renderMapUi() {
  const ui = $('#mapUi');
  if (mapState === 'failed') {
    ui.innerHTML = `<div class="mapfallback">
      <span class="soon">지도를 불러오지 못했어요</span>
      <h2 class="h-display" style="font-size:24px">인터넷 연결을 확인해 주세요</h2>
      <p class="muted" style="margin:0;line-height:1.6">지도는 인터넷이 연결되어야 보여요. 급식 일정, 사진, 알람은 그대로 쓸 수 있어요.</p>
      <button class="btn primary" data-act="retryMap">다시 시도</button>
      ${S.points.length ? `<h3 class="h-sec" style="margin-top:8px">내 급식 포인트</h3><div class="list">${S.points.map(p => `<div class="li"><b>${esc(p.name)}</b><button class="btn sm" data-act="open" data-v="${p.id}">보기</button></div>`).join('')}</div>` : ''}
    </div>`;
    return;
  }
  if (mapState === 'loading') { ui.innerHTML = `<div class="mapfallback" style="justify-content:center;align-items:center"><span class="muted">지도를 불러오는 중…</span></div>`; return; }
  if (R.picking) {
    ui.innerHTML = `<div class="crosshair" aria-hidden="true"></div>
      <div class="addhint" style="top:12px"><span>지도를 움직여 <b>잃어버린 곳</b>을 가운데 맞춰주세요</span></div>
      <div class="peek"><div class="row"><button class="btn sm" style="flex:1" data-act="pickCancel">취소</button><button class="btn sm primary" style="flex:2" data-act="pickConfirm">이 위치로 정하기</button></div></div>`;
    return;
  }
  const sel = R.sel ? pt(R.sel) : null;
  let peek = '';
  if (sel && !R.adding) {
    const n = nextTime(sel);
    peek = `<div class="peek">
      <div class="between" style="align-items:flex-start">
        <div style="display:flex;flex-direction:column;gap:3px;min-width:0">
          <span class="small" style="font-weight:600;color:var(--accent)">${n ? `다음 급식 · ${n.t}` : (sel.times.length ? '오늘 급식 모두 완료' : '급식 시간을 정해주세요')}</span>
          <span style="font-size:18px;font-weight:700">${esc(sel.name)} 포인트</span>
          <span class="small muted">${sel.cats.length ? esc(sel.cats.map(c => c.name).join(' · ')) + ' 자주 와요' : '아직 등록한 고양이가 없어요'}</span>
        </div>
        <div class="avatars">${sel.cats.slice(0, 3).map(c => `<span style="${catBg(c)}"></span>`).join('')}</div>
      </div>
      <div class="row">
        <button class="btn sm" style="flex:1" data-act="open" data-v="${sel.id}">포인트 보기</button>
        <button class="btn sm primary" style="flex:1" data-act="feed" data-v="${sel.id}" ${n ? '' : 'disabled'}>${n ? '급식 완료 체크' : '완료'}</button>
      </div></div>`;
  }
  const empty = !S.points.length && !R.adding ? `<div class="peek"><b style="font-size:15px">첫 급식 포인트를 등록해 보세요</b><span class="small muted">지도에서 급식소 자리를 꾸욱 누르면 바로 등록할 수 있어요.</span></div>` : '';
  ui.innerHTML = `
    <div class="legend">
      <button data-act="filter" data-v="mine" aria-pressed="${S.filters.mine}"><span class="dot" style="background:linear-gradient(135deg,#8E7CF6,#FFB8A0)"></span>내 포인트 ${S.points.length}</button>
      <button data-act="filter" data-v="zone" aria-pressed="${S.filters.zone}"><span class="dot" style="border:2px dashed #E8735A"></span>주의 구역 ${S.zones.length}</button>
      ${SH.joined.length ? `<button data-act="filter" data-v="shared" aria-pressed="${S.filters.shared !== false}"><span class="dot" style="background:#fff;border:2.5px solid #B79BFF"></span>공유받은 곳 ${SH.joined.length}</button>` : ''}
    </div>
    ${R.adding ? `<div class="addhint"><span>급식소 자리를 지도에서 <b>꾸욱</b> 눌러주세요</span><button data-act="cancelAdd">취소</button></div>` : ''}
    ${R.adding ? '' : `<button class="fab loc" style="bottom:${sel || empty ? 216 : 86}px" data-act="locate" aria-label="내 위치로">${I.loc}</button>
    <button class="fab" style="bottom:${sel || empty ? 152 : 20}px" data-act="startAdd" aria-label="급식 포인트 또는 주의 구역 추가">${I.plus}</button>`}
    ${peek || empty}`;
}

/* ---------- screens ---------- */
const TABS = [['map', '지도', I.map], ['schedule', '급식 일정', I.clock], ['share', '함께', I.people], ['board', '이웃', I.chat], ['detective', '탐정모드', I.search]];
function renderTabs() {
  $('#tabs').hidden = !!R.screen;
  $('#tabs').innerHTML = TABS.map(([k, l, ic]) => `<button data-act="tab" data-v="${k}" ${R.tab === k && !R.screen ? 'aria-current="page"' : ''}>${ic}${l}${k === 'share' && SH.pending ? `<span class="nb" aria-label="받은 부탁 ${SH.pending}건">${SH.pending}</span>` : ''}${k === 'board' && BD.unread ? `<span class="nb" aria-label="내 글의 새 댓글 ${BD.unread}개">${BD.unread}</span>` : ''}${k === 'detective' && LS.unread ? `<span class="nb" aria-label="새 유실묘 알림 ${LS.unread}건">${LS.unread}</span>` : ''}</button>`).join('');
}

function scheduleScreen() {
  const rows = [];
  S.points.forEach(p => p.times.forEach(t => rows.push({ p, t })));
  rows.sort((a, b) => a.t.t.localeCompare(b.t.t));
  const done = rows.filter(r => isDone(r.t)).length;
  return `<header class="topbar"><div><div class="brand">급식 일정</div><div class="where">오늘 ${done}/${rows.length} 완료</div></div></header>
  <div class="pad">
    ${churuCard()}
    ${rows.length ? `<div class="card" style="gap:0;padding:4px 16px">${rows.map(({ p, t }) => `<div class="time">
        <div class="row" style="gap:12px;min-width:0">
          <button class="check ${isDone(t) ? 'on' : ''}" data-act="toggleDone" data-p="${p.id}" data-v="${t.id}" aria-label="${esc(p.name)} ${t.t} 급식 완료">${I.ok}</button>
          <button style="border:none;background:none;padding:0;text-align:left;display:flex;flex-direction:column;min-width:0" data-act="open" data-v="${p.id}"><span class="clock">${t.t}</span><span class="small muted">${esc(p.name)} · ${esc(t.label)}</span></button>
        </div>
        <div class="row"><span class="small muted">알람</span>${sw('al-' + t.id, t.alarm, 'alarm', `data-p="${p.id}" data-v="${t.id}"`)}</div></div>`).join('')}</div>`
      : `<div class="empty">아직 급식 시간이 없어요.<br>지도에서 급식 포인트를 등록하면 저녁 6시 알람이 기본으로 맞춰져요.</div>`}
    <button class="btn" data-act="testNotif">알림 테스트 (5초 뒤)</button>
    <p class="small muted" style="margin:0;line-height:1.6">알람은 매일 같은 시간에 울려요. 완료 체크는 자정이 지나면 새로 시작돼요.</p>
  </div>`;
}

function pointShareCard(p) {
  const sh = ownedFor(p.id);
  if (sh) return `<section class="card">
      <h3 class="h-sec">함께 돌보기</h3>
      <div class="store"><div class="ic on">${I.people}</div><div><b>${sh.member_count}명과 공유 중</b><span class="small muted">${lastFed(sh)}</span></div></div>
      <div class="row"><button class="btn sm" style="flex:1" data-act="openShared" data-v="${sh.id}">공유 관리 · 부탁하기</button><button class="btn sm primary" style="flex:1" data-act="invite" data-v="${sh.id}">초대하기</button></div>
    </section>`;
  return `<section class="card">
      <h3 class="h-sec">함께 돌보기</h3>
      <div class="store"><div class="ic">${I.phone}</div><div><b>지금은 나만 봐요</b><span class="small muted">원본 사진은 이 휴대폰에만 있어요. 공유하면 작게 줄인 사진만 올라가요</span></div></div>
      ${canShare() ? `<button class="btn sm primary" data-act="shareAsk" data-v="${p.id}">이 급식소 공유하고 이웃 초대하기</button>` : `<span class="small muted">로그인하면 이웃과 공유할 수 있어요</span>`}
    </section>`;
}
function pointScreen() {
  const p = pt(R.pointId); if (!p) { R.screen = null; return scheduleScreen(); }
  return `<div class="navbar"><button class="back" data-act="back" aria-label="뒤로">${I.back}</button><h1>급식 포인트</h1>
    <button class="back" data-act="pointMenu" aria-label="포인트 메뉴">${I.more}</button></div>
  <div class="pad">
    <div style="display:flex;flex-direction:column;gap:8px">
      <h2 class="h-display">${esc(p.name)}</h2>
      <div class="row" style="flex-wrap:wrap;gap:6px">${ownedFor(p.id) ? `<span class="chip">${ownedFor(p.id).member_count}명과 공유 중</span>` : '<span class="chip ghost">나만 보기</span>'}<span class="chip ghost">${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}</span></div>
    </div>
    <section style="display:flex;flex-direction:column;gap:10px">
      <div class="between"><h3 class="h-sec">먹으러 오는 고양이 ${p.cats.length ? p.cats.length + '마리' : ''}</h3><button class="linkbtn" data-act="addCat">+ 사진 추가</button></div>
      <div class="cats">
        ${p.cats.map(c => `<button class="cat" data-act="catMenu" data-v="${c.id}"><div class="ph" style="${catBg(c)}"><span class="badge">${I.phoneS}원본</span></div><b>${esc(c.name)}</b>${catTag(c)}</button>`).join('')}
        <button class="addcat" data-act="addCat">${I.plus}사진 추가</button>
      </div>
    </section>
    ${pointShareCard(p)}
    <section class="card" style="gap:0">
      <div class="between" style="padding-bottom:4px"><h3 class="h-sec">급식 시간 · 알람</h3><button class="linkbtn" data-act="addTime">+ 시간 추가</button></div>
      ${p.times.length ? p.times.slice().sort((a, b) => a.t.localeCompare(b.t)).map(t => `<div class="time">
        <div class="row" style="gap:10px"><button class="check ${isDone(t) ? 'on' : ''}" data-act="toggleDone" data-p="${p.id}" data-v="${t.id}" aria-label="${t.t} 급식 완료">${I.ok}</button>
          <span class="clock" style="font-size:18px">${t.t}</span><span class="small ${isDone(t) ? 'muted' : ''}" style="${isDone(t) ? '' : 'color:var(--accent);font-weight:600'}">${esc(t.label)} · ${isDone(t) ? '완료' : '예정'}</span></div>
        <div class="row" style="gap:2px">${sw('pal-' + t.id, t.alarm, 'alarm', `data-p="${p.id}" data-v="${t.id}"`)}<button class="iconsm" data-act="delTime" data-p="${p.id}" data-v="${t.id}" aria-label="${t.t} 삭제">${I.trash}</button></div></div>`).join('')
        : `<div class="empty" style="padding:16px 0">급식 시간을 추가하면 매일 알람이 울려요</div>`}
    </section>
  </div>
  <div class="actions"><button class="btn" data-act="showOnMap" data-v="${p.id}">지도에서 보기</button><button class="btn primary" data-act="feed" data-v="${p.id}" ${nextTime(p) ? '' : 'disabled'}>${nextTime(p) ? '급식 완료 체크' : '오늘 완료'}</button></div>`;
}

function soonScreen(kind) {
  const C = {
    board: { title: '이웃', head: '동네 이웃과<br>이야기를 나눠요', body: '우리 동네 집사들이 소식과 정보를 나누는 이웃 게시판이에요. 다음 업데이트에서 열려요. 급식소 공유와 밥 부탁은 ‘함께’ 탭에서 지금 바로 쓸 수 있어요.', extra: `<button class="btn primary" data-act="tab" data-v="share">함께 탭으로 가기</button>` }
  }[kind];
  return `<header class="topbar"><div><div class="brand">${C.title}</div></div></header>
  <div class="pad"><span class="soon">준비 중</span><h2 class="h-display" style="font-size:24px">${C.head}</h2><p class="muted" style="margin:0;line-height:1.7">${C.body}</p>${C.extra}</div>`;
}

function render() {
  const onMap = R.tab === 'map' && !R.screen;
  $('#mapScreen').hidden = !onMap;
  $('#view').hidden = onMap;
  if (onMap) {
    renderMapUi();
    setTimeout(mapRelayout, 0);
  } else {
    let html;
    if (R.screen === 'point') html = pointScreen();
    else if (R.screen === 'shared') html = sharedScreen();
    else if (R.screen === 'lostForm') html = lostFormScreen();
    else if (R.screen === 'post') html = postScreen();
    else if (R.screen === 'postForm') html = postFormScreen();
    else if (R.screen === 'churu') html = churuScreen();
    else if (R.tab === 'board') html = boardScreen();
    else if (R.tab === 'detective') html = detectiveScreen();
    else if (R.tab === 'schedule') html = scheduleScreen();
    else if (R.tab === 'share') html = shareScreen();
    else html = soonScreen(R.tab);
    $('#view').innerHTML = html;
    setTimeout(() => { hydratePhotos(); hydrateLostPhotos(); hydrateBoardPhotos(); }, 0);
  }
  renderTabs();
}

/* ---------- sheets ---------- */
let addAt = null, pendingPhoto = null;
function openAddSheet(at) {
  addAt = at;
  sheet(`<h2>여기에 무엇을 등록할까요?</h2>
    <div class="seg" role="group" aria-label="종류" id="kind"><button data-act="kind" data-v="point" aria-pressed="true">급식 포인트</button><button data-act="kind" data-v="zone" aria-pressed="false">급식 주의 구역</button></div>
    <div class="field"><label for="newName">이름</label><input id="newName" placeholder="예: 골목 화단" maxlength="20"></div>
    <p class="small muted" style="margin:0;line-height:1.6" id="kindHint">저녁 6시 급식 알람이 기본으로 맞춰져요. 포인트 화면에서 바꿀 수 있어요.</p>
    <button class="btn primary" data-act="confirmAdd">등록하기</button>`);
}
function zoneSheet(id) {
  const z = S.zones.find(x => x.id === id); if (!z) return;
  sheet(`<h2>${esc(z.label)}</h2><p class="muted" style="margin:0;line-height:1.6">민원이나 급식 금지 안내가 있는 곳으로 표시해 둔 구역이에요. 지금은 이 휴대폰에서만 보여요.</p>
    <button class="btn danger" data-act="delZone" data-v="${z.id}">구역 표시 지우기</button><button class="btn" data-act="closeSheet">닫기</button>`);
}
function settingsSheet() {
  const cats = S.points.reduce((a, p) => a + p.cats.length, 0);
  const AU = window.NK_AUTH;
  const acct = AU && AU.user()
    ? `<div class="card"><div class="between"><span>내 계정</span><b>${esc(AU.name())}</b></div><div class="between"><span class="small muted">${esc(AU.provider())} 로그인</span><span class="small muted">${esc(AU.email())}</span></div>
        <div class="row"><button class="btn sm" style="flex:1" data-act="logout">로그아웃</button><button class="btn sm danger" style="flex:1" data-act="deleteAccountAsk">회원탈퇴</button></div></div>`
    : (AU && AU.configured ? `<button class="btn primary" data-act="logout">로그인하기</button>` : '');
  sheet(`<h2>설정</h2>
    ${acct}
    ${AU && AU.user() ? `<div class="card"><div class="between"><span><b>급식소 서버 백업</b></span>${sw('bkSw', BK.consent === true, 'backupToggle')}</div>
      <span class="small muted">${BK.consent === true ? `켜짐 · 급식소 ${BK.count}곳 백업됨. 사진은 올리지 않아요. 끄면 서버 기록이 바로 지워져요.` : '꺼짐 · 휴대폰을 바꾸면 급식소를 복원할 수 없고, 근처 유실묘 알림을 받지 않아요.'}</span>
      ${BK.consent === true ? `<button class="btn sm" data-act="restoreGo">백업에서 불러오기</button>` : ''}</div>` : ''}
    ${AU && AU.user() ? `<button class="btn" data-act="blocksSheet">차단한 이웃 관리</button>` : ''}
    <div class="card"><div class="between"><span>급식 포인트</span><b>${S.points.length}곳</b></div><div class="between"><span>등록한 고양이</span><b>${cats}마리</b></div><div class="between"><span>급식 주의 구역</span><b>${S.zones.length}곳</b></div></div>
    <div class="field"><label for="keyInput2">카카오 지도 JavaScript 키 (선택)</label><input id="keyInput2" value="${esc(S.kakaoKey)}" placeholder="${kakaoKey() ? '빌드에 들어간 키 사용 중' : '없으면 기본 지도를 써요'}" autocapitalize="off" autocomplete="off" spellcheck="false"></div>
    <button class="btn" data-act="saveKey2">키 저장</button>
    <button class="btn" data-act="testNotif">알림 테스트 (5초 뒤)</button>
    <button class="btn danger" data-act="resetAsk">모든 데이터 지우기</button>
    <a class="btn" href="${PRIVACY_URL}" target="_blank" rel="noopener">개인정보처리방침</a>
    <p class="small muted" style="margin:0">냥's 키친 ${esc(APP_VERSION)} · 고양이 원본 사진은 이 휴대폰에만 저장돼요.</p>`);
}

/* ---------- 이웃과 함께: 급식소 공유 · 초대 · 밥 부탁 · 밥 줬어요 ----------
   공유하기로 고른 급식소만 서버에 올린다. 원본 사진은 휴대폰에 두고, 480px로 줄인 사진(위치 정보 없음)만 올린다. */
const AU = () => window.NK_AUTH;
const SITE = 'https://nyangs-kitchen.com';
const SH = { loaded: false, loading: false, error: '', owned: [], joined: [], pending: 0 };
const photoCache = {};
const canShare = () => !!(AU() && AU().configured && AU().user());
const ownedFor = nid => SH.owned.find(s => s.nid === nid);
const shareById = id => SH.owned.concat(SH.joined).find(s => s.id === Number(id));
const nowSec = () => Math.floor(Date.now() / 1000);
function fmtAgo(ts) {
  const d = nowSec() - ts;
  if (d < 60) return '방금';
  if (d < 3600) return Math.floor(d / 60) + '분 전';
  if (d < 86400) return Math.floor(d / 3600) + '시간 전';
  const t = new Date(ts * 1000); return `${t.getMonth() + 1}/${t.getDate()}`;
}
const fmtDate = d => { const [, m, dd] = String(d).split('-'); return `${+m}/${+dd}`; };
const reqRange = q => q.start === q.end ? fmtDate(q.start) : `${fmtDate(q.start)} ~ ${fmtDate(q.end)}`;
const REQ_STATUS = { pending: '답을 기다려요', accepted: '맡아주기로 했어요', declined: '어렵다고 했어요', cancelled: '취소됐어요' };
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const lastFed = s => s.logs && s.logs[0] ? `${fmtAgo(s.logs[0].at)} ${esc(s.logs[0].by)} 님이 밥 줬어요` : '아직 밥 기록이 없어요';

async function loadShares(quiet) {
  if (!canShare()) { SH.loaded = true; SH.owned = []; SH.joined = []; SH.pending = 0; return; }
  if (SH.loading) return;
  SH.loading = true;
  const r = await AU().share('list', null, 'GET');
  SH.loading = false;
  if (r.error) { SH.error = r.message || '공유 정보를 불러오지 못했어요'; SH.loaded = true; if (!quiet) toast(SH.error); }
  else { SH.error = ''; SH.owned = r.owned || []; SH.joined = r.joined || []; SH.pending = r.pending || 0; SH.loaded = true; }
  render(); syncOverlays();
}

// 원본 사진을 480px JPEG로 줄인다 (캔버스로 다시 그리면 사진 속 위치 정보도 빠진다)
function smallJpeg(src) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 480 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      try { res(c.toDataURL('image/jpeg', 0.72)); } catch (e) { res(null); }
    };
    img.onerror = () => res(null);
    img.src = src;
  });
}
/* ---------- 고양이 건강·중성화 기록 ---------- */
const SEX_OPTS = [['', '모름'], ['m', '수컷'], ['f', '암컷']];
const NEUTER_OPTS = [['', '모름'], ['yes', '했어요'], ['no', '아직']];
const HEALTH_KINDS = [['vet', '병원'], ['med', '약'], ['note', '메모']];
let CD = null;   // 고양이 정보 시트에서 고치는 중인 값
const catTag = c => c.neuter === 'yes' ? '<span class="cat-tag on">중성화 완료</span>' : c.neuter === 'no' ? '<span class="cat-tag">중성화 전</span>' : '';
const segHtml = (k, label, opts, cur) => `<div class="field"><label>${label}</label><div class="seg" role="group" aria-label="${label}">${opts.map(([v, l]) => `<button data-act="catSeg" data-k="${k}" data-v="${v}" aria-pressed="${v === cur}">${l}${k === 'neuter' && v === 'yes' ? '<small>귀 끝 컷</small>' : ''}</button>`).join('')}</div></div>`;
function healthList(list, editable) {
  if (!list.length) return '<div class="empty" style="padding:10px 0">아직 기록이 없어요</div>';
  const kl = Object.fromEntries(HEALTH_KINDS);
  return `<div class="hlist">${list.map((h, i) => `<div class="hrow"><span class="hkind k-${h.k}">${kl[h.k] || '메모'}</span>
    <div class="htext"><b>${esc(h.t)}</b><span class="small muted">${h.d.replace(/-/g, '.')}</span></div>
    ${editable ? `<button class="iconsm" data-act="delHealth" data-v="${i}" aria-label="기록 지우기">${I.trash}</button>` : ''}</div>`).join('')}</div>`;
}
async function sharePayload(p) {
  const server = ownedFor(p.id);
  const cats = [];
  for (const c of p.cats) {
    const e = { id: c.id, name: c.name };
    if (c.sex) e.sex = c.sex;
    if (c.neuter) e.neuter = c.neuter;
    if (c.health && c.health.length) e.health = c.health.slice(0, 30);
    const onServer = server && server.cats.find(x => x.id === c.id && x.photo);
    if (onServer) e.keep = true;
    else { const s = photoSrc(c); if (s) { const j = await smallJpeg(s); if (j) e.photo = j; } }
    cats.push(e);
  }
  return { nid: p.id, name: p.name, lat: p.lat, lng: p.lng, memo: p.memo || '', times: p.times.map(t => t.t), cats };
}
async function pushShare(p, quiet) {
  const r = await AU().share('upsert', await sharePayload(p));
  if (r.error) { if (!quiet) toast(r.message || '공유하지 못했어요'); return null; }
  const i = SH.owned.findIndex(s => s.id === r.share.id);
  if (i >= 0) SH.owned[i] = r.share; else SH.owned.push(r.share);
  return r.share;
}
const syncTimers = {};
function syncShareSoon(p) {
  if (!p || !canShare() || !ownedFor(p.id)) return;
  clearTimeout(syncTimers[p.id]);
  syncTimers[p.id] = setTimeout(() => pushShare(p, true), 800);
}
function hydratePhotos() {
  if (!AU()) return;
  document.querySelectorAll('[data-photo]').forEach(async el => {
    const k = el.dataset.photo; const [sid, f] = k.split('/'); if (!f) return;
    photoCache[k] = photoCache[k] || AU().sharePhoto(sid, f);
    const u = await photoCache[k];
    if (u) { el.style.backgroundImage = `url('${u}')`; el.style.backgroundSize = 'cover'; el.style.backgroundPosition = 'center'; }
  });
}

function shareScreen() {
  const head = `<header class="topbar"><div><div class="brand">함께 돌보기</div><div class="where">급식소를 이웃과 나누고, 밥 주기를 부탁해요</div></div></header>`;
  if (!AU() || !AU().configured) return head + `<div class="pad"><div class="empty">서버가 연결되지 않은 테스트 버전이라 공유를 쓸 수 없어요.</div></div>`;
  if (!AU().user()) return head + `<div class="pad"><div class="empty">로그인하면 급식소를 공유하고 밥 주기를 부탁할 수 있어요.</div><button class="btn primary" data-act="logout">로그인하기</button></div>`;
  if (!SH.loaded) { loadShares(true); return head + `<div class="pad"><div class="empty">불러오는 중…</div></div>`; }

  const forMe = [];
  SH.joined.forEach(s => s.requests.forEach(q => { if (q.status === 'pending' && q.for_me) forMe.push({ s, q }); }));
  const unshared = S.points.filter(p => !ownedFor(p.id));
  const reqBox = forMe.length ? `<section style="display:flex;flex-direction:column;gap:10px"><h3 class="h-sec">받은 부탁 ${forMe.length}건</h3>
    ${forMe.map(({ s, q }) => `<div class="card req">
      <div><b>${esc(s.owner_name)} 님이 밥 주기를 부탁했어요</b><div class="small muted">${esc(s.name)} · ${reqRange(q)}${q.note ? ` · “${esc(q.note)}”` : ''}</div></div>
      <div class="row"><button class="btn sm" style="flex:1" data-act="reqRespond" data-v="${q.id}" data-a="0">어려워요</button><button class="btn sm primary" style="flex:1" data-act="reqRespond" data-v="${q.id}" data-a="1">맡을게요</button></div></div>`).join('')}</section>` : '';

  const ownedList = SH.owned.length ? `<div class="list">${SH.owned.map(s => {
      const open = s.requests.filter(q => q.status === 'pending' || q.status === 'accepted');
      return `<button class="li sli" data-act="openShared" data-v="${s.id}"><div class="sl"><b>${esc(s.name)}</b><span class="small muted">${s.member_count}명과 공유${open.length ? ` · 부탁 ${open.length}건` : ''} · ${lastFed(s)}</span></div>${I.back.replace('m15 18-6-6 6-6', 'm9 18 6-6-6-6')}</button>`;
    }).join('')}</div>` : `<div class="empty" style="padding:14px 8px">아직 공유한 급식소가 없어요</div>`;
  const joinedList = SH.joined.length ? `<div class="list">${SH.joined.map(s => `<button class="li sli" data-act="openShared" data-v="${s.id}"><div class="sl"><b>${esc(s.name)}</b><span class="small muted">${esc(s.owner_name)} 님의 급식소 · ${lastFed(s)}</span></div>${I.back.replace('m15 18-6-6 6-6', 'm9 18 6-6-6-6')}</button>`).join('')}</div>`
    : `<div class="empty" style="padding:14px 8px">초대 코드를 받으면 이웃의 급식소를 함께 볼 수 있어요</div>`;

  return head + `<div class="pad">
    ${SH.error ? `<div class="card"><span class="small" style="color:var(--warn-ink)">${esc(SH.error)}</span><button class="btn sm" data-act="reloadShares">다시 불러오기</button></div>` : ''}
    ${reqBox}
    <section style="display:flex;flex-direction:column;gap:10px">
      <div class="between"><h3 class="h-sec">내가 공유한 급식소</h3>${unshared.length ? `<button class="linkbtn" data-act="sharePick">+ 공유하기</button>` : ''}</div>
      ${ownedList}
      ${!S.points.length ? `<p class="small muted" style="margin:0">지도에서 급식소를 먼저 등록해 주세요.</p>` : ''}
    </section>
    <section style="display:flex;flex-direction:column;gap:10px">
      <div class="between"><h3 class="h-sec">공유받은 급식소</h3><button class="linkbtn" data-act="joinAsk">+ 초대 코드 입력</button></div>
      ${joinedList}
    </section>
    <div class="store"><div class="ic">${I.lock}</div><div><b>공유한 사람에게만 보여요</b><span class="small muted">급식소 위치·이름·밥 시간·고양이 이름과 작게 줄인 사진만 보여요. 원본 사진은 이 휴대폰에만 있어요.</span></div></div>
  </div>`;
}

function sharedScreen() {
  const s = shareById(R.shareId);
  if (!s) { R.screen = null; return shareScreen(); }
  const reqs = s.requests.filter(q => s.owner || q.status !== 'cancelled');
  const reqHtml = reqs.length ? reqs.map(q => `<div class="time" style="min-height:64px">
      <div style="display:flex;flex-direction:column;min-width:0"><b>${reqRange(q)} · ${q.helper ? esc(q.helper) + ' 님' : '누구든'}</b>
        <span class="small ${q.status === 'accepted' ? '' : 'muted'}" style="${q.status === 'accepted' ? 'color:var(--accent);font-weight:600' : ''}">${REQ_STATUS[q.status] || q.status}${q.note ? ` · “${esc(q.note)}”` : ''}</span></div>
      ${s.owner && (q.status === 'pending' || q.status === 'accepted') ? `<button class="btn sm" data-act="reqCancel" data-v="${q.id}">취소</button>` : ''}
      ${!s.owner && q.status === 'pending' && q.for_me ? `<div class="row"><button class="btn sm" data-act="reqRespond" data-v="${q.id}" data-a="0">어려워요</button><button class="btn sm primary" data-act="reqRespond" data-v="${q.id}" data-a="1">맡을게요</button></div>` : ''}
    </div>`).join('') : `<div class="empty" style="padding:12px 0">${s.owner ? '여행이나 출장 갈 때 밥 주기를 부탁해 보세요' : '받은 부탁이 없어요'}</div>`;
  const members = s.owner ? `<section class="card" style="gap:0">
      <div class="between" style="padding-bottom:4px"><h3 class="h-sec">함께 보는 사람 ${s.member_count}명</h3><button class="linkbtn" data-act="invite" data-v="${s.id}">+ 초대하기</button></div>
      ${s.members.length ? s.members.map(m => `<div class="time"><div style="display:flex;flex-direction:column"><b>${esc(m.nickname)}</b><span class="small muted">${fmtAgo(m.joined_at)} 참여</span></div><button class="btn sm" data-act="kickAsk" data-v="${m.id}" data-s="${s.id}" data-n="${esc(m.nickname)}">내보내기</button></div>`).join('')
        : `<div class="empty" style="padding:12px 0">초대 코드를 보내면 이웃이 참여할 수 있어요</div>`}
    </section>` : '';
  return `<div class="navbar"><button class="back" data-act="back" aria-label="뒤로">${I.back}</button><h1>${s.owner ? '내가 공유한 급식소' : '공유받은 급식소'}</h1>
    <button class="back" data-act="shareMenu" data-v="${s.id}" aria-label="공유 메뉴">${I.more}</button></div>
  <div class="pad">
    <div style="display:flex;flex-direction:column;gap:8px">
      <h2 class="h-display">${esc(s.name)}</h2>
      <div class="row" style="flex-wrap:wrap;gap:6px"><span class="chip">${s.owner ? `${s.member_count}명과 공유 중` : `${esc(s.owner_name)} 님의 급식소`}</span>${s.times.map(t => `<span class="chip ghost">${t}</span>`).join('')}</div>
      ${s.memo ? `<p class="muted" style="margin:0">${esc(s.memo)}</p>` : ''}
    </div>
    ${s.cats.length ? `<section style="display:flex;flex-direction:column;gap:10px"><h3 class="h-sec">찾아오는 고양이 ${s.cats.length}마리</h3>
      <div class="cats">${s.cats.map((c, i) => `<button class="cat" data-act="sharedCat" data-s="${s.id}" data-v="${esc(c.id)}"><div class="ph" data-photo="${c.photo ? s.id + '/' + c.photo : ''}" style="background:${CAT_COLORS[i % CAT_COLORS.length]}"></div><b>${esc(c.name)}</b>${catTag(c)}</button>`).join('')}</div></section>` : ''}
    <section class="card" style="gap:0">
      <div class="between" style="padding-bottom:4px"><h3 class="h-sec">밥 부탁</h3>${s.owner && s.member_count ? `<button class="linkbtn" data-act="reqAsk" data-v="${s.id}">+ 부탁하기</button>` : ''}</div>
      ${reqHtml}
    </section>
    ${members}
    <section class="card" style="gap:0">
      <h3 class="h-sec" style="padding-bottom:4px">밥 준 기록</h3>
      ${s.logs.length ? s.logs.slice(0, 10).map(l => `<div class="time" style="min-height:48px"><span><b>${esc(l.by)}</b>${l.mine ? ' (나)' : ''}${l.note ? ` · ${esc(l.note)}` : ''}</span><span class="small muted">${fmtAgo(l.at)}</span></div>`).join('')
        : `<div class="empty" style="padding:12px 0">‘밥 줬어요’를 누르면 함께 보는 사람 모두에게 기록이 보여요</div>`}
    </section>
  </div>
  <div class="actions"><button class="btn" data-act="sharedOnMap" data-v="${s.id}">지도에서 보기</button><button class="btn primary" data-act="fedAsk" data-v="${s.id}">밥 줬어요</button></div>`;
}

const SA = {
  reloadShares() { SH.loaded = false; render(); },
  openShared(v) { R.shareId = Number(v); R.screen = 'shared'; render(); $('#view').scrollTop = 0; loadShares(true); },
  sharedOnMap(v) { const s = shareById(v); if (!s) return; R.screen = null; R.tab = 'map'; S.filters.shared = true; save(); render(); syncOverlays(); mapCenterTo(s.lat, s.lng); },
  sharePick() {
    const list = S.points.filter(p => !ownedFor(p.id));
    sheet(`<h2>어느 급식소를 공유할까요?</h2>
      <div class="list">${list.map(p => `<button class="li sli" data-act="shareAsk" data-v="${p.id}"><div class="sl"><b>${esc(p.name)}</b><span class="small muted">고양이 ${p.cats.length}마리 · 밥 시간 ${p.times.length}개</span></div></button>`).join('')}</div>`);
  },
  shareAsk(v) {
    const p = pt(v); if (!p) return;
    if (!canShare()) { toast('로그인해야 공유할 수 있어요'); return; }
    sheet(`<h2>${esc(p.name)} 급식소를 공유할까요?</h2>
      <p class="muted" style="margin:0;line-height:1.6">초대 코드를 받은 사람만 볼 수 있어요. 언제든 공유를 끝내면 서버에서 바로 지워져요.</p>
      <div class="card" style="gap:8px">
        <div class="row">${I.ok}<span>급식소 위치와 이름, 밥 시간</span></div>
        <div class="row">${I.ok}<span>고양이 이름과 <b>작게 줄인 사진</b> (사진 속 위치 정보는 빼요)</span></div>
        <div class="row muted">${I.lock}<span>원본 사진과 공유하지 않은 급식소는 이 휴대폰에만</span></div>
      </div>
      <button class="btn primary" data-act="shareStart" data-v="${p.id}">공유 시작하기</button><button class="btn" data-act="closeSheet">취소</button>`);
  },
  async shareStart(v, el) {
    const p = pt(v); if (!p) return;
    el.disabled = true; el.textContent = '사진을 줄여서 올리는 중…';
    const s = await pushShare(p);
    if (!s) { el.disabled = false; el.textContent = '공유 시작하기'; return; }
    render();
    await SA.invite(s.id);
  },
  async invite(v) {
    const s = shareById(v); if (!s) return;
    const r = await AU().share('invite', { share_id: s.id });
    if (r.error) { toast(r.message); return; }
    const days = Math.max(1, Math.round((r.expires_at - nowSec()) / 86400));
    sheet(`<h2>초대 코드</h2>
      <div class="code" aria-label="초대 코드">${esc(r.code.slice(0, 3))}<span></span>${esc(r.code.slice(3))}</div>
      <p class="small muted" style="margin:0;text-align:center">${days}일 동안 쓸 수 있어요 · 여러 명에게 보내도 돼요</p>
      <button class="btn primary" data-act="sendInvite" data-v="${s.id}" data-c="${esc(r.code)}">카톡·문자로 보내기</button>
      <button class="btn" data-act="copyInvite" data-v="${s.id}" data-c="${esc(r.code)}">초대 문구 복사</button>`);
  },
  async sendInvite(v, el) {
    const s = shareById(v), code = el.dataset.c;
    const text = inviteText(s, code);
    if (isNative && P.Share) { try { await P.Share.share({ title: "냥's 키친 초대", text, dialogTitle: '초대 보내기' }); return; } catch (e) { if (/cancel/i.test(String(e && e.message))) return; } }
    if (navigator.share) { try { await navigator.share({ text }); return; } catch (e) { return; } }
    SA.copyInvite(v, el);
  },
  async copyInvite(v, el) {
    const s = shareById(v), text = inviteText(s, el.dataset.c);
    try { await navigator.clipboard.writeText(text); toast('복사했어요. 카톡이나 문자에 붙여넣으세요'); }
    catch (e) { toast(`초대 코드: ${el.dataset.c}`); }
  },
  joinAsk(code) {
    if (!canShare()) { toast('로그인해야 참여할 수 있어요'); return; }
    sheet(`<h2>초대 코드 입력</h2><p class="muted" style="margin:0">이웃에게 받은 6자리 코드를 넣어주세요.</p>
      <div class="field"><label for="joinCode">초대 코드</label><input id="joinCode" value="${esc(code || '')}" placeholder="예: K7P-Q2M" maxlength="9" autocapitalize="characters" autocomplete="off" spellcheck="false" style="font-size:22px;letter-spacing:4px;text-transform:uppercase"></div>
      <button class="btn primary" data-act="joinGo">참여하기</button>`);
    if (!code) setTimeout(() => { const i = $('#joinCode'); if (i) i.focus(); }, 250);
  },
  async joinGo(v, el) {
    const code = ($('#joinCode').value || '').replace(/[^0-9a-z]/gi, '').toUpperCase();
    if (code.length !== 6) { toast('코드 6자리를 확인해 주세요'); return; }
    el.disabled = true;
    const r = await AU().share('join', { code });
    el.disabled = false;
    if (r.error) { toast(r.message); return; }
    const i = SH.joined.findIndex(s => s.id === r.share.id);
    if (i >= 0) SH.joined[i] = r.share; else SH.joined.push(r.share);
    closeSheet(); R.tab = 'share'; SA.openShared(r.share.id);
    toast(`${r.share.owner_name} 님의 급식소에 참여했어요`);
  },
  fedAsk(v) {
    const s = shareById(v); if (!s) return;
    sheet(`<h2>${esc(s.name)}에 밥 줬어요</h2>
      <div class="field"><label for="fedNote">한마디 (선택)</label><input id="fedNote" maxlength="60" placeholder="예: 치즈가 다 먹고 갔어요"></div>
      <button class="btn primary" data-act="fedGo" data-v="${s.id}">기록하기</button>`);
  },
  async fedGo(v, el) {
    el.disabled = true;
    const r = await AU().share('fed', { share_id: Number(v), note: ($('#fedNote').value || '').trim() });
    if (r.error) { el.disabled = false; toast(r.message); return; }
    closeSheet(); toast('기록했어요. 함께 보는 사람 모두에게 보여요'); await loadShares(true);
  },
  reqAsk(v) {
    const s = shareById(v); if (!s) return;
    const t = new Date(), e = new Date(Date.now() + 2 * 86400000);
    sheet(`<h2>밥 주기 부탁하기</h2>
      <div class="row"><div class="field" style="flex:1"><label for="rqS">시작</label><input id="rqS" type="date" value="${ymd(t)}" min="${ymd(t)}"></div>
        <div class="field" style="flex:1"><label for="rqE">끝</label><input id="rqE" type="date" value="${ymd(e)}" min="${ymd(t)}"></div></div>
      <div class="field"><label for="rqH">누구에게</label><select id="rqH"><option value="0">함께 보는 누구든 (먼저 수락한 사람)</option>${s.members.map(m => `<option value="${m.id}">${esc(m.nickname)}</option>`).join('')}</select></div>
      <div class="field"><label for="rqN">부탁 메모 (선택)</label><input id="rqN" maxlength="100" placeholder="예: 출장이라 저녁 한 번만 부탁해요"></div>
      <button class="btn primary" data-act="reqSend" data-v="${s.id}">부탁 보내기</button>`);
  },
  async reqSend(v, el) {
    const start = $('#rqS').value, end = $('#rqE').value;
    if (!start || !end || end < start) { toast('날짜를 확인해 주세요'); return; }
    el.disabled = true;
    const r = await AU().share('request', { share_id: Number(v), helper_id: Number($('#rqH').value || 0), start, end, note: ($('#rqN').value || '').trim() });
    el.disabled = false;
    if (r.error) { toast(r.message); return; }
    closeSheet(); toast('부탁을 보냈어요. 상대가 앱을 열면 보여요'); await loadShares(true);
  },
  async reqRespond(v, el) {
    const accept = el.dataset.a === '1';
    const r = await AU().share('respond', { id: Number(v), accept });
    if (r.error) { toast(r.message); await loadShares(true); return; }
    toast(accept ? '맡아주셔서 고마워요!' : '어렵다고 전했어요'); await loadShares(true);
  },
  async reqCancel(v) {
    const r = await AU().share('cancel', { id: Number(v) });
    if (r.error) { toast(r.message); return; }
    toast('부탁을 취소했어요'); await loadShares(true);
  },
  kickAsk(v, el) {
    sheet(`<h2>${esc(el.dataset.n)} 님을 내보낼까요?</h2><p class="muted" style="margin:0">이 급식소를 더 이상 볼 수 없어요. 다시 초대하면 참여할 수 있어요.</p>
      <button class="btn danger" data-act="kickGo" data-v="${v}" data-s="${el.dataset.s}">내보내기</button><button class="btn" data-act="closeSheet">취소</button>`);
  },
  async kickGo(v, el) {
    const r = await AU().share('kick', { share_id: Number(el.dataset.s), user_id: Number(v) });
    if (r.error) { toast(r.message); return; }
    closeSheet(); toast('내보냈어요'); await loadShares(true);
  },
  shareMenu(v) {
    const s = shareById(v); if (!s) return;
    sheet(s.owner
      ? `<h2>공유 관리</h2><button class="btn" data-act="invite" data-v="${s.id}">초대 코드 다시 보기</button>
         <button class="btn danger" data-act="endShareAsk" data-v="${s.id}">공유 끝내기</button>`
      : `<h2>공유받은 급식소</h2><button class="btn danger" data-act="leaveShare" data-v="${s.id}">이 급식소에서 나가기</button><button class="btn" data-act="closeSheet">닫기</button>`);
  },
  endShareAsk(v) {
    const s = shareById(v);
    sheet(`<h2>공유를 끝낼까요?</h2><p class="muted" style="margin:0;line-height:1.6">${s.member_count}명이 더 이상 볼 수 없고, 서버에 올린 정보와 작은 사진, 부탁·밥 기록이 모두 지워져요. 이 휴대폰의 급식소와 원본 사진은 그대로예요.</p>
      <button class="btn danger" data-act="endShare" data-v="${v}">공유 끝내기</button><button class="btn" data-act="closeSheet">취소</button>`);
  },
  async endShare(v) {
    const r = await AU().share('delete', { share_id: Number(v) });
    if (r.error) { toast(r.message); return; }
    SH.owned = SH.owned.filter(s => s.id !== Number(v));
    closeSheet(); R.screen = null; render(); toast('공유를 끝냈어요');
  },
  async leaveShare(v) {
    const r = await AU().share('leave', { share_id: Number(v) });
    if (r.error) { toast(r.message); return; }
    SH.joined = SH.joined.filter(s => s.id !== Number(v));
    closeSheet(); R.screen = null; render(); syncOverlays(); toast('나왔어요');
  }
};
function inviteText(s, code) {
  return `냥's 키친에서 '${s ? s.name : '급식소'}'를 함께 돌봐요 🐾\n초대 코드: ${code}\n앱에서 열기: ${SITE}/join.html?c=${code}`;
}
// 초대 링크(com.nyangskitchen.app://join?c=CODE)로 앱이 열렸을 때
let pendingJoin = null;
async function handleJoinLink(url) {
  if (!url || !/^com\.nyangskitchen\.app:\/\/join/i.test(url)) return;
  let code = '';
  try { code = new URL(url).searchParams.get('c') || ''; } catch (e) {}
  pendingJoin = code;
  await introDone;
  if (AU()) await AU().ready;
  if (pendingJoin === null) return;
  const c = pendingJoin; pendingJoin = null;
  A.tab('share'); SA.joinAsk(c);
}

/* ---------- 급식소 서버 백업 (선택 동의) ----------
   동의하면 급식소 이름·위치·밥 시간·고양이 이름만 서버에 백업한다. 사진은 올리지 않는다.
   휴대폰을 바꿔도 복원되고, 운영자가 확인한 유실 신고가 있을 때 근처 급식소 주인으로 알림을 받는다. */
const BK = { consent: null, count: 0, checked: false, timer: null };
function backupPayload() {
  return { points: S.points.map(p => ({ nid: p.id, name: p.name, lat: p.lat, lng: p.lng, times: p.times.map(t => ({ t: t.t, label: t.label })), cats: p.cats.map(c => ({ name: c.name })) })) };
}
function backupSoon() {
  if (BK.consent !== true || !canShare()) return;
  clearTimeout(BK.timer);
  BK.timer = setTimeout(async () => { const r = await AU().backup('sync', backupPayload()); if (!r.error) BK.count = r.count; }, 2500);
}
async function checkBackup() {
  if (!canShare()) return;
  const r = await AU().backup('status', null, 'GET');
  if (r.error) return;
  BK.consent = r.consent; BK.count = r.count; BK.checked = true;
  if (BK.consent === null && !S.backupAsked) { backupConsentSheet(); return; }
  if (BK.consent === true && !S.points.length && BK.count) { restoreAskSheet(); return; }
  if (BK.consent === true) backupSoon();
}
function backupConsentSheet() {
  sheet(`<h2>급식소를 서버에 백업할까요?</h2>
    <p class="muted" style="margin:0;line-height:1.6">선택이에요. 켜지 않아도 앱은 그대로 쓸 수 있어요.</p>
    <div class="card" style="gap:8px">
      <div class="row">${I.ok}<span><b>휴대폰을 바꿔도</b> 급식소가 그대로 돌아와요</span></div>
      <div class="row">${I.ok}<span>근처에서 고양이를 잃어버린 신고가 오면 <b>탐정모드로 알림</b>을 받아요</span></div>
    </div>
    <div class="store"><div class="ic">${I.lock}</div><div><b>무엇이 올라가나요</b><span class="small muted">급식소 이름·위치·밥 시간·고양이 이름만 올라가요. 사진은 올리지 않아요. 운영자만 볼 수 있고, 다른 사용자에게는 위치가 보이지 않아요. 유실 신고를 확인할 때만 근처 급식소를 찾아요. 언제든 설정에서 끄면 서버에서 바로 지워져요.</span></div></div>
    <button class="btn primary" data-act="backupOn">동의하고 백업 켜기</button>
    <button class="btn" data-act="backupLater">지금은 휴대폰에만 둘게요</button>
    <a class="small muted" style="text-align:center" href="${PRIVACY_URL}" target="_blank" rel="noopener">개인정보처리방침 보기</a>`);
}
function restoreAskSheet() {
  sheet(`<h2>백업된 급식소 ${BK.count}곳이 있어요</h2><p class="muted" style="margin:0;line-height:1.6">이 휴대폰으로 불러올까요? 고양이 사진은 백업하지 않아서 이름만 돌아와요.</p>
    <button class="btn primary" data-act="restoreGo">불러오기</button><button class="btn" data-act="closeSheet">나중에</button>`);
}
const BA = {
  async backupOn() {
    const r = await AU().backup('consent', { on: true });
    if (r.error) { toast(r.message); return; }
    BK.consent = true; S.backupAsked = true; save(); closeSheet();
    if (!S.points.length && BK.count) { restoreAskSheet(); return; }
    const s = await AU().backup('sync', backupPayload());
    if (!s.error) BK.count = s.count;
    toast(`급식소 ${S.points.length}곳을 백업했어요`); render();
  },
  async backupLater() {
    S.backupAsked = true; save(); closeSheet();
    await AU().backup('consent', { on: false });
    BK.consent = false; toast('급식소는 이 휴대폰에만 둘게요. 설정에서 언제든 켤 수 있어요');
  },
  async backupToggle(v, el) {
    if (el.checked) { el.checked = false; backupConsentSheet(); return; }
    const r = await AU().backup('consent', { on: false });
    if (r.error) { el.checked = true; toast(r.message); return; }
    BK.consent = false; BK.count = 0; S.backupAsked = true; save(); toast('백업을 끄고 서버의 급식소 기록을 지웠어요');
  },
  async restoreGo() {
    const r = await AU().backup('restore', null, 'GET');
    if (r.error) { toast(r.message); return; }
    let added = 0;
    for (const bp of r.points) {
      if (S.points.some(p => p.id === bp.nid)) continue;
      const p = { id: bp.nid, name: bp.name, lat: bp.lat, lng: bp.lng,
        times: bp.times.map(t => ({ id: uid(), t: t.t, label: t.label || '급식', alarm: true, nid: 0, doneDate: '' })),
        cats: bp.cats.map((n, i) => ({ id: uid(), name: n, color: CAT_COLORS[i % CAT_COLORS.length], photo: null })) };
      S.points.push(p); added++;
    }
    save(); closeSheet(); render(); syncOverlays(); toast(`급식소 ${added}곳을 불러왔어요`);
    for (const p of S.points) for (const t of p.times) if (t.alarm) await scheduleAlarm(p, t);
  }
};

/* ---------- 탐정모드 ----------
   1) 보호자가 유실 신고  2) 운영자가 확인  3) 유실 지점 50m → 100m 안 급식소 주인에게 알림
   4) 주인이 '봤어요/못 봤어요' 답장  5) 보호자는 답장과 알린 곳 수만 본다 (급식소 위치는 보이지 않음) */
const LS = { loaded: false, loading: false, mine: [], nearby: [], unread: 0, error: '' };
const LF = { name: '', desc: '', date: '', contact: '', photo: null, lat: null, lng: null };
async function loadLost(quiet) {
  if (!canShare()) { LS.loaded = true; LS.mine = []; LS.nearby = []; LS.unread = 0; return; }
  if (LS.loading) return;
  LS.loading = true;
  const r = await AU().lost('list', null, 'GET');
  LS.loading = false; LS.loaded = true;
  if (r.error) { LS.error = r.message; if (!quiet) toast(r.message); }
  else { LS.error = ''; LS.mine = r.mine; LS.nearby = r.nearby; LS.unread = r.unread; }
  render();
}
function lostPhotoEl(id, has) {
  return has ? `<div class="lph" data-lostphoto="${id}"></div>` : `<div class="lph none">${I.search}</div>`;
}
function hydrateLostPhotos() {
  if (!AU()) return;
  document.querySelectorAll('[data-lostphoto]').forEach(async el => {
    const k = 'lost/' + el.dataset.lostphoto;
    photoCache[k] = photoCache[k] || AU().blobUrl(`lost.php?action=photo&id=${encodeURIComponent(el.dataset.lostphoto)}`);
    const u = await photoCache[k];
    if (u) el.style.backgroundImage = `url('${u}')`;
  });
}
function detectiveScreen() {
  const head = `<header class="topbar"><div><div class="brand">탐정모드</div><div class="where">잃어버린 고양이를 동네 급식소와 함께 찾아요</div></div></header>`;
  if (!AU() || !AU().configured) return head + `<div class="pad"><div class="empty">서버가 연결되지 않은 테스트 버전이라 탐정모드를 쓸 수 없어요.</div></div>`;
  if (!AU().user()) return head + `<div class="pad"><div class="empty">로그인하면 탐정모드를 쓸 수 있어요.</div><button class="btn primary" data-act="logout">로그인하기</button></div>`;
  if (!LS.loaded) { loadLost(true); return head + `<div class="pad"><div class="empty">불러오는 중…</div></div>`; }
  LS.nearby.filter(n => n.new).forEach(n => { n.new = false; AU().lost('opened', { lost_id: n.id }); });
  if (LS.unread) { LS.unread = 0; setTimeout(renderTabs, 0); }

  const nearby = LS.nearby.length ? `<section style="display:flex;flex-direction:column;gap:10px"><h3 class="h-sec">내 급식소 근처에서 찾는 고양이 ${LS.nearby.length}</h3>
    ${LS.nearby.map(n => `<div class="card lostcard">
      <div class="row" style="align-items:flex-start;gap:12px">${lostPhotoEl(n.id, n.photo)}
        <div style="display:flex;flex-direction:column;gap:3px;min-width:0"><b style="font-size:17px">${esc(n.cat_name)}</b>
          <span class="small" style="color:var(--warn-ink);font-weight:600">내 급식소 ‘${esc(n.point_name)}’에서 ${n.meters}m</span>
          <span class="small muted">${fmtDate(n.lost_date)} 잃어버림 · ${esc(n.reporter)} 님</span></div></div>
      ${n.description ? `<p style="margin:0;line-height:1.6">${esc(n.description)}</p>` : ''}
      ${n.contact ? `<span class="small">보호자 연락처: <b>${esc(n.contact)}</b></span>` : ''}
      ${n.my_reply ? `<span class="small muted">내 답장: ${n.my_reply.seen ? '봤어요' : '못 봤어요'}${n.my_reply.note ? ` · ${esc(n.my_reply.note)}` : ''} (${fmtAgo(n.my_reply.at)})</span>` : ''}
      <div class="row"><button class="btn sm" style="flex:1" data-act="lostReply" data-v="${n.id}" data-s="0">못 봤어요</button><button class="btn sm primary" style="flex:1" data-act="lostReply" data-v="${n.id}" data-s="1">봤어요</button></div>
    </div>`).join('')}</section>` : '';

  const mine = LS.mine.length ? `<section style="display:flex;flex-direction:column;gap:10px"><h3 class="h-sec">내 유실 신고</h3>
    ${LS.mine.map(m => `<div class="card lostcard">
      <div class="row" style="align-items:flex-start;gap:12px">${lostPhotoEl(m.id, m.photo)}
        <div style="display:flex;flex-direction:column;gap:3px;min-width:0"><b style="font-size:17px">${esc(m.cat_name)}</b>
          <span class="chip ${m.status === 'active' ? '' : 'ghost'}" style="align-self:flex-start">${esc(m.status_text)}</span>
          <span class="small muted">${fmtDate(m.lost_date)} 잃어버림 · ${fmtAgo(m.created_at)} 신고</span></div></div>
      ${m.status === 'pending' ? `<span class="small muted">운영자가 신고 내용을 확인하고 있어요. 확인되면 잃어버린 곳 50m 안 급식소부터 알려요.</span>` : ''}
      ${m.status === 'active' ? `<span class="small">${m.radius}m 안 급식소 주인 <b>${m.counts.notified}명</b>에게 알렸어요 · ${m.counts.opened}명 확인</span>` : ''}
      ${m.status === 'rejected' && m.admin_note ? `<span class="small" style="color:var(--warn-ink)">운영자 메모: ${esc(m.admin_note)}</span>` : ''}
      ${m.replies.length ? `<div class="list" style="padding:0 12px">${m.replies.map(r => `<div class="li" style="min-height:52px;align-items:flex-start;padding:8px 0;flex-direction:column;gap:2px"><b>${r.seen ? '👀 봤어요' : '못 봤어요'} · ${esc(r.by)} 님${r.meters != null ? ` (급식소가 ${r.meters}m 거리)` : ''}</b>${r.note ? `<span>${esc(r.note)}</span>` : ''}<span class="small muted">${fmtAgo(r.at)}</span></div>`).join('')}</div>` : (m.status === 'active' ? `<span class="small muted">아직 답장이 없어요. 답장이 오면 여기에 보여요.</span>` : '')}
      ${m.status === 'pending' || m.status === 'active' ? `<div class="row"><button class="btn sm" style="flex:1" data-act="lostClose" data-v="${m.id}" data-f="0">신고 닫기</button><button class="btn sm primary" style="flex:1" data-act="lostClose" data-v="${m.id}" data-f="1">찾았어요!</button></div>` : ''}
      ${m.status === 'pending' || m.status === 'active' ? '' : `<button class="btn sm danger" data-act="lostDelAsk" data-v="${m.id}">${I.trash} 신고 기록 지우기</button>`}
    </div>`).join('')}</section>` : '';

  const backupHint = BK.consent !== true ? `<div class="card"><b>근처 유실묘 알림을 받으려면</b><span class="small muted">급식소 서버 백업을 켜면, 내 급식소 근처에서 고양이를 잃어버린 신고가 확인됐을 때 이 화면에서 알려드려요.</span><button class="btn sm" data-act="backupAsk">급식소 백업 켜기</button></div>` : '';
  return head + `<div class="pad">
    ${LS.error ? `<div class="card"><span class="small" style="color:var(--warn-ink)">${esc(LS.error)}</span><button class="btn sm" data-act="reloadLost">다시 불러오기</button></div>` : ''}
    <button class="btn primary" data-act="lostNew">${I.search} 고양이를 잃어버렸어요</button>
    ${nearby}${mine}
    ${!nearby && !mine ? `<div class="card" style="gap:12px"><h3 class="h-sec">이렇게 찾아요</h3>
      <ol class="steps"><li><b>유실 신고</b> 사진, 특징, 잃어버린 곳을 알려주세요.</li><li><b>운영자 확인</b> 신고 내용을 확인해요.</li><li><b>50m → 100m</b> 잃어버린 곳 가까운 급식소 주인부터 차례로 알려요.</li><li><b>‘봤어요’ 답장</b> 급식소 주인의 답장이 이 화면에 와요.</li></ol>
      <span class="small muted">급식소 위치는 고양이 안전을 위해 신고한 분께도 보이지 않아요. 대신 급식소 주인이 본 곳과 시간을 답장으로 알려줘요.</span></div>` : ''}
    ${backupHint}
  </div>`;
}
function lostFormScreen() {
  const loc = LF.lat != null ? `${LF.lat.toFixed(5)}, ${LF.lng.toFixed(5)}` : '아직 정하지 않았어요';
  return `<div class="navbar"><button class="back" data-act="back" aria-label="뒤로">${I.back}</button><h1>유실 신고</h1></div>
  <div class="pad">
    <div class="row" style="gap:14px;align-items:center">
      <button class="lph pick" data-act="lostPhoto" style="${LF.photo ? `background-image:url('${LF.photo}')` : ''}">${LF.photo ? '' : `${I.plus}<span>사진</span>`}</button>
      <span class="small muted" style="line-height:1.6">얼굴과 무늬가 잘 보이는 사진이면 좋아요. 작게 줄여서 올려요.</span>
    </div>
    <div class="field"><label for="lfName">고양이 이름</label><input id="lfName" maxlength="30" value="${esc(LF.name)}" placeholder="예: 까망이"></div>
    <div class="field"><label for="lfDesc">특징</label><textarea id="lfDesc" maxlength="500" rows="4" placeholder="예: 검은 털, 빨간 목걸이, 겁이 많아요">${esc(LF.desc)}</textarea></div>
    <div class="field"><label for="lfDate">잃어버린 날</label><input id="lfDate" type="date" value="${esc(LF.date || ymd(new Date()))}" max="${ymd(new Date())}"></div>
    <div class="field"><label>잃어버린 곳</label><div class="card" style="gap:8px"><span>${loc}</span>
      <div class="row"><button class="btn sm" style="flex:1" data-act="lostHere">지금 내 위치</button><button class="btn sm" style="flex:1" data-act="lostPickMap">지도에서 고르기</button></div></div></div>
    <div class="field"><label for="lfContact">연락처 (선택)</label><input id="lfContact" maxlength="60" value="${esc(LF.contact)}" placeholder="적으면 알림 받은 급식소 주인에게 보여요"></div>
    <p class="small muted" style="margin:0;line-height:1.6">신고 내용(사진·이름·특징·날짜, 적은 경우 연락처)은 운영자와, 운영자가 확인한 뒤 알림을 받는 근처 급식소 주인에게만 보여요.</p>
  </div>
  <div class="actions"><button class="btn primary" data-act="lostSubmit">신고하기</button></div>`;
}
function readLostForm() {
  const g = id => { const e = $(id); return e ? e.value : ''; };
  if ($('#lfName')) { LF.name = g('#lfName').trim(); LF.desc = g('#lfDesc').trim(); LF.date = g('#lfDate'); LF.contact = g('#lfContact').trim(); }
}
function mapCenterLatLng() {
  if (!kmap) return null;
  if (engine === 'kakao') { const c = kmap.getCenter(); return { lat: c.getLat(), lng: c.getLng() }; }
  const c = kmap.getCenter(); return { lat: c.lat, lng: c.lng };
}
const LA = {
  reloadLost() { LS.loaded = false; render(); },
  backupAsk() { backupConsentSheet(); },
  lostNew() { Object.assign(LF, { name: '', desc: '', date: ymd(new Date()), contact: '', photo: null, lat: null, lng: null }); R.screen = 'lostForm'; render(); $('#view').scrollTop = 0; },
  async lostPhoto() {
    readLostForm();
    const ph = await pickPhoto(); if (!ph) return;
    const src = ph.dataUrl || `data:image/${ph.format};base64,${ph.base64}`;
    LF.photo = await smallJpeg(src); render();
  },
  async lostHere() {
    readLostForm(); toast('내 위치를 찾는 중…');
    const p = await getPosition();
    if (!p) { toast('위치를 찾지 못했어요. 지도에서 골라주세요'); return; }
    LF.lat = p.lat; LF.lng = p.lng; render();
  },
  lostPickMap() { readLostForm(); R.picking = true; R.screen = null; R.tab = 'map'; R.sel = null; render(); syncOverlays(); if (LF.lat != null) mapCenterTo(LF.lat, LF.lng); },
  pickConfirm() { const c = mapCenterLatLng(); if (c) { LF.lat = c.lat; LF.lng = c.lng; } R.picking = false; R.tab = 'detective'; R.screen = 'lostForm'; render(); },
  pickCancel() { R.picking = false; R.tab = 'detective'; R.screen = 'lostForm'; render(); },
  async lostSubmit(v, el) {
    readLostForm();
    if (!LF.name) { toast('고양이 이름을 적어주세요'); return; }
    if (LF.lat == null) { toast('잃어버린 곳을 정해주세요'); return; }
    el.disabled = true; el.textContent = '보내는 중…';
    const r = await AU().lost('report', { cat_name: LF.name, description: LF.desc, photo: LF.photo, lat: LF.lat, lng: LF.lng, lost_date: LF.date, contact: LF.contact });
    if (r.error) { el.disabled = false; el.textContent = '신고하기'; toast(r.message); return; }
    R.screen = null; R.tab = 'detective'; LS.loaded = false; render();
    toast('신고했어요. 운영자가 확인하면 근처 급식소에 알려요');
  },
  lostReply(v, el) {
    const seen = el.dataset.s === '1';
    sheet(`<h2>${seen ? '봤어요! 언제, 어디서 봤나요?' : '못 봤어요'}</h2>
      <div class="field"><label for="lrNote">${seen ? '본 시간과 장소, 상태' : '한마디 (선택)'}</label><textarea id="lrNote" rows="3" maxlength="300" placeholder="${seen ? '예: 오늘 저녁 7시쯤 급식소 옆 화단에서 밥 먹고 갔어요' : '예: 급식소에 오면 바로 알려드릴게요'}"></textarea></div>
      <button class="btn primary" data-act="lostReplyGo" data-v="${v}" data-s="${seen ? 1 : 0}">보호자에게 보내기</button>`);
  },
  async lostReplyGo(v, el) {
    el.disabled = true;
    const r = await AU().lost('reply', { lost_id: Number(v), seen: el.dataset.s === '1', note: ($('#lrNote').value || '').trim() });
    if (r.error) { el.disabled = false; toast(r.message); return; }
    closeSheet(); toast('보호자에게 전했어요. 고마워요!'); await loadLost(true);
  },
  lostDelAsk(v) {
    sheet(`<h2>신고 기록을 지울까요?</h2><p class="muted" style="margin:0;line-height:1.6">사진과 받은 답장까지 서버에서 바로 지워지고 되돌릴 수 없어요. 지우지 않아도 끝난 신고는 90일 뒤 자동으로 지워져요.</p>
      <button class="btn danger" data-act="lostDel" data-v="${v}">지우기</button><button class="btn" data-act="closeSheet">취소</button>`);
  },
  async lostDel(v) {
    const r = await AU().lost('delete', { lost_id: Number(v) });
    if (r.error) { toast(r.message); return; }
    LS.mine = LS.mine.filter(m => m.id !== Number(v)); closeSheet(); render(); toast('신고 기록을 지웠어요');
  },
  async lostClose(v, el) {
    const found = el.dataset.f === '1';
    const r = await AU().lost('close', { lost_id: Number(v), found });
    if (r.error) { toast(r.message); return; }
    toast(found ? '다행이에요! 신고를 닫았어요' : '신고를 닫았어요'); await loadLost(true);
  }
};

/* ---------- 이웃 게시판 ----------
   글·사진·댓글은 서버에 올라가 앱을 쓰는 모든 사람이 볼 수 있다.
   위치는 '동네 표시'를 켰을 때만 100m 단위로 줄여 올리고, 다른 사람에게는 동네 이름과 대략 거리만 보인다.
   신고(3명이면 자동 숨김)·차단·내 글 지우기를 지원한다. */
const BOARD_CATS = { report: '제보', info: '정보', ask: '질문', free: '자유' };
const BOARD_HINT = {
  report: '예: 망원시장 뒷골목에서 다리를 저는 치즈냥을 봤어요. 오늘 저녁 7시쯤이에요.',
  info: '예: 동물병원 길고양이 중성화(TNR) 신청 방법 공유해요',
  ask: '예: 겨울 급식소 물이 얼지 않게 하는 방법 있을까요?',
  free: '동네 고양이 이야기를 자유롭게 나눠요'
};
const BD = { loaded: false, loading: false, error: '', posts: [], next: null, unread: 0, mode: 'near', cat: '', pos: null, posTried: false, post: null, comments: [], postLoading: false };
const BF = { cat: 'report', body: '', photos: [], loc: true };

async function boardPos() {
  // 위치 권한은 이웃 탭을 열었을 때만 묻는다. 그 전에는 지도 중심이나 내 급식소로 대신한다.
  // 서버에는 목록을 고를 때 약 1km 단위(소수 둘째 자리)로만 보낸다.
  if (!BD.posGps && !BD.posTried && R.tab === 'board') {
    BD.posTried = true;
    const p = await getPosition();
    if (p) { BD.pos = p; BD.posGps = true; }
  }
  if (!BD.pos && S.center && S.center.lat) BD.pos = { lat: S.center.lat, lng: S.center.lng };
  if (!BD.pos && S.points.length) BD.pos = { lat: S.points[0].lat, lng: S.points[0].lng };
  return BD.pos;
}
async function loadBoard(more) {
  if (!canShare() || BD.loading) return;
  BD.loading = true;
  const pos = await boardPos();
  if (BD.mode === 'near' && !pos) { BD.mode = 'all'; }
  const q = { cat: BD.cat === 'mine' ? '' : BD.cat, mine: BD.cat === 'mine' ? 1 : '', near: BD.mode === 'near' ? 1 : '', lat: pos ? pos.lat.toFixed(2) : '', lng: pos ? pos.lng.toFixed(2) : '', before: more ? BD.next : '' };
  const r = await AU().board('list', null, 'GET', q);
  BD.loading = false; BD.loaded = true;
  if (r.error) { BD.error = r.message; }
  else { BD.error = ''; BD.posts = more ? BD.posts.concat(r.posts) : r.posts; BD.next = r.next; BD.unread = r.unread; }
  if (R.tab === 'board' && !R.screen) render(); else renderTabs();
}
async function loadPost(id) {
  BD.postLoading = true;
  const pos = BD.pos;
  const r = await AU().board('post', null, 'GET', { id, lat: pos ? pos.lat.toFixed(2) : '', lng: pos ? pos.lng.toFixed(2) : '' });
  BD.postLoading = false;
  if (r.error) { toast(r.message); BD.post = null; R.screen = null; BD.posts = BD.posts.filter(p => p.id !== Number(id)); render(); return; }
  BD.post = r.post; BD.comments = r.comments;
  const li = BD.posts.find(p => p.id === r.post.id); if (li) li.comments = r.post.comments;
  if (r.post.mine && BD.unread) { BD.unread = 0; loadBoard(); }
  if (R.screen === 'post') render();
}
const bphoto = (pid, f, cls) => `<div class="${cls || 'bph'}" data-bphoto="${pid}/${esc(f)}"></div>`;
function hydrateBoardPhotos() {
  if (!AU()) return;
  document.querySelectorAll('[data-bphoto]').forEach(async el => {
    const [id, f] = el.dataset.bphoto.split('/');
    const k = 'board/' + el.dataset.bphoto;
    photoCache[k] = photoCache[k] || AU().blobUrl(`board.php?action=photo&id=${encodeURIComponent(id)}&f=${encodeURIComponent(f)}`);
    const u = await photoCache[k];
    if (u) { el.style.backgroundImage = `url('${u}')`; el.dataset.src = u; }
  });
}
function postMeta(p) {
  return [p.area || '', p.dist || '', fmtAgo(p.created_at)].filter(Boolean).map(esc).join(' · ');
}
function boardCard(p) {
  const ph = p.photos.slice(0, 3);
  return `<button class="card post" data-act="openPost" data-v="${p.id}">
    <div class="between"><span class="chip ${p.cat === 'report' ? 'warnchip' : ''}">${esc(p.cat_name)}</span><span class="small muted">${postMeta(p)}</span></div>
    ${p.hidden ? `<span class="small" style="color:var(--warn-ink)">신고가 쌓여 다른 이웃에게는 숨겨졌어요. 운영자가 확인하고 있어요.</span>` : ''}
    ${p.body ? `<p class="pbody">${esc(p.body)}</p>` : ''}
    ${ph.length ? `<div class="pthumbs">${ph.map((f, i) => `<div class="bthumb" data-bphoto="${p.id}/${esc(f)}">${i === 2 && p.photos.length > 3 ? `<span>+${p.photos.length - 3}</span>` : ''}</div>`).join('')}</div>` : ''}
    <div class="between"><span class="small muted">${esc(p.author)}${p.mine ? ' (나)' : ''}</span><span class="small muted row" style="gap:4px">${I.chatS}${p.comments}</span></div>
  </button>`;
}
function boardScreen() {
  const head = `<header class="topbar"><div><div class="brand">이웃</div><div class="where">동네 집사들과 제보·정보를 나눠요</div></div>${canShare() ? `<button class="iconbtn" data-act="boardReload" aria-label="새로고침">${I.refresh}</button>` : ''}</header>`;
  if (!AU() || !AU().configured) return head + `<div class="pad"><div class="empty">서버가 연결되지 않은 테스트 버전이라 게시판을 쓸 수 없어요.</div></div>`;
  if (!AU().user()) return head + `<div class="pad"><div class="empty">로그인하면 동네 이웃과 글을 나눌 수 있어요.</div><button class="btn primary" data-act="logout">로그인하기</button></div>`;
  if (!BD.loaded) { loadBoard(); return head + `<div class="pad"><div class="empty">불러오는 중…</div></div>`; }
  const cats = [['', '전체'], ['report', '제보'], ['info', '정보'], ['ask', '질문'], ['free', '자유'], ['mine', '내 글']];
  return head + `<div class="pad" style="gap:14px">
    <div class="seg" role="group" aria-label="보기 범위"><button data-act="boardMode" data-v="near" aria-pressed="${BD.mode === 'near'}">내 근처 5km</button><button data-act="boardMode" data-v="all" aria-pressed="${BD.mode === 'all'}">전체</button></div>
    <div class="catrow" role="group" aria-label="글 종류">${cats.map(([k, l]) => `<button data-act="boardCat" data-v="${k}" aria-pressed="${BD.cat === k}">${l}</button>`).join('')}</div>
    <button class="btn primary" data-act="postNew">${I.pen} 글쓰기</button>
    ${BD.error ? `<div class="card"><span class="small" style="color:var(--warn-ink)">${esc(BD.error)}</span><button class="btn sm" data-act="boardReload">다시 불러오기</button></div>` : ''}
    ${BD.posts.length ? BD.posts.map(boardCard).join('') : `<div class="empty">${BD.mode === 'near' ? '5km 안에 아직 글이 없어요.<br>첫 소식을 남겨보세요!' : '아직 글이 없어요.'}</div>`}
    ${BD.next ? `<button class="btn" data-act="boardMore">더 보기</button>` : ''}
  </div>`;
}
function postScreen() {
  const p = BD.post;
  const nav = `<div class="navbar"><button class="back" data-act="back" aria-label="뒤로">${I.back}</button><h1>이웃 글</h1>${p ? `<button class="back" data-act="postMenu" aria-label="글 메뉴">${I.more}</button>` : ''}</div>`;
  if (!p) return nav + `<div class="pad"><div class="empty">불러오는 중…</div></div>`;
  return nav + `<div class="pad" style="gap:14px">
    <div class="between"><span class="chip ${p.cat === 'report' ? 'warnchip' : ''}">${esc(p.cat_name)}</span><span class="small muted">${postMeta(p)}</span></div>
    <b>${esc(p.author)}${p.mine ? ' (나)' : ''}</b>
    ${p.hidden ? `<div class="card"><span class="small" style="color:var(--warn-ink)">신고가 쌓여 다른 이웃에게는 숨겨졌어요. 운영자가 확인한 뒤 다시 보이거나 지워져요.</span></div>` : ''}
    ${p.body ? `<p class="pbody full">${esc(p.body)}</p>` : ''}
    ${p.photos.map(f => `<button class="bbig" data-act="photoView" data-bphoto="${p.id}/${esc(f)}" aria-label="사진 크게 보기"></button>`).join('')}
    <section class="card" style="gap:0">
      <h3 class="h-sec" style="padding-bottom:4px">댓글 ${BD.comments.length}</h3>
      ${BD.comments.length ? BD.comments.map(c => `<div class="cmt">
        <div class="between"><b class="small">${esc(c.author)}${c.by_writer ? ' <span class="chip" style="padding:1px 6px;font-size:10px">글쓴이</span>' : ''}${c.mine ? ' (나)' : ''}</b>
          <div class="row" style="gap:0"><span class="small muted">${fmtAgo(c.created_at)}</span><button class="iconsm" data-act="cmtMenu" data-v="${c.id}" aria-label="댓글 메뉴">${I.more}</button></div></div>
        ${c.hidden ? `<span class="small" style="color:var(--warn-ink)">신고로 숨겨진 댓글이에요 (나에게만 보여요)</span>` : ''}
        <p>${esc(c.body)}</p></div>`).join('') : `<div class="empty" style="padding:12px 0">첫 댓글을 남겨보세요</div>`}
    </section>
  </div>
  ${p.hidden ? '' : `<div class="actions cmtbar"><input id="cmtInput" maxlength="500" placeholder="댓글을 적어주세요" aria-label="댓글"><button class="btn primary" data-act="cmtSend">등록</button></div>`}`;
}
function postFormScreen() {
  return `<div class="navbar"><button class="back" data-act="back" aria-label="뒤로">${I.back}</button><h1>글쓰기</h1></div>
  <div class="pad" style="gap:16px">
    <div class="seg" role="group" aria-label="글 종류">${Object.entries(BOARD_CATS).map(([k, l]) => `<button data-act="bfCat" data-v="${k}" aria-pressed="${BF.cat === k}">${l}</button>`).join('')}</div>
    <div class="field"><label for="bfBody">내용</label><textarea id="bfBody" rows="7" maxlength="2000" placeholder="${esc(BOARD_HINT[BF.cat])}">${esc(BF.body)}</textarea></div>
    <div class="field"><label>사진 (최대 4장)</label>
      <div class="pgrid">${BF.photos.map((s, i) => `<div class="pthumb" style="background-image:url('${s}')"><button data-act="bfDelPhoto" data-v="${i}" aria-label="사진 ${i + 1} 빼기">×</button></div>`).join('')}
        ${BF.photos.length < 4 ? `<button class="addcat" data-act="bfAddPhoto">${I.plus}사진</button>` : ''}</div>
      <span class="small muted">사진은 줄여서 올리고, 사진 속 위치 정보(GPS)는 지워요.</span></div>
    <div class="card"><div class="between"><span><b>동네 표시</b></span>${sw('bfLoc', BF.loc, 'bfLoc')}</div>
      <span class="small muted">${BF.loc ? '지금 위치로 동네 이름(예: 망원1동)만 보여요. 정확한 위치는 다른 이웃에게 보이지 않아요.' : '위치 없이 올려요. ‘내 근처’ 목록에는 나오지 않아요.'}</span></div>
    <div class="store"><div class="ic">${I.warn}</div><div><b>고양이를 지켜주세요</b><span class="small muted">급식소의 정확한 위치, 집 주소, 전화번호는 적지 마세요. 학대가 의심되면 112나 지자체 동물보호 담당에 먼저 신고해 주세요.</span></div></div>
  </div>
  <div class="actions"><button class="btn primary" data-act="postSubmit">올리기</button></div>`;
}
function readPostForm() { const e = $('#bfBody'); if (e) BF.body = e.value; }
// 게시판용 사진: 긴 변 1280px JPEG, 450KB를 넘지 않게 화질을 낮춘다 (캔버스로 다시 그려 사진 속 위치 정보도 빠진다)
function boardJpeg(src) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1280 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      try {
        for (const q of [0.8, 0.7, 0.6, 0.5, 0.4]) { const d = c.toDataURL('image/jpeg', q); if (d.length < 590000) return res(d); }
        res(null);
      } catch (e) { res(null); }
    };
    img.onerror = () => res(null);
    img.src = src;
  });
}
// 여러 장 고르기 (앱: 앨범 여러 장 또는 카메라, 웹: 파일 여러 개)
async function pickPhotos(max) {
  if (isNative && P.Camera) {
    const how = await new Promise(res => {
      window.__pickHow = res;
      sheet(`<h2>사진 추가</h2><button class="btn primary" data-act="pickHow" data-v="album">앨범에서 고르기 (여러 장)</button><button class="btn" data-act="pickHow" data-v="camera">사진 찍기</button><button class="btn" data-act="pickHow" data-v="">취소</button>`);
    });
    closeSheet();
    if (!how) return [];
    try {
      if (how === 'camera') {
        const r = await P.Camera.getPhoto({ quality: 85, width: 1600, correctOrientation: true, resultType: 'base64', source: 'CAMERA', saveToGallery: false });
        return [`data:image/${r.format || 'jpeg'};base64,${r.base64String}`];
      }
      const r = await P.Camera.pickImages({ quality: 85, width: 1600, correctOrientation: true, limit: max });
      return (r.photos || []).slice(0, max).map(p => p.webPath);
    } catch (e) {
      if (!/cancel|no image/i.test(String(e && e.message))) toast('사진을 가져오지 못했어요. 사진 권한을 확인해 주세요');
      return [];
    }
  }
  return new Promise(res => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true; inp.hidden = true;
    document.body.appendChild(inp);
    inp.onchange = async () => {
      const files = Array.from(inp.files || []).slice(0, max);
      const out = await Promise.all(files.map(f => new Promise(r => { const rd = new FileReader(); rd.onload = () => r(rd.result); rd.onerror = () => r(null); rd.readAsDataURL(f); })));
      inp.remove(); res(out.filter(Boolean));
    };
    inp.click();
  });
}
function rulesSheet(then) {
  sheet(`<h2>이웃 게시판 약속</h2>
    <div class="card" style="gap:8px">
      <div class="row" style="align-items:flex-start">${I.ok}<span>서로 존중해요. 욕설·비방·혐오 표현은 지워요.</span></div>
      <div class="row" style="align-items:flex-start">${I.ok}<span>급식소의 <b>정확한 위치</b>나 연락처·주소는 올리지 않아요. 고양이를 해치려는 사람이 볼 수 있어요.</span></div>
      <div class="row" style="align-items:flex-start">${I.ok}<span>광고·판매·분양 글, 동물 학대 장면은 올리지 않아요.</span></div>
      <div class="row" style="align-items:flex-start">${I.ok}<span>문제 있는 글은 <b>신고</b>해 주세요. 3명이 신고하면 바로 숨겨지고 운영자가 확인해요. 보기 싫은 이웃은 <b>차단</b>할 수 있어요.</span></div>
    </div>
    <p class="small muted" style="margin:0;line-height:1.6">올린 글과 사진은 앱을 쓰는 모든 이웃이 볼 수 있어요. 약속을 어기면 운영자가 글을 지우거나 이용을 제한할 수 있어요.</p>
    <button class="btn primary" data-act="rulesOk" data-v="${then || ''}">약속할게요</button>`);
}
const BDA = {
  boardReload() { BD.loaded = false; BD.posts = []; render(); },
  boardMore() { loadBoard(true); },
  boardMode(v) { BD.mode = v; BD.loaded = false; render(); },
  boardCat(v) { BD.cat = v; BD.loaded = false; render(); },
  openPost(v) { BD.post = null; BD.comments = []; R.postId = Number(v); R.screen = 'post'; render(); $('#view').scrollTop = 0; loadPost(v); },
  postNew() {
    if (!S.boardRules) { rulesSheet('postNew'); return; }
    Object.assign(BF, { cat: BD.cat && BOARD_CATS[BD.cat] ? BD.cat : 'report', body: '', photos: [], loc: true });
    R.screen = 'postForm'; render(); $('#view').scrollTop = 0;
  },
  rulesOk(v) { S.boardRules = true; save(); closeSheet(); if (v === 'postNew') BDA.postNew(); },
  pickHow(v) { if (window.__pickHow) { const f = window.__pickHow; window.__pickHow = null; f(v); } },
  bfCat(v) { readPostForm(); BF.cat = v; render(); },
  bfLoc(v, el) { readPostForm(); BF.loc = el.checked; render(); },
  bfDelPhoto(v) { readPostForm(); BF.photos.splice(Number(v), 1); render(); },
  async bfAddPhoto() {
    readPostForm();
    const srcs = await pickPhotos(4 - BF.photos.length);
    if (!srcs.length) return;
    toast('사진을 줄이는 중…');
    for (const s of srcs) { const j = await boardJpeg(s); if (j && BF.photos.length < 4) BF.photos.push(j); }
    render();
  },
  async postSubmit(v, el) {
    readPostForm();
    const body = BF.body.trim();
    if (!body && !BF.photos.length) { toast('내용을 적거나 사진을 넣어주세요'); return; }
    el.disabled = true; el.textContent = '올리는 중…';
    let lat, lng;
    if (BF.loc) { const p = await getPosition(); if (p) { lat = Math.round(p.lat * 1000) / 1000; lng = Math.round(p.lng * 1000) / 1000; BD.pos = p; BD.posGps = true; } else toast('위치를 찾지 못해 동네 표시 없이 올려요'); }
    const r = await AU().board('write', { cat: BF.cat, body, photos: BF.photos, lat, lng });
    if (r.error) { el.disabled = false; el.textContent = '올리기'; toast(r.message); return; }
    if (BF.photos.length && r.photos < BF.photos.length) toast(`사진 ${BF.photos.length - r.photos}장은 올리지 못했어요`);
    else toast('올렸어요');
    BD.cat = ''; if (lat === undefined) BD.mode = 'all';
    R.screen = null; BD.loaded = false; render();
  },
  async cmtSend(v, el) {
    const inp = $('#cmtInput'); const body = (inp.value || '').trim();
    if (!body) { inp.focus(); return; }
    el.disabled = true;
    const r = await AU().board('comment', { post_id: BD.post.id, body });
    el.disabled = false;
    if (r.error) { toast(r.message); return; }
    inp.value = ''; await loadPost(BD.post.id);
    setTimeout(() => { const v2 = $('#view'); v2.scrollTop = v2.scrollHeight; }, 50);
  },
  photoView(v, el) {
    const u = el.dataset.src; if (!u) return;
    sheet(`<img src="${u}" alt="" style="width:100%;border-radius:12px;display:block"><button class="btn" data-act="closeSheet">닫기</button>`);
  },
  postMenu() {
    const p = BD.post; if (!p) return;
    sheet(p.mine
      ? `<h2>내 글</h2><button class="btn danger" data-act="postDelAsk">글 지우기</button><button class="btn" data-act="closeSheet">닫기</button>`
      : `<h2>${esc(p.author)} 님의 글</h2><button class="btn" data-act="reportAsk" data-v="post:${p.id}">신고하기</button><button class="btn danger" data-act="blockAsk" data-v="${p.author_id}" data-n="${esc(p.author)}">이 이웃 차단하기</button><button class="btn" data-act="closeSheet">닫기</button>`);
  },
  postDelAsk() {
    sheet(`<h2>글을 지울까요?</h2><p class="muted" style="margin:0">사진과 댓글도 함께 지워지고 되돌릴 수 없어요.</p><button class="btn danger" data-act="postDel">지우기</button><button class="btn" data-act="closeSheet">취소</button>`);
  },
  async postDel() {
    const id = BD.post.id;
    const r = await AU().board('delete', { post_id: id });
    if (r.error) { toast(r.message); return; }
    closeSheet(); BD.posts = BD.posts.filter(p => p.id !== id); R.screen = null; render(); toast('글을 지웠어요');
  },
  cmtMenu(v) {
    const c = BD.comments.find(x => x.id === Number(v)); if (!c) return;
    sheet(c.mine
      ? `<h2>내 댓글</h2><button class="btn danger" data-act="cmtDel" data-v="${c.id}">댓글 지우기</button><button class="btn" data-act="closeSheet">닫기</button>`
      : `<h2>${esc(c.author)} 님의 댓글</h2><button class="btn" data-act="reportAsk" data-v="comment:${c.id}">신고하기</button><button class="btn danger" data-act="blockAsk" data-v="${c.author_id}" data-n="${esc(c.author)}">이 이웃 차단하기</button><button class="btn" data-act="closeSheet">닫기</button>`);
  },
  async cmtDel(v) {
    const r = await AU().board('delete_comment', { comment_id: Number(v) });
    if (r.error) { toast(r.message); return; }
    closeSheet(); toast('댓글을 지웠어요'); await loadPost(BD.post.id);
  },
  reportAsk(v) {
    const reasons = ['욕설·비방', '광고·스팸', '급식소 위치·개인정보 노출', '동물 학대·불쾌한 사진', '거짓 정보', '기타'];
    sheet(`<h2>왜 신고하나요?</h2><div class="list">${reasons.map(r => `<button class="li sli" data-act="reportGo" data-v="${v}" data-r="${r}"><span>${r}</span></button>`).join('')}</div>
      <p class="small muted" style="margin:0">신고한 사람은 상대에게 알려지지 않아요. 3명이 신고하면 바로 숨겨지고 운영자가 확인해요.</p>`);
  },
  async reportGo(v, el) {
    const [kind, id] = v.split(':');
    const r = await AU().board('report', { kind, id: Number(id), reason: el.dataset.r });
    if (r.error) { toast(r.message); return; }
    closeSheet(); toast('신고했어요. 운영자가 확인할게요');
  },
  blockAsk(v, el) {
    sheet(`<h2>${esc(el.dataset.n)} 님을 차단할까요?</h2><p class="muted" style="margin:0;line-height:1.6">이 이웃의 글과 댓글이 나에게 보이지 않고, 이 이웃은 내 글에 댓글을 달 수 없어요. 상대에게는 알리지 않아요. 설정에서 언제든 풀 수 있어요.</p>
      <button class="btn danger" data-act="blockGo" data-v="${v}">차단하기</button><button class="btn" data-act="closeSheet">취소</button>`);
  },
  async blockGo(v) {
    const r = await AU().board('block', { user_id: Number(v) });
    if (r.error) { toast(r.message); return; }
    closeSheet(); toast('차단했어요');
    BD.posts = BD.posts.filter(p => p.author_id !== Number(v));
    if (R.screen === 'post' && BD.post && BD.post.author_id === Number(v)) { R.screen = null; render(); }
    else if (R.screen === 'post') loadPost(BD.post.id);
    else render();
  },
  async blocksSheet() {
    const r = await AU().board('blocks', null, 'GET');
    if (r.error) { toast(r.message); return; }
    sheet(`<h2>차단한 이웃</h2>${r.blocks.length ? `<div class="list">${r.blocks.map(b => `<div class="li"><span>${esc(b.nickname)}</span><button class="btn sm" data-act="unblock" data-v="${b.id}">차단 풀기</button></div>`).join('')}</div>` : `<div class="empty">차단한 이웃이 없어요</div>`}
      <button class="btn" data-act="closeSheet">닫기</button>`);
  },
  async unblock(v) {
    const r = await AU().board('unblock', { user_id: Number(v) });
    if (r.error) { toast(r.message); return; }
    toast('차단을 풀었어요'); BD.loaded = false; BDA.blocksSheet();
  }
};

/* ---------- actions ---------- */
const A = {
  tab(v) { R.tab = v; R.screen = null; R.adding = false; R.picking = false; if (v === 'board' && !BD.posTried) BD.loaded = false; render(); $('#view').scrollTop = 0; if (v === 'schedule' && !CH.loaded) loadChuru(); },
  back() { R.screen = null; render(); },
  scrim(v, el, e) { if (e.target === el) closeSheet(); },
  closeSheet() { closeSheet(); },
  settings() { settingsSheet(); },
  filter(v) { S.filters[v] = S.filters[v] === false ? true : !S.filters[v]; save(); syncOverlays(); renderMapUi(); },
  locate() { toast('내 위치를 찾는 중…'); locate(false); },
  startAdd() { R.adding = true; R.sel = null; syncOverlays(); renderMapUi(); },
  cancelAdd() { R.adding = false; renderMapUi(); },
  kind(v) {
    layer.querySelectorAll('#kind button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
    $('#kindHint').textContent = v === 'zone' ? '민원이나 급식 금지 안내가 있는 곳이에요. 반경 40m로 표시돼요.' : '저녁 6시 급식 알람이 기본으로 맞춰져요. 포인트 화면에서 바꿀 수 있어요.';
    $('#newName').placeholder = v === 'zone' ? '예: 급식 주의 구역' : '예: 골목 화단';
  },
  async confirmAdd() {
    const kind = layer.querySelector('#kind [aria-pressed="true"]').dataset.v;
    const name = $('#newName').value.trim();
    if (kind === 'zone') {
      S.zones.push({ id: uid(), lat: addAt.lat, lng: addAt.lng, radius: 40, label: name || '급식 주의 구역' });
      S.filters.zone = true; R.adding = false; save(); closeSheet(); syncOverlays(); renderMapUi(); toast('급식 주의 구역을 표시했어요'); return;
    }
    if (!name) { $('#newName').focus(); toast('포인트 이름을 적어주세요'); return; }
    const p = { id: uid(), name, lat: addAt.lat, lng: addAt.lng, times: [{ id: uid(), t: '18:00', label: '저녁', alarm: true, nid: 0, doneDate: '' }], cats: [] };
    S.points.push(p); S.filters.mine = true; R.adding = false; R.sel = p.id; save(); closeSheet(); syncOverlays(); renderMapUi();
    toast(`${name} 포인트를 등록했어요`);
    await scheduleAlarm(p, p.times[0]);
  },
  open(v) { R.pointId = v; R.screen = 'point'; render(); $('#view').scrollTop = 0; },
  showOnMap(v) { const p = pt(v); R.screen = null; R.tab = 'map'; R.sel = v; render(); mapCenterTo(p.lat, p.lng); syncOverlays(); },
  feed(v) { const p = pt(v), n = nextTime(p); if (!n) return; n.doneDate = today(); save(); render(); syncOverlays(); toast(`${p.name} ${n.t} 급식 완료!`); },
  toggleDone(v, el) { const p = pt(el.dataset.p), t = p.times.find(x => x.id === v); t.doneDate = isDone(t) ? '' : today(); save(); render(); },
  async alarm(v, el) { const p = pt(el.dataset.p), t = p.times.find(x => x.id === v); t.alarm = el.checked; save(); await scheduleAlarm(p, t); toast(t.alarm ? `매일 ${t.t} 알람을 켰어요` : `${t.t} 알람을 껐어요`); },
  addTime() {
    sheet(`<h2>급식 시간 추가</h2><div class="field"><label for="ntime">시간</label><input id="ntime" type="time" value="08:00"></div>
      <div class="field"><label for="nlabel">이름</label><input id="nlabel" value="아침" maxlength="10"></div><button class="btn primary" data-act="saveTime">추가하기</button>`);
  },
  async saveTime() {
    const p = pt(R.pointId); const tv = $('#ntime').value || '08:00';
    const t = { id: uid(), t: tv, label: $('#nlabel').value.trim() || '급식', alarm: true, nid: 0, doneDate: '' };
    p.times.push(t); save(); closeSheet(); render(); await scheduleAlarm(p, t); toast(`매일 ${tv} 알람을 맞췄어요`);
  },
  async delTime(v, el) { const p = pt(el.dataset.p), t = p.times.find(x => x.id === v); await cancelAlarm(t); p.times = p.times.filter(x => x.id !== v); save(); render(); toast(`${t.t} 급식 시간을 지웠어요`); },
  async addCat() {
    const ph = await pickPhoto(); if (!ph) return;
    pendingPhoto = ph;
    const preview = ph.dataUrl || `data:image/${ph.format};base64,${ph.base64}`;
    sheet(`<h2>고양이 등록</h2><div style="width:120px;height:120px;border-radius:16px;background:url('${preview}') center/cover"></div>
      <div class="field"><label for="catName">이름</label><input id="catName" placeholder="예: 치즈" maxlength="12"></div>
      <div class="store"><div class="ic">${I.phone}</div><div><b>원본은 이 휴대폰에만 저장돼요</b><span class="small muted">앱 전용 저장 공간에 보관해요</span></div></div>
      <button class="btn primary" data-act="saveCat">저장하기</button>`);
  },
  async saveCat() {
    const p = pt(R.pointId); const id = uid();
    try {
      const photo = await storePhoto(id, pendingPhoto);
      p.cats.push({ id, name: $('#catName').value.trim() || '새 친구', color: CAT_COLORS[p.cats.length % CAT_COLORS.length], photo });
      pendingPhoto = null; save(); closeSheet(); render(); toast('원본 사진을 이 휴대폰에 저장했어요');
    } catch (e) { toast('사진을 저장하지 못했어요'); }
  },
  catMenu(v) {
    const p = pt(R.pointId), c = p.cats.find(x => x.id === v); const src = photoSrc(c);
    CD = { id: c.id, sex: c.sex || '', neuter: c.neuter || '', health: (c.health || []).slice(), kind: 'vet' };
    sheet(`<div class="cat-head">${src ? `<div class="cat-thumb" style="background-image:url('${src}')"></div>` : `<div class="cat-thumb" style="background:${c.color || CAT_COLORS[0]}"></div>`}
        <div class="field" style="flex:1"><label for="catRename">이름</label><input id="catRename" value="${esc(c.name)}" maxlength="12"></div></div>
      ${segHtml('sex', '성별', SEX_OPTS, CD.sex)}
      ${segHtml('neuter', '중성화', NEUTER_OPTS, CD.neuter)}
      <section class="health"><div class="between"><h3 class="h-sec">건강 기록</h3><span class="small muted">함께 보는 사람에게도 보여요</span></div>
        <div id="healthList">${healthList(CD.health, true)}</div>
        <div class="health-add">
          <div class="catrow" role="group" aria-label="기록 종류">${HEALTH_KINDS.map(([k, l]) => `<button data-act="healthKind" data-v="${k}" aria-pressed="${k === CD.kind}">${l}</button>`).join('')}</div>
          <div class="row" style="gap:8px"><input type="date" id="hDate" value="${ymd(new Date())}" max="${ymd(new Date())}" aria-label="날짜">
            <input id="hText" maxlength="80" placeholder="예: 안약 넣음" aria-label="내용" style="flex:1"></div>
          <button class="btn sm" data-act="addHealth">${I.plus} 기록 추가</button>
        </div></section>
      <button class="btn primary" data-act="saveCatInfo" data-v="${c.id}">저장하기</button>
      <button class="btn danger" data-act="delCat" data-v="${c.id}">이 고양이 지우기</button>`);
  },
  catSeg(v, el) {
    CD[el.dataset.k] = v;
    el.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === el)));
  },
  healthKind(v, el) { CD.kind = v; el.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === el))); },
  addHealth() {
    const t = $('#hText').value.trim(), d = $('#hDate').value;
    if (!t) { $('#hText').focus(); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { toast('날짜를 골라 주세요'); return; }
    CD.health.unshift({ d, k: CD.kind, t }); CD.health.sort((a, b) => b.d.localeCompare(a.d)); CD.health = CD.health.slice(0, 30);
    $('#hText').value = ''; $('#healthList').innerHTML = healthList(CD.health, true);
  },
  delHealth(v) { CD.health.splice(Number(v), 1); $('#healthList').innerHTML = healthList(CD.health, true); },
  saveCatInfo(v) {
    const p = pt(R.pointId), c = p.cats.find(x => x.id === v);
    const t = $('#hText') && $('#hText').value.trim();
    if (t) A.addHealth();   // 입력만 하고 '기록 추가'를 안 눌렀어도 저장
    c.name = $('#catRename').value.trim() || c.name;
    c.sex = CD.sex; c.neuter = CD.neuter; c.health = CD.health;
    save(); syncShareSoon(p); closeSheet(); render(); toast('저장했어요');
  },
  sharedCat(v, el) {
    const sh = shareById(Number(el.dataset.s)); const c = sh && sh.cats.find(x => String(x.id) === v); if (!c) return;
    const sx = SEX_OPTS.find(o => o[0] === (c.sex || '')), nt = NEUTER_OPTS.find(o => o[0] === (c.neuter || ''));
    sheet(`<h2>${esc(c.name)}</h2>
      <div class="row" style="gap:6px;flex-wrap:wrap"><span class="chip ghost">성별 · ${sx[1]}</span><span class="chip ${c.neuter === 'yes' ? '' : 'ghost'}">중성화 · ${nt[1]}</span></div>
      <section class="health"><h3 class="h-sec">건강 기록</h3>${healthList(c.health || [], false)}</section>
      <p class="small muted" style="margin:0">기록은 급식소 주인이 남겨요.</p>`);
  },
  async delCat(v) { const p = pt(R.pointId), c = p.cats.find(x => x.id === v); await deletePhoto(c); p.cats = p.cats.filter(x => x.id !== v); save(); closeSheet(); render(); toast('사진과 기록을 지웠어요'); },
  pointMenu() {
    const p = pt(R.pointId);
    sheet(`<h2>포인트 관리</h2><div class="field"><label for="pRename">이름 바꾸기</label><input id="pRename" value="${esc(p.name)}" maxlength="20"></div>
      <button class="btn primary" data-act="renamePoint">이름 저장</button>
      <button class="btn danger" data-act="delPointAsk">이 포인트 지우기</button>`);
  },
  renamePoint() { const p = pt(R.pointId); p.name = $('#pRename').value.trim() || p.name; save(); closeSheet(); render(); syncOverlays(); },
  delPointAsk() {
    const p = pt(R.pointId);
    sheet(`<h2>${esc(p.name)} 포인트를 지울까요?</h2><p class="muted" style="margin:0">고양이 사진 ${p.cats.length}장과 알람 ${p.times.length}개도 함께 지워져요. 되돌릴 수 없어요.</p>
      <button class="btn danger" data-act="delPoint">지우기</button><button class="btn" data-act="closeSheet">취소</button>`);
  },
  async delPoint() {
    const p = pt(R.pointId);
    for (const t of p.times) await cancelAlarm(t);
    for (const c of p.cats) await deletePhoto(c);
    S.points = S.points.filter(x => x.id !== p.id); if (R.sel === p.id) R.sel = null;
    save(); closeSheet(); R.screen = null; render(); syncOverlays(); toast('포인트를 지웠어요');
  },
  delZone(v) { S.zones = S.zones.filter(z => z.id !== v); save(); closeSheet(); syncOverlays(); renderMapUi(); toast('구역 표시를 지웠어요'); },
  retryMap() { mapState = 'idle'; engine = null; loadMap(); },
  saveKey2() {
    S.kakaoKey = $('#keyInput2').value.trim(); save(); closeSheet();
    if (kakaoKey()) { toast('카카오 지도로 바꾸는 중…'); loadKakao(kakaoKey()); }
    else { toast('기본 지도를 써요'); initLeaflet(); }
  },
  testNotif() { closeSheet(); testNotification(); },
  async logout() { closeSheet(); if (window.NK_AUTH) await window.NK_AUTH.signOut(); },
  deleteAccountAsk() {
    sheet(`<h2>회원탈퇴할까요?</h2><p class="muted" style="margin:0;line-height:1.6">계정과 로그인 정보가 서버에서 바로 지워지고 되돌릴 수 없어요.</p>
      <label class="auth-check"><input type="checkbox" id="delLocal" checked><span>이 휴대폰의 급식 기록과 고양이 사진도 함께 지우기</span></label>
      <button class="btn danger" data-act="deleteAccount">탈퇴하기</button><button class="btn" data-act="closeSheet">취소</button>`);
  },
  async deleteAccount() {
    const alsoLocal = $('#delLocal') && $('#delLocal').checked;
    const r = await window.NK_AUTH.deleteAccount();
    if (r.error) { toast(r.error); return; }
    closeSheet();
    if (alsoLocal) await A.resetAll();
    toast('탈퇴했어요. 그동안 고마웠어요');
  },
  resetAsk() {
    sheet(`<h2>모든 데이터를 지울까요?</h2><p class="muted" style="margin:0">급식 포인트, 고양이 사진, 알람이 모두 지워져요. 되돌릴 수 없어요.</p>
      <button class="btn danger" data-act="resetAll">모두 지우기</button><button class="btn" data-act="closeSheet">취소</button>`);
  },
  async resetAll() {
    for (const p of S.points) { for (const t of p.times) await cancelAlarm(t); for (const c of p.cats) await deletePhoto(c); }
    const key = S.kakaoKey; S = blank(); S.kakaoKey = key; save(); closeSheet(); R.sel = null; R.screen = null; render(); syncOverlays(); toast('모두 지웠어요');
  }
};

/* ---------- 츄르 챌린지 ----------
   한 급식소에서 30일 연속 급식 인증 → 진짜 츄르 한 봉 (계정당 한 번).
   날짜·거리 판정은 서버가 한다. 앱은 보여주기와 사진·위치 보내기만. */
const CH = { loaded: false, loading: false, data: null, error: '', busy: false, pick: null, agree: false, phone: '', agreePhone: false, bump: false };
const geoM = (a, b, c, d) => { const R = 6371000, r = x => x * Math.PI / 180; const x = r(d - b) * Math.cos(r((a + c) / 2)), y = r(c - a); return Math.sqrt(x * x + y * y) * R; };
const md = d => d ? `${Number(d.slice(5, 7))}.${d.slice(8, 10)}` : '';
async function loadChuru() {
  if (!canShare() || CH.loading) return;
  CH.loading = true;
  const r = await AU().churu('status', null, 'GET');
  CH.loading = false; CH.loaded = true;
  if (r.error) CH.error = r.message; else { CH.error = ''; CH.data = r; }
  if ((R.tab === 'schedule' && !R.screen) || R.screen === 'churu') render();
}
// 마스코트가 뒤에서 츄르 게이지를 안고 있는 그림 (n/goal 만큼 차오름)
// 스틱 파우치(길쭉한 츄르 봉지) 모양. 비어 있을 땐 무채색, 인증한 날만큼 색이 채워진다
const zig = (x, dir) => { let d = ''; for (let y = 6, i = 0; y <= 58; y += 4, i++) d += `L${x + (i % 2 ? dir * 4 : 0)} ${y}`; return d; };
function churuHug(n, goal, opt = {}) {
  const pct = Math.max(0, Math.min(1, n / goal)), X0 = 30, X1 = 306, fillW = (X1 - X0) * pct, id = 'cg' + Math.random().toString(36).slice(2, 7);
  const crimp = (x0, x1) => Array.from({ length: Math.floor((x1 - x0) / 3) }, (_, i) => `<line x1="${x0 + 1.5 + i * 3}" x2="${x0 + 1.5 + i * 3}" y1="9" y2="55"/>`).join('');
  const ticks = Array.from({ length: goal - 1 }, (_, i) => { const x = X0 + (i + 1) * ((X1 - X0) / goal); return `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="47" y2="55"/>`; }).join('');
  const leftOn = n > 0, rightOn = n >= goal;
  return `<div class="churu-hug ${opt.small ? 'small' : ''} ${CH.bump ? 'bump' : ''}" role="img" aria-label="츄르 게이지 ${n}/${goal}일">
    <img class="ch-cat" src="img/nk-cat.webp" alt="" width="855" height="932">
    <svg class="ch-gauge" viewBox="0 0 340 64" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="${id}f" x1="0" x2="1"><stop offset="0" stop-color="#8E7CF6"/><stop offset=".6" stop-color="#B79BFF"/><stop offset="1" stop-color="#FFB8A0"/></linearGradient>
        <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F1F0F4"/><stop offset=".55" stop-color="#E4E2E9"/><stop offset="1" stop-color="#D3D0DA"/></linearGradient>
        <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".22" stop-color="#fff" stop-opacity=".12"/><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#2B2640" stop-opacity=".16"/></linearGradient>
        <clipPath id="${id}c"><rect x="${X0}" y="6" width="${X1 - X0}" height="52" rx="2"/></clipPath>
      </defs>
      <!-- 양 끝 봉합부 (톱니 모양 + 압착 줄무늬) -->
      <path d="M${X0} 6 L8 6 ${zig(4, 1).replace(/^L/, 'L')} L${X0} 58 Z" fill="${leftOn ? '#8E7CF6' : '#D9D7DF'}"/>
      <path d="M${X1} 6 L332 6 ${zig(336, -1)} L${X1} 58 Z" fill="${rightOn ? '#FFB8A0' : '#D9D7DF'}"/>
      <g stroke="#fff" stroke-opacity=".35" stroke-width="1">${crimp(8, X0)}${crimp(X1, 332)}</g>
      <!-- 뜯는 홈 -->
      <path d="M318 6 L321 12 L324 6 Z" fill="#fff"/>
      <path d="M321 14 V56" stroke="#fff" stroke-opacity=".6" stroke-width="1" stroke-dasharray="2 2.5"/>
      <!-- 몸통: 비어 있으면 회색, 채운 만큼 색 -->
      <rect x="${X0}" y="6" width="${X1 - X0}" height="52" rx="2" fill="url(#${id}g)"/>
      <g clip-path="url(#${id}c)">
        <rect class="ch-fill" x="${X0}" y="6" width="${fillW.toFixed(1)}" height="52" fill="url(#${id}f)"/>
        ${pct > 0 && pct < 1 ? `<path d="M${(X0 + fillW).toFixed(1)} 6 q-3 13 0 26 t0 26" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.5"/>` : ''}
        <g stroke="#fff" stroke-opacity=".45" stroke-width="1">${ticks}</g>
        <rect x="${X0}" y="6" width="${X1 - X0}" height="52" fill="url(#${id}s)"/>
        <path d="M${X0 + 6} 13 H${X1 - 8}" stroke="#fff" stroke-opacity=".65" stroke-width="3" stroke-linecap="round"/>
      </g>
      <path d="M${X0} 6 V58 M${X1} 6 V58" stroke="#fff" stroke-opacity=".7" stroke-width="1.2"/>
    </svg>
    <img class="ch-paws" src="img/nk-paws.webp" alt="" width="264" height="114">
  </div>`;
}
function churuCard() {   // 급식 일정 탭 맨 위
  if (!canShare()) return `<button class="card churu-card" data-act="churuOpen"><div class="cc-text"><span class="cc-k">연속 급식 챌린지</span><b>30일 채우면<br>진짜 츄르 한 봉</b><span class="small muted">로그인하면 참여할 수 있어요</span></div><div class="cc-art">${churuHug(0, 30, { small: true })}</div></button>`;
  const d = CH.data;
  if (!d) return `<div class="card churu-card"><div class="cc-text"><span class="cc-k">연속 급식 챌린지</span><span class="small muted">${CH.error ? esc(CH.error) : '불러오는 중…'}</span></div></div>`;
  const n = d.count || 0;
  const line = { none: '<b>30일 채우면<br>진짜 츄르 한 봉</b><span class="cc-go">시작하기 ›</span>',
    active: `<b>${n}<small> / ${d.goal}일</small></b><span class="small ${d.today_done ? 'muted' : 'cc-todo'}">${d.today_done ? '오늘 인증 완료' : '오늘 인증 전'}</span>`,
    done: '<b>30일 달성!</b><span class="cc-todo small">츄르 받을 번호를 알려 주세요</span>',
    claimed: '<b>30일 달성!</b><span class="small muted">사진 확인 중이에요</span>',
    sent: '<b>츄르를 보냈어요</b><span class="small muted">함께해 줘서 고마워요</span>',
    rejected: '<b>확인되지 않았어요</b><span class="small muted">자세히 보기</span>' }[d.status] || '';
  return `<button class="card churu-card" data-act="churuOpen"><div class="cc-text"><span class="cc-k">연속 급식 챌린지</span>${line}</div><div class="cc-art">${churuHug(d.status === 'none' ? 0 : n, d.goal, { small: true })}</div></button>`;
}
function churuScreen() {
  const nav = (menu) => `<div class="navbar"><button class="back" data-act="back" aria-label="뒤로">${I.back}</button><h1>츄르 챌린지</h1>${menu ? `<button class="back" data-act="churuMenu" aria-label="챌린지 메뉴">${I.more}</button>` : ''}</div>`;
  if (!canShare()) return nav() + `<div class="pad"><div class="card churu-hero">${churuHug(0, 30)}<p class="ch-lead">한 급식소에서 <b>30일 연속</b> 밥 주고 인증하면<br><b>진짜 츄르 한 봉</b>을 보내드려요</p></div>
    <button class="btn primary" data-act="settings">로그인하고 참여하기</button></div>`;
  const d = CH.data;
  if (!d) return nav() + `<div class="pad"><div class="empty">${CH.error ? esc(CH.error) : '불러오는 중…'}</div>${CH.error ? '<button class="btn" data-act="churuReload">다시 불러오기</button>' : ''}</div>`;
  const rules = `<div class="card ch-rules">
      <div class="row">${I.ok}<span>하루 한 번, 급식소 <b>${d.near_m}m 안</b>에서 밥그릇 사진을 찍어 인증해요</span></div>
      <div class="row">${I.ok}<span>날짜는 서버 시간으로 세요. 자정이 지나면 새 하루예요</span></div>
      <div class="row">${I.ok}<span>한 달에 <b>하루는 쉬어도</b> 기록이 이어져요</span></div>
      <div class="row">${I.ok}<span>30일을 채우면 사진을 확인한 뒤 <b>휴대폰 번호로 쿠폰</b>을 보내요. 계정당 한 번이에요</span></div>
    </div>`;
  if (d.status === 'none') {
    const pts = S.points;
    return nav() + `<div class="pad">
      <div class="card churu-hero">${churuHug(0, d.goal)}<p class="ch-lead">한 급식소에서 <b>30일 연속</b> 밥 주고 인증하면<br><b>진짜 츄르 한 봉</b>을 보내드려요</p></div>
      ${rules}
      <section style="display:flex;flex-direction:column;gap:10px"><h3 class="h-sec">어느 급식소에서 할까요?</h3>
      ${pts.length ? `<div class="ch-spots">${pts.map(p => `<button data-act="churuPick" data-v="${p.id}" aria-pressed="${CH.pick === p.id}"><span class="dot"></span><b>${esc(p.name)}</b><span class="small muted">${p.cats.length ? esc(p.cats.map(c => c.name).slice(0, 3).join(' · ')) : '등록한 고양이 없음'}</span></button>`).join('')}</div>`
        : `<div class="empty" style="padding:14px 0">먼저 지도에서 급식소를 등록해 주세요</div><button class="btn" data-act="tab" data-v="map">지도로 가기</button>`}</section>
      ${pts.length ? `<label class="auth-check"><input type="checkbox" id="chAgree" ${CH.agree ? 'checked' : ''}><span>인증할 급식소 위치와 매일 찍은 사진을 서버에 보관하는 데 동의해요. 챌린지가 끝나거나 그만두면 바로 지워요. 지금 내 위치는 저장하지 않고 급식소까지 거리만 확인해요.</span></label>
      <button class="btn primary" data-act="churuJoin" ${CH.busy ? 'disabled' : ''}>챌린지 시작하기</button>` : ''}
    </div>`;
  }
  const n = d.count || 0, left = Math.max(0, d.goal - n);
  const cal = d.calendar.slice(-14);
  const strip = `<div class="card ch-strip"><div class="between small"><b>최근 2주</b><span class="muted">${md(cal[0].d)} ~ 오늘</span></div><div class="cells" aria-label="최근 14일 인증 기록">${cal.map(c => `<span class="s-${c.s}" title="${c.d}" aria-label="${md(c.d)} ${({ done: '인증', rest: '쉼', today: '오늘', miss: '없음' })[c.s]}">${c.s === 'rest' ? '쉼' : ''}</span>`).join('')}</div></div>`;
  const head = `<div class="card churu-hero">
      <div class="ch-head"><div><div class="small muted">${d.status === 'active' ? '30일 채우면 진짜 츄르 한 봉' : esc(d.spot.name)}</div><div class="ch-count">${n}<small> / ${d.goal}일</small></div></div>${d.status === 'active' && n ? `<span class="pill-hot">${n}일째</span>` : ''}</div>
      ${churuHug(n, d.goal)}
      <div class="between small muted"><span>${d.start ? '시작 ' + md(d.start) : '오늘부터 시작'}</span><span>${d.status === 'active' ? (left ? `${left}일 남음` : '') : '30일 달성'}</span></div>
    </div>`;
  if (d.status === 'active') {
    return nav(true) + `<div class="pad ch-pad">${head}
      <div class="card ch-today ${d.today_done ? 'on' : ''}"><div class="ic">${d.today_done ? I.ok : I.camera}</div><div><b>오늘 ${esc(d.spot.name)} ${d.today_done ? '인증 완료' : '인증 전'}</b><span class="small muted">${d.today_done ? '내일 또 만나요' : `급식소 ${d.near_m}m 안에서 밥그릇 사진 1장`}</span></div></div>
      <div class="card ch-rest"><span>쉬어도 이어지는 날</span><span class="${d.rest_left ? 'pill-peach' : 'pill-ghost'}">${d.rest_left ? '이번 달 1번 남음' : '이번 달 사용함'}</span></div>
      ${strip}
      ${d.today_done ? '' : `<div class="ch-cta"><button class="btn primary" data-act="churuCheckin" ${CH.busy ? 'disabled' : ''}>${I.camera} ${CH.busy ? '확인하는 중…' : '오늘 급식 인증하기'}</button></div>`}
    </div>`;
  }
  if (d.status === 'done') {
    return nav() + `<div class="pad">${head}
      <div class="card ch-done"><b class="ch-big">30일 달성! 츄르 받으러 가요</b><span class="small muted">쿠폰을 받을 휴대폰 번호를 알려 주세요. 운영자가 인증 사진을 확인한 뒤 보내드려요.</span>
        <div class="field"><label for="chPhone">휴대폰 번호</label><input id="chPhone" type="tel" inputmode="numeric" placeholder="010-1234-5678" maxlength="13" value="${esc(CH.phone)}"></div>
        <label class="auth-check"><input type="checkbox" id="chAgreePhone" ${CH.agreePhone ? 'checked' : ''}><span>쿠폰 발송을 위해 휴대폰 번호를 수집하는 데 동의해요. 보내거나 확인이 끝나면 바로 지워요.</span></label>
        <button class="btn primary" data-act="churuClaim" ${CH.busy ? 'disabled' : ''}>츄르 받기</button></div>
    </div>`;
  }
  const msg = { claimed: ['사진을 확인하고 있어요', `확인되면 <b>${esc(d.phone)}</b>로 쿠폰을 보내드려요. 보통 며칠 걸려요.`],
    sent: ['츄르를 보냈어요!', '문자로 온 쿠폰을 확인해 주세요. 츄르는 계정당 한 번이라 챌린지는 여기까지예요. 길냥이를 챙겨 줘서 고마워요.'],
    rejected: ['인증이 확인되지 않았어요', d.note ? esc(d.note) : '같은 급식소에서 매일 찍은 사진인지 확인되지 않았어요.'] }[d.status] || ['', ''];
  return nav() + `<div class="pad">${head}<div class="card ch-done"><b class="ch-big">${msg[0]}</b><span class="small muted" style="line-height:1.6">${msg[1]}</span></div></div>`;
}
async function churuShot() {   // 인증 사진은 카메라로만 (앨범 사진 재사용 막기)
  if (isNative && P.Camera) {
    try {
      const r = await P.Camera.getPhoto({ quality: 80, width: 1280, correctOrientation: true, resultType: 'base64', source: 'CAMERA', saveToGallery: false });
      return `data:image/${r.format || 'jpeg'};base64,${r.base64String}`;
    } catch (e) { if (!/cancel/i.test(String(e && e.message))) toast('카메라를 열지 못했어요. 카메라 권한을 확인해 주세요'); return null; }
  }
  return new Promise(res => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.capture = 'environment'; inp.hidden = true;
    document.body.appendChild(inp);
    inp.onchange = () => { const f = inp.files && inp.files[0]; inp.remove(); if (!f) return res(null); const rd = new FileReader(); rd.onload = () => res(rd.result); rd.onerror = () => res(null); rd.readAsDataURL(f); };
    inp.click();
  });
}
const CHA = {
  churuOpen() { R.screen = 'churu'; render(); $('#view').scrollTop = 0; if (canShare()) loadChuru(); },
  churuReload() { loadChuru(); },
  churuPick(v, el) { CH.pick = v; el.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === el))); },
  async churuJoin(v, el, e, reset) {
    const p = pt(CH.pick || (S.churuPoint && pt(S.churuPoint) ? S.churuPoint : ''));
    CH.agree = !!($('#chAgree') && $('#chAgree').checked) || CH.agree;
    if (!p) { toast('챌린지를 할 급식소를 골라 주세요'); return; }
    if (!CH.agree) { toast('안내를 읽고 동의에 체크해 주세요'); return; }
    CH.busy = true; render();
    const r = await AU().churu('join', { name: p.name, lat: p.lat, lng: p.lng, agree: true, reset: !!reset }, 'POST');
    CH.busy = false;
    if (r.error === 'need_reset') { sheet(`<h2>급식소를 바꿀까요?</h2><p class="muted" style="margin:0;line-height:1.6">${esc(r.message)} 지금까지의 인증 사진도 지워져요.</p><button class="btn danger" data-act="churuJoinReset">바꾸고 처음부터</button><button class="btn" data-act="closeSheet">그대로 할게요</button>`); render(); return; }
    if (r.error) { toast(r.message || '시작하지 못했어요'); render(); return; }
    S.churuPoint = p.id; save(); CH.data = r; closeSheet(); render(); toast('시작! 오늘부터 하루 한 번 인증해요');
  },
  churuJoinReset() { closeSheet(); A.churuJoin(null, null, null, true); },
  churuMenu() {
    sheet(`<h2>츄르 챌린지</h2><button class="btn" data-act="churuChange">급식소 바꾸기</button><button class="btn danger" data-act="churuQuitAsk">챌린지 그만두기</button><button class="btn" data-act="closeSheet">닫기</button>`);
  },
  churuChange() {
    const pts = S.points;
    sheet(`<h2>어느 급식소로 바꿀까요?</h2><p class="small muted" style="margin:0">바꾸면 연속 기록이 처음부터 시작돼요.</p>
      <div class="ch-spots">${pts.map(p => `<button data-act="churuPick" data-v="${p.id}" aria-pressed="${CH.pick === p.id}"><span class="dot"></span><b>${esc(p.name)}</b></button>`).join('')}</div>
      <button class="btn primary" data-act="churuChangeGo">바꾸기</button>`);
  },
  churuChangeGo() { if (!CH.pick) { toast('급식소를 골라 주세요'); return; } CH.agree = true; closeSheet(); A.churuJoin(); },
  churuQuitAsk() { sheet(`<h2>그만둘까요?</h2><p class="muted" style="margin:0;line-height:1.6">연속 기록과 인증 사진, 서버에 둔 급식소 위치가 바로 지워져요. 언제든 다시 시작할 수 있어요.</p><button class="btn danger" data-act="churuQuit">그만두기</button><button class="btn" data-act="closeSheet">계속할게요</button>`); },
  async churuQuit() { const r = await AU().churu('quit', {}, 'POST'); closeSheet(); if (!r.error) { CH.data = r; delete S.churuPoint; save(); } render(); toast('챌린지를 그만뒀어요. 기록을 지웠어요'); },
  async churuCheckin() {
    if (CH.busy) return;
    const p = S.churuPoint && pt(S.churuPoint);
    CH.busy = true; render(); toast('위치를 확인하는 중…');
    const pos = await getPosition();
    if (!pos) { CH.busy = false; render(); toast('위치를 확인할 수 없어요. 위치 권한을 켜 주세요'); return; }
    if (p) {   // 서버에서 다시 확인하지만, 멀리 있으면 사진 찍기 전에 미리 알려준다
      const m = geoM(pos.lat, pos.lng, p.lat, p.lng);
      if (m > CH.data.near_m) { CH.busy = false; render(); toast(`급식소에서 ${Math.round(m)}m 떨어져 있어요. ${CH.data.near_m}m 안에서 인증해 주세요`); return; }
    }
    const raw = await churuShot();
    if (!raw) { CH.busy = false; render(); return; }
    const photo = await boardJpeg(raw);
    if (!photo) { CH.busy = false; render(); toast('사진을 줄이지 못했어요. 다시 찍어 주세요'); return; }
    const r = await AU().churu('checkin', { lat: pos.lat, lng: pos.lng, photo }, 'POST');
    CH.busy = false;
    if (r.error) { toast(r.message || '인증하지 못했어요'); render(); return; }
    CH.data = r; CH.bump = true; render(); setTimeout(() => { CH.bump = false; }, 1200);
    toast(r.status === 'done' ? '30일 달성! 츄르를 받으러 가요' : `${r.count}일째 인증 완료!`);
  },
  async churuClaim() {
    CH.phone = $('#chPhone').value.trim(); CH.agreePhone = $('#chAgreePhone').checked;
    if (!/^01[016789]-?\d{3,4}-?\d{4}$/.test(CH.phone.replace(/\s/g, ''))) { toast('휴대폰 번호를 다시 확인해 주세요'); return; }
    if (!CH.agreePhone) { toast('번호 수집 동의에 체크해 주세요'); return; }
    CH.busy = true; render();
    const r = await AU().churu('claim', { phone: CH.phone, agree: true }, 'POST');
    CH.busy = false;
    if (r.error) { toast(r.message || '신청하지 못했어요'); render(); return; }
    CH.data = r; CH.phone = ''; render(); toast('신청했어요! 확인되면 쿠폰을 보내드려요');
  },
};

Object.assign(A, SA, BA, LA, BDA, CHA);
// 공유 중인 급식소를 고치면 공유본도 따라 바뀐다
['renamePoint', 'saveTime', 'delTime', 'saveCat', 'delCat'].forEach(k => {
  const f = A[k];
  A[k] = async (...a) => { const r = await f(...a); syncShareSoon(pt(R.pointId)); return r; };
});
{
  const delPoint = A.delPoint;
  A.delPoint = async (...a) => {
    const sh = ownedFor(R.pointId);
    if (sh) { const r = await AU().share('delete', { share_id: sh.id }); if (!r.error) SH.owned = SH.owned.filter(x => x.id !== sh.id); }
    return delPoint(...a);
  };
  const open = A.open;
  A.open = v => { open(v); if (canShare() && !SH.loaded) loadShares(true); };
}

/* ---------- events ---------- */
const app = $('#app');
app.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  if (el.matches('input[type=checkbox]')) return;
  const fn = A[el.dataset.act]; if (fn) fn(el.dataset.v, el, e);
});
app.addEventListener('change', e => {
  const el = e.target; if (!el.matches || !el.matches('input[type=checkbox][data-act]')) return;
  const fn = A[el.dataset.act]; if (fn) fn(el.dataset.v, el, e);
});

/* ---------- native setup ---------- */
async function setupNative() {
  if (!isNative) return;
  if (P.App) {
    P.App.addListener('backButton', () => {
      if (window.NK_AUTH && window.NK_AUTH.handleBack()) return;
      const authEl = document.getElementById('auth');
      if (authEl && !authEl.hidden) { P.App.exitApp(); return; }
      if (closeSheet()) return;
      if (R.picking) { A.pickCancel(); return; }
      if (R.adding) { A.cancelAdd(); return; }
      if (R.screen) { A.back(); return; }
      if (R.tab !== 'map') { A.tab('map'); return; }
      P.App.exitApp();
    });
    P.App.addListener('resume', () => { render(); loadShares(true); loadLost(true); if (!R.screen) loadBoard(); });
    P.App.addListener('appUrlOpen', ev => handleJoinLink(ev && ev.url));
    try { const l = await P.App.getLaunchUrl(); if (l && l.url) handleJoinLink(l.url); } catch (e) {}
  }
  if (LN) {
    LN.addListener('localNotificationActionPerformed', ev => {
      const id = ev && ev.notification && ev.notification.extra && ev.notification.extra.pointId;
      if (id && pt(id)) A.open(id);
    });
  }
  await introDone;
  if (window.NK_AUTH) await window.NK_AUTH.ready;
  if (P.AdMob) {
    try {
      await P.AdMob.initialize({ initializeForTesting: ADMOB_TESTING });
      // 배너 높이에 맞춰 광고 칸 크기를 맞춘다 (메뉴를 덮지 않게)
      P.AdMob.addListener('bannerAdSizeChanged', info => {
        const h = Math.ceil((info && info.height) || 50);
        document.documentElement.style.setProperty('--adh', Math.max(56, h + 6) + 'px');
      });
      // 광고 플러그인이 내비게이션 바 높이를 스스로 피해서 배너를 놓는다. 여기서 또 올리면 메뉴를 덮으므로 margin은 0.
      await P.AdMob.showBanner({ adId: ADMOB_BANNER_ID, adSize: 'BANNER', position: 'BOTTOM_CENTER', margin: 0, isTesting: ADMOB_TESTING });
    } catch (e) { /* 광고가 안 떠도 앱은 동작 */ }
  }
  // 알람 다시 맞추기 (앱 업데이트·재설치 후에도 유지되도록)
  if (S.points.some(p => p.times.some(t => t.alarm))) {
    if (await ensureNotif()) for (const p of S.points) for (const t of p.times) if (t.alarm) await scheduleAlarm(p, t);
  }
}

/* ---------- 화면 가장자리 여백 ----------
   상태바·내비게이션 바 여백은 안드로이드(Capacitor)가 알려주는 값(--safe-area-inset-*)을 CSS에서 그대로 쓴다.
   키보드가 열리고 닫힐 때도 그 값이 알아서 바뀌므로 앱에서 따로 계산하지 않는다. */

/* ---------- intro ---------- */
const introDone = new Promise(res => {
  const el = $('#intro'); if (!el) return res();
  let done = false;
  const finish = () => { if (done) return; done = true; document.documentElement.classList.remove('booting'); el.classList.add('hide'); setTimeout(() => { el.remove(); res(); }, 700); };
  el.addEventListener('click', finish);
  setTimeout(finish, 3600);
});

$('#bellBtn').innerHTML = I.bell;
$('#setBtn').innerHTML = I.gear;
render();
// 로그인하면 공유 정보를 불러오고, 받은 부탁이 있으면 알려준다
(async () => {
  await introDone;
  if (!AU()) return;
  AU().onChange(u => {
    SH.loaded = false; SH.owned = []; SH.joined = []; SH.pending = 0;
    LS.loaded = false; LS.mine = []; LS.nearby = []; LS.unread = 0; BK.consent = null; BK.count = 0;
    BD.loaded = false; BD.posts = []; BD.unread = 0; BD.post = null;
    CH.loaded = false; CH.data = null;
    if (u) { loadShares(true); loadLost(true); loadBoard(); checkBackup(); } else { render(); syncOverlays(); }
  });
  await AU().ready;
  await Promise.all([loadShares(true), loadLost(true)]);
  loadBoard();
  if (LS.unread) toast(`내 급식소 근처에서 고양이를 찾고 있어요 · 탐정모드에서 확인해 주세요`);
  else if (SH.pending) toast(`받은 밥 부탁이 ${SH.pending}건 있어요 · 함께 탭에서 확인해 주세요`);
  await checkBackup();
})();
setupLongPress();
loadMap();
setupNative();
})();
