/* 냥's 키친 1차: 카카오 지도, 급식 포인트, 고양이 사진(기기 저장), 급식 알람, 테스트 광고 */
(function () {
'use strict';

const Cap = window.Capacitor;
const isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
const P = (Cap && Cap.Plugins) || {};
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.9780 }; // 위치를 못 받을 때: 서울시청
const ADMOB_BANNER_TEST_ID = 'ca-app-pub-3940256099942544/6300978111';
const STORE_KEY = 'nyangs-kitchen-v1';

/* ---------- icons ---------- */
const I = {
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
function blank() { return { points: [], zones: [], filters: { mine: true, zone: true }, kakaoKey: '', nextNid: 1000, center: null }; }
let S;
try { S = Object.assign(blank(), JSON.parse(localStorage.getItem(STORE_KEY)) || {}); } catch (e) { S = blank(); }
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { toast('저장 공간이 부족해요'); } }
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
  closeSheet();
  const s = document.createElement('div'); s.className = 'scrim'; s.dataset.act = 'scrim';
  s.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${inner}</div>`;
  layer.appendChild(s);
}
function closeSheet() { const s = layer.querySelector('.scrim'); if (s) { s.remove(); return true; } return false; }
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
function onMapClick(lat, lng) {
  if (!R.adding) { if (R.sel) { R.sel = null; syncOverlays(); renderMapUi(); } return; }
  openAddSheet({ lat, lng });
}
function initKakao() {
  if (engine === 'kakao') return;
  if (kmap && engine === 'leaflet') { try { kmap.remove(); } catch (e) {} }
  resetMapBox();
  const K = window.kakao.maps;
  const c = S.center || DEFAULT_CENTER;
  kmap = new K.Map($('#kmap'), { center: new K.LatLng(c.lat, c.lng), level: 3 });
  engine = 'kakao';
  K.event.addListener(kmap, 'click', e => onMapClick(e.latLng.getLat(), e.latLng.getLng()));
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
  kmap.on('click', e => onMapClick(e.latlng.lat, e.latlng.lng));
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
function selectPin(id) { if (R.adding) return; R.sel = id; syncOverlays(); renderMapUi(); }
function syncOverlays() {
  if (!kmap) return;
  kObjs.forEach(o => engine === 'kakao' ? o.setMap(null) : o.remove()); kObjs = [];
  if (engine === 'kakao') {
    const K = window.kakao.maps;
    if (S.filters.zone) S.zones.forEach(z => {
      const pos = new K.LatLng(z.lat, z.lng);
      kObjs.push(new K.Circle({ map: kmap, center: pos, radius: z.radius || 40, strokeWeight: 2, strokeColor: '#C2560F', strokeOpacity: 0.9, strokeStyle: 'dash', fillColor: '#C2560F', fillOpacity: 0.14 }));
      const el = document.createElement('div'); el.className = 'kzone'; el.innerHTML = `${I.warn}${esc(z.label)}`;
      el.addEventListener('click', ev => { ev.stopPropagation(); zoneSheet(z.id); });
      kObjs.push(new K.CustomOverlay({ map: kmap, position: pos, content: el, yAnchor: 0.5, clickable: true }));
    });
    if (S.filters.mine) S.points.forEach(p => {
      const el = pinEl(p);
      el.addEventListener('click', ev => { ev.stopPropagation(); selectPin(p.id); });
      kObjs.push(new K.CustomOverlay({ map: kmap, position: new K.LatLng(p.lat, p.lng), content: el, yAnchor: 0.35, clickable: true, zIndex: 3 }));
    });
  } else {
    if (S.filters.zone) S.zones.forEach(z => {
      kObjs.push(L.circle([z.lat, z.lng], { radius: z.radius || 40, color: '#C2560F', weight: 2, dashArray: '6 6', fillColor: '#C2560F', fillOpacity: 0.14, interactive: false }).addTo(kmap));
      const icon = L.divIcon({ className: 'nk-icon', html: `<div class="kzone">${I.warn}${esc(z.label)}</div>`, iconSize: null });
      kObjs.push(L.marker([z.lat, z.lng], { icon }).on('click', () => zoneSheet(z.id)).addTo(kmap));
    });
    if (S.filters.mine) S.points.forEach(p => {
      const icon = L.divIcon({ className: 'nk-icon nk-pin', html: pinEl(p).outerHTML, iconSize: null });
      kObjs.push(L.marker([p.lat, p.lng], { icon, zIndexOffset: 500 }).on('click', () => selectPin(p.id)).addTo(kmap));
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
  const empty = !S.points.length && !R.adding ? `<div class="peek"><b style="font-size:15px">첫 급식 포인트를 등록해 보세요</b><span class="small muted">오른쪽 아래 + 버튼을 누르고 지도에서 위치를 고르면 돼요.</span></div>` : '';
  ui.innerHTML = `
    <div class="legend">
      <button data-act="filter" data-v="mine" aria-pressed="${S.filters.mine}"><span class="dot" style="background:#2F6B4F"></span>내 포인트 ${S.points.length}</button>
      <button data-act="filter" data-v="zone" aria-pressed="${S.filters.zone}"><span class="dot" style="border:2px dashed #C2560F"></span>주의 구역 ${S.zones.length}</button>
    </div>
    ${R.adding ? `<div class="addhint"><span>등록할 위치를 지도에서 눌러주세요</span><button data-act="cancelAdd">취소</button></div>` : ''}
    ${R.adding ? '' : `<button class="fab loc" style="bottom:${sel || empty ? 216 : 86}px" data-act="locate" aria-label="내 위치로">${I.loc}</button>
    <button class="fab" style="bottom:${sel || empty ? 152 : 20}px" data-act="startAdd" aria-label="급식 포인트 또는 주의 구역 추가">${I.plus}</button>`}
    ${peek || empty}`;
}

/* ---------- screens ---------- */
const TABS = [['map', '지도', I.map], ['schedule', '급식 일정', I.clock], ['share', '공유', I.people], ['board', '이웃', I.chat], ['detective', '탐정모드', I.search]];
function renderTabs() {
  $('#tabs').hidden = !!R.screen;
  $('#tabs').innerHTML = TABS.map(([k, l, ic]) => `<button data-act="tab" data-v="${k}" ${R.tab === k && !R.screen ? 'aria-current="page"' : ''}>${ic}${l}</button>`).join('');
}

function scheduleScreen() {
  const rows = [];
  S.points.forEach(p => p.times.forEach(t => rows.push({ p, t })));
  rows.sort((a, b) => a.t.t.localeCompare(b.t.t));
  const done = rows.filter(r => isDone(r.t)).length;
  return `<header class="topbar"><div><div class="brand">급식 일정</div><div class="where">오늘 ${done}/${rows.length} 완료</div></div></header>
  <div class="pad">
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

function pointScreen() {
  const p = pt(R.pointId); if (!p) { R.screen = null; return scheduleScreen(); }
  return `<div class="navbar"><button class="back" data-act="back" aria-label="뒤로">${I.back}</button><h1>급식 포인트</h1>
    <button class="back" data-act="pointMenu" aria-label="포인트 메뉴">${I.more}</button></div>
  <div class="pad">
    <div style="display:flex;flex-direction:column;gap:8px">
      <h2 class="h-display">${esc(p.name)}</h2>
      <div class="row" style="flex-wrap:wrap;gap:6px"><span class="chip ghost">나만 보기</span><span class="chip ghost">${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}</span></div>
    </div>
    <section style="display:flex;flex-direction:column;gap:10px">
      <div class="between"><h3 class="h-sec">먹으러 오는 고양이 ${p.cats.length ? p.cats.length + '마리' : ''}</h3><button class="linkbtn" data-act="addCat">+ 사진 추가</button></div>
      <div class="cats">
        ${p.cats.map(c => `<button class="cat" data-act="catMenu" data-v="${c.id}"><div class="ph" style="${catBg(c)}"><span class="badge">${I.phoneS}원본</span></div><b>${esc(c.name)}</b></button>`).join('')}
        <button class="addcat" data-act="addCat">${I.plus}사진 추가</button>
      </div>
    </section>
    <section class="card">
      <h3 class="h-sec">사진 저장 방식</h3>
      <div class="store"><div class="ic">${I.phone}</div><div><b>원본 · 내 기기에만 저장</b><span class="small muted">앱 전용 저장 공간에 보관하고 서버에 올리지 않아요</span></div></div>
      <div class="store"><div class="ic on">${I.lock}</div><div><b>공유본 · 암호화 업로드</b><span class="small muted">2차 업데이트에서 공유를 켤 때만 올라가요</span></div></div>
    </section>
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
    share: { title: '공유', head: '원본은 내 폰에,<br>보여줄 것만 잠가서 보내요', body: '내가 초대한 사람에게만 급식 포인트와 고양이 사진을 보여주는 기능이에요. 서버를 연결하는 2차 업데이트에서 열려요.',
      extra: `<div class="card"><div class="flow"><div class="st"><div class="box">${I.phone}</div>내 기기<span>원본 보관</span></div><span class="arr">${I.arrow}</span><div class="st"><div class="box on">${I.lock}</div>암호화<span>압축 · 위치정보 삭제</span></div><span class="arr">${I.arrow}</span><div class="st"><div class="box">${I.people}</div>공유 그룹<span>초대한 사람만</span></div></div></div>` },
    board: { title: '이웃', head: '동네 이웃과<br>돌봄을 나눠요', body: '이웃 게시판과 여행·출장 때 급식 부탁하기 기능이에요. 2차 업데이트에서 열려요.', extra: '' },
    detective: { title: '탐정모드', head: '잃어버린 고양이를<br>급식 포인트로 찾아요', body: '유실 신고와 본인인증을 마친 보호자에게 유실 지점 50m, 100m 안의 급식 포인트를 순서대로 알려주는 기능이에요. 3차 업데이트에서 열려요.', extra: '' }
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
    else if (R.tab === 'schedule') html = scheduleScreen();
    else html = soonScreen(R.tab);
    $('#view').innerHTML = html;
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
  sheet(`<h2>설정</h2>
    <div class="card"><div class="between"><span>급식 포인트</span><b>${S.points.length}곳</b></div><div class="between"><span>등록한 고양이</span><b>${cats}마리</b></div><div class="between"><span>급식 주의 구역</span><b>${S.zones.length}곳</b></div></div>
    <div class="field"><label for="keyInput2">카카오 지도 JavaScript 키 (선택)</label><input id="keyInput2" value="${esc(S.kakaoKey)}" placeholder="${kakaoKey() ? '빌드에 들어간 키 사용 중' : '없으면 기본 지도를 써요'}" autocapitalize="off" autocomplete="off" spellcheck="false"></div>
    <button class="btn" data-act="saveKey2">키 저장</button>
    <button class="btn" data-act="testNotif">알림 테스트 (5초 뒤)</button>
    <button class="btn danger" data-act="resetAsk">모든 데이터 지우기</button>
    <p class="small muted" style="margin:0">냥's 키친 0.1 · 데이터와 사진은 이 휴대폰에만 저장돼요.</p>`);
}

/* ---------- actions ---------- */
const A = {
  tab(v) { R.tab = v; R.screen = null; R.adding = false; render(); $('#view').scrollTop = 0; },
  back() { R.screen = null; render(); },
  scrim(v, el, e) { if (e.target === el) closeSheet(); },
  closeSheet() { closeSheet(); },
  settings() { settingsSheet(); },
  filter(v) { S.filters[v] = !S.filters[v]; save(); syncOverlays(); renderMapUi(); },
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
    sheet(`<h2>${esc(c.name)}</h2>${src ? `<div style="width:100%;aspect-ratio:1/1;border-radius:16px;background:url('${src}') center/cover"></div>` : ''}
      <div class="field"><label for="catRename">이름 바꾸기</label><input id="catRename" value="${esc(c.name)}" maxlength="12"></div>
      <button class="btn primary" data-act="renameCat" data-v="${c.id}">이름 저장</button>
      <button class="btn danger" data-act="delCat" data-v="${c.id}">이 고양이 지우기</button>`);
  },
  renameCat(v) { const c = pt(R.pointId).cats.find(x => x.id === v); c.name = $('#catRename').value.trim() || c.name; save(); closeSheet(); render(); },
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
  resetAsk() {
    sheet(`<h2>모든 데이터를 지울까요?</h2><p class="muted" style="margin:0">급식 포인트, 고양이 사진, 알람이 모두 지워져요. 되돌릴 수 없어요.</p>
      <button class="btn danger" data-act="resetAll">모두 지우기</button><button class="btn" data-act="closeSheet">취소</button>`);
  },
  async resetAll() {
    for (const p of S.points) { for (const t of p.times) await cancelAlarm(t); for (const c of p.cats) await deletePhoto(c); }
    const key = S.kakaoKey; S = blank(); S.kakaoKey = key; save(); closeSheet(); R.sel = null; R.screen = null; render(); syncOverlays(); toast('모두 지웠어요');
  }
};

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
      if (closeSheet()) return;
      if (R.adding) { A.cancelAdd(); return; }
      if (R.screen) { A.back(); return; }
      if (R.tab !== 'map') { A.tab('map'); return; }
      P.App.exitApp();
    });
    P.App.addListener('resume', () => render());
  }
  if (LN) {
    LN.addListener('localNotificationActionPerformed', ev => {
      const id = ev && ev.notification && ev.notification.extra && ev.notification.extra.pointId;
      if (id && pt(id)) A.open(id);
    });
  }
  await introDone;
  if (P.AdMob) {
    try {
      await P.AdMob.initialize({ initializeForTesting: true });
      await P.AdMob.showBanner({ adId: ADMOB_BANNER_TEST_ID, adSize: 'BANNER', position: 'BOTTOM_CENTER', margin: 0, isTesting: true });
    } catch (e) { /* 광고가 안 떠도 앱은 동작 */ }
  }
  // 알람 다시 맞추기 (앱 업데이트·재설치 후에도 유지되도록)
  if (S.points.some(p => p.times.some(t => t.alarm))) {
    if (await ensureNotif()) for (const p of S.points) for (const t of p.times) if (t.alarm) await scheduleAlarm(p, t);
  }
}

/* ---------- intro ---------- */
const introDone = new Promise(res => {
  const el = $('#intro'); if (!el) return res();
  let done = false;
  const finish = () => { if (done) return; done = true; el.classList.add('hide'); setTimeout(() => { el.remove(); res(); }, 450); };
  el.addEventListener('click', finish);
  setTimeout(finish, 2200);
});

$('#bellBtn').innerHTML = I.bell;
$('#setBtn').innerHTML = I.gear;
render();
loadMap();
setupNative();
})();
