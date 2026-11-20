// Phần hiển thị: chỉ đọc state từ core (Sim) và gửi InputState. Không chứa luật game.
import * as THREE from 'three';
import { Sim, emptyInput, WIND_EVERY } from '../core/sim.ts';
import { getMap } from '../core/map.ts';
import type { Floor } from '../core/map.ts';
import { parseTuning } from '../core/tuning.ts';
import type { GameEvent, InputState, Tuning } from '../core/types.ts';
import { Audio } from './audio.ts';
import { Rng } from '../core/rng.ts';
import { addEntry, isoLocal, sortEntries, validateEntry, validateName } from '../core/leaderboard.ts';
import type { LeaderboardEntry } from '../core/leaderboard.ts';

// Bảng màu chuẩn Ticket-02
const C = {
  sky: 0x0e1430, mist: 0x1b2350, grass: 0x2f5d50, sand: 0xc9b48a, wood: 0x6b4a2f, sea: 0x12384a,
  lit: 0xffb347, core: 0xffe9b0, off: 0x5b5f6e, moteCore: 0xfff6c2, moteHalo: 0xffe58a,
  shade: 0x120a1a, shadeRim: 0x7a3cff, shadeStun: 0x3a3450, shirt: 0xe8e2d0, scarf: 0xc8102e, gold: 0xf2c14e, drifter: 0x8fa3b8,
};
const INTRO: Record<number, string> = {
  1: '“Mây à, sương đen đã nuốt Đảo Bến. Gom đom đóm, thắp lại năm ngọn đèn trước khi trời sáng nhé.” — Ông Đăng',
  2: '“Đảo Cau có hai nửa, nối bằng cầu tre. Bục nhảy sẽ đưa con qua biển mây. Coi chừng Gió Lạc — nó thích cướp ánh sáng.” — Ông Đăng',
  3: '“Đêm cuối rồi. Leo dốc lên tầng cao, gió sẽ thổi mạnh. Thắp đèn Đảo Chuông để gọi bình minh về.” — Ông Đăng',
};

const tuning: Tuning = parseTuning(await (await fetch('game.contract.json')).json());
const $ = (id: string) => document.getElementById(id)!;
/** Chỉ ghi DOM khi nội dung đổi (tránh layout + rác mỗi khung). */
const htmlCache = new Map<string, string>();
const setHTML = (id: string, h: string) => { if (htmlCache.get(id) !== h) { htmlCache.set(id, h); $(id).innerHTML = h; } };
// Tham số qua ?query hoặc #hash (trang artifact chỉ giữ #hash), ví dụ #fps&night=2
const params = new URLSearchParams(`${location.search.slice(1)}&${location.hash.slice(1)}`);
const audio = new Audio();

// Cài đặt (lưu giữa các lần mở game)
type Action = 'up' | 'down' | 'left' | 'right' | 'jump' | 'dash' | 'interact' | 'pulse' | 'pause';
const ACTIONS: [Action, string][] = [['up', 'Đi tới'], ['down', 'Đi lùi'], ['left', 'Sang trái'], ['right', 'Sang phải'], ['jump', 'Nhảy'], ['dash', 'Lướt'], ['interact', 'Tương tác'], ['pulse', 'Tỏa Sáng'], ['pause', 'Tạm dừng']];
const DEFAULT_KEYS: Record<Action, string> = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', jump: 'Space', dash: 'ShiftLeft', interact: 'KeyE', pulse: 'KeyQ', pause: 'Escape' };
const settings = { volume: 0.6, sens: 0.3, cb: false, rm: false, big: false, keys: { ...DEFAULT_KEYS } };
try { const st = JSON.parse(localStorage.getItem('ddl-settings') ?? '{}'); Object.assign(settings, st, { keys: { ...DEFAULT_KEYS, ...(st.keys ?? {}) } }); } catch { /* storage có thể bị chặn */ }
document.documentElement.classList.toggle('big', settings.big);
const saveSettings = () => { try { localStorage.setItem('ddl-settings', JSON.stringify(settings)); } catch { /* bỏ qua */ } };
audio.setVolume(settings.volume);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(C.sky);
scene.fog = new THREE.Fog(C.mist, 25, 110);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 400);
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const ambient = new THREE.AmbientLight(0xbfc8ff, 0.15);
scene.add(ambient);
const moon = new THREE.DirectionalLight(0x9aa6ff, 0.35);
moon.position.set(-30, 50, 20);
scene.add(moon);
const sea = new THREE.Mesh(new THREE.CircleGeometry(300, 48), new THREE.MeshStandardMaterial({ color: C.sea, roughness: 1 }));
sea.rotation.x = -Math.PI / 2; sea.position.y = -8;
scene.add(sea);

const mat = (color: number, emissive = 0, ei = 0) => new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: ei, roughness: 0.8 });

// Mây: áo, khăn đỏ, nón lá, đèn lồng nhỏ
const player = new THREE.Group();
const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.33, 0.6, 4, 12), mat(C.shirt));
body.position.y = 0.65; player.add(body);
const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 8, 16), mat(C.scarf));
scarf.rotation.x = Math.PI / 2; scarf.position.y = 1.05; player.add(scarf);
const hat = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.45, 24), mat(C.sand));
hat.position.y = 1.45; player.add(hat);
const mini = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), mat(C.lit, C.lit, 2));
mini.position.set(0.55, 1.05, 0.2); player.add(mini);
const miniLight = new THREE.PointLight(C.lit, 6, 8);
miniLight.position.copy(mini.position); player.add(miniLight);
scene.add(player);

const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: C.core, transparent: true, opacity: 0, side: THREE.DoubleSide }));
ring.rotation.x = -Math.PI / 2;
scene.add(ring);
let ringT = 1;

// ---------- thế giới theo Đêm ----------
let world = new THREE.Group();
scene.add(world);
let sim: Sim;
let night = 1;
let totalScore = 0;
let lanternViews: { head: THREE.Mesh; light: THREE.PointLight; safe: THREE.Mesh; bar: THREE.Mesh; barBg: THREE.Mesh; tear: THREE.Mesh }[] = [];
const moteViews = new Map<string, THREE.Group>();
const shadeViews = new Map<string, THREE.Group>();
const drifterViews = new Map<string, THREE.Mesh>();
const charmViews = new Map<string, THREE.Group>();
const moteCoreGeo = new THREE.SphereGeometry(0.1, 8, 6), moteHaloGeo = new THREE.SphereGeometry(0.22, 8, 6);
const moteCoreMat = mat(C.moteCore, C.moteCore, 2.5);
const moteHaloMat = new THREE.MeshBasicMaterial({ color: C.moteHalo, transparent: true, opacity: 0.35 });
// Bóng Mực dùng chung geometry/material (hiệu năng: 200 con trong cảnh bench)
const shadeGeo = new THREE.SphereGeometry(0.8, 16, 12), rimGeo = new THREE.SphereGeometry(0.88, 16, 12), eyeGeo = new THREE.SphereGeometry(0.1, 8, 6);
const shadeMat = mat(0xffffff);
const rimMat = new THREE.MeshBasicMaterial({ color: C.shadeRim, side: THREE.BackSide });
const eyeMat = new THREE.MeshBasicMaterial({ color: 0xd9b3ff });
// InstancedMesh: mọi Bóng Mực / đom đóm vẽ bằng vài draw call (cảnh bench 200 Bóng Mực + 100 đom đóm)
const MAX_SHADES = 256, MAX_MOTES = 512;
const inst = (g: THREE.BufferGeometry, m: THREE.Material, n: number) => { const im = new THREE.InstancedMesh(g, m, n); im.count = 0; im.frustumCulled = false; scene.add(im); return im; };
const shadeIM = inst(shadeGeo, shadeMat, MAX_SHADES), rimIM = inst(rimGeo, rimMat, MAX_SHADES), eyeIM = inst(eyeGeo, eyeMat, MAX_SHADES * 2);
const moteCoreIM = inst(moteCoreGeo, moteCoreMat, MAX_MOTES), moteHaloIM = inst(moteHaloGeo, moteHaloMat, MAX_MOTES);
shadeIM.setColorAt(0, new THREE.Color(C.shade));
const dummy = new THREE.Object3D(), tmpM = new THREE.Matrix4(), eyeL = new THREE.Matrix4().makeTranslation(-0.25, 0.2, 0.7), eyeR = new THREE.Matrix4().makeTranslation(0.25, 0.2, 0.7);
const colShade = new THREE.Color(C.shade), colStun = new THREE.Color(C.shadeStun);
const tmpV = new THREE.Vector3();

function floorMesh(f: Floor): THREE.Object3D {
  const top = (h: number) => (h > 0 ? C.sand : C.grass);
  switch (f.kind) {
    case 'disc': {
      const depth = f.h > 6 ? 8 : f.h + 3;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(f.r, f.r * (f.h > 6 ? 1 : 0.92), depth, 64), mat(f.h > 6 ? C.wood : top(f.h)));
      m.position.set(f.cx, f.h - depth / 2, f.cz); return m;
    }
    case 'halfAnnulus': {
      const s = new THREE.Shape();
      s.absarc(0, 0, f.rMax, Math.PI, 2 * Math.PI, false);
      s.absarc(0, 0, f.rMin, 2 * Math.PI, Math.PI, true);
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: f.h, bevelEnabled: false, curveSegments: 32 }), mat(C.sand));
      m.rotation.x = -Math.PI / 2; return m;
    }
    case 'rect': {
      const m = new THREE.Mesh(new THREE.BoxGeometry(f.x1 - f.x0, 0.4, f.z1 - f.z0), mat(C.wood));
      m.position.set((f.x0 + f.x1) / 2, f.h - 0.2, (f.z0 + f.z1) / 2); return m;
    }
    case 'ramp': {
      const a = (f.deg * Math.PI) / 180, ux = Math.cos(a), uz = Math.sin(a);
      const len = Math.hypot(f.rLow - f.rHigh, f.hHigh - f.hLow);
      const m = new THREE.Mesh(new THREE.BoxGeometry(f.width, 0.3, len), mat(C.wood));
      const rm = (f.rLow + f.rHigh) / 2;
      m.position.set(ux * rm, (f.hLow + f.hHigh) / 2 - 0.15, uz * rm);
      m.lookAt(ux * f.rHigh, f.hHigh - 0.15, uz * f.rHigh); return m;
    }
  }
}

function buildWorld(): void {
  scene.remove(world);
  world = new THREE.Group();
  scene.add(world);
  for (const m of [drifterViews, charmViews]) m.clear();
  const map = getMap(night);
  for (const f of map.floors) world.add(floorMesh(f));
  for (const pad of map.pads) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(pad.r, pad.r, 0.15, 24), mat(C.gold, C.gold, 0.8));
    m.position.set(pad.x, pad.y + 0.08, pad.z); world.add(m);
  }
  lanternViews = sim.lanterns.map((l) => {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 3, 8), mat(C.wood));
    pole.position.y = 1.5; g.add(pole);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), mat(C.off, C.lit, 0));
    head.position.y = 3.3; g.add(head);
    const light = new THREE.PointLight(C.lit, 0, 24);
    light.position.y = 3.3; g.add(light);
    const safe = new THREE.Mesh(new THREE.RingGeometry(tuning.safe_radius - 0.12, tuning.safe_radius, 64), new THREE.MeshBasicMaterial({ color: C.lit, transparent: true, opacity: 0, side: THREE.DoubleSide }));
    safe.rotation.x = -Math.PI / 2; safe.position.y = 0.04; g.add(safe);
    // thanh dầu (Ticket-03) + vết rách giấy khi tắt (chế độ dễ phân biệt)
    const barBg = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6 }));
    barBg.position.y = 4.3; g.add(barBg);
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.16), new THREE.MeshBasicMaterial({ color: C.lit }));
    bar.position.set(0, 4.3, 0.01); g.add(bar);
    const tear = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 1.25), new THREE.MeshBasicMaterial({ color: 0x0b0b10 }));
    tear.position.y = 3.3; tear.rotation.z = 0.5; g.add(tear);
    g.position.set(l.x, l.y, l.z);
    world.add(g);
    return { head, light, safe, bar, barBg, tear };
  });
}

// ---------- input ----------
const keys = new Set<string>();
let camYaw = 0;
let dragging = false;
addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  if (capturing) { e.preventDefault(); settings.keys[capturing] = e.code; capturing = null; saveSettings(); renderKeymap(); return; }
  if ((e.code === settings.keys.pause || e.code === 'KeyP') && (mode === 'play' || mode === 'pause')) togglePause();
});
addEventListener('keyup', (e) => keys.delete(e.code));
renderer.domElement.addEventListener('mousedown', () => { dragging = true; audio.ensure(); });
addEventListener('mouseup', () => { dragging = false; });
addEventListener('mousemove', (e) => { if (dragging) camYaw -= e.movementX * settings.sens; });
let pauseRequest = false;

function readInput(): InputState {
  const k = (c: string) => keys.has(c);
  const K = settings.keys;
  const fwd = (k(K.up) || k('ArrowUp') ? 1 : 0) - (k(K.down) || k('ArrowDown') ? 1 : 0);
  // Camera nhìn theo +Z khi yaw 0 nên "phải màn hình" là −X của contract: phải → move.x = −1.
  const right = (k(K.right) ? 1 : 0) - (k(K.left) ? 1 : 0);
  return { ...emptyInput(), move: [-right, fwd], cam_yaw_deg: camYaw, jump: k(K.jump), interact: k(K.interact),
    pulse: k(K.pulse), dash: k(K.dash), pause: pauseRequest };
}

// ---------- màn hình ----------
type Mode = 'menu' | 'intro' | 'play' | 'pause' | 'result' | 'dawn' | 'settings' | 'board' | 'bench';
let mode: Mode = 'menu';
let settingsReturn: Mode = 'menu';
function show(m: Mode): void {
  mode = m;
  for (const id of ['menu', 'intro', 'result', 'dawn', 'pause', 'settings', 'board']) $(`scr-${id}`).style.display = id === m ? 'flex' : 'none';
  for (const el of document.querySelectorAll<HTMLElement>('.hud')) el.style.visibility = m === 'play' || m === 'pause' || m === 'bench' ? 'visible' : 'hidden';
  if (m === 'board') void renderBoard();
  if (m === 'settings') renderKeymap();
}
let sessionSeed = 0, nightsWon = 0;
function startNight(n: number): void {
  night = n;
  const seed = params.has('seed') ? Number(params.get('seed')) : Math.floor(Math.random() * 1e9);
  if (n === 1) { sessionSeed = seed; nightsWon = 0; }
  lowWarned.clear(); warnedWind = -1; warned10 = false;
  sim = new Sim(tuning, seed, n);
  camYaw = 0;
  buildWorld();
  $('intro-night').textContent = `Đêm ${n}`;
  $('intro-name').textContent = sim.map.name;
  $('intro-quote').textContent = INTRO[n];
  show('intro');
}
function togglePause(): void { pauseRequest = true; }
document.addEventListener('click', (e) => {
  const act = (e.target as HTMLElement).dataset?.act;
  if (!act) return;
  audio.ensure();
  if (act === 'start') { totalScore = 0; startNight(1); }
  else if (act === 'board') show('board');
  else if (act === 'save-score') void saveScore();
  else if (act === 'keys-default') { settings.keys = { ...DEFAULT_KEYS }; saveSettings(); renderKeymap(); }
  else if (act.startsWith('key:')) { capturing = act.slice(4) as Action; renderKeymap(); }
  else if (act === 'play') { show('play'); acc = 0; }
  else if (act === 'resume') togglePause();
  else if (act === 'retry') startNight(night);
  else if (act === 'next') startNight(night + 1);
  else if (act === 'menu') show('menu');
  else if (act === 'settings') { settingsReturn = mode; show('settings'); }
  else if (act === 'back') show(settingsReturn);
});
const volEl = $('set-vol') as HTMLInputElement, sensEl = $('set-sens') as HTMLInputElement, cbEl = $('set-cb') as HTMLInputElement;
cbEl.checked = settings.cb;
cbEl.addEventListener('change', () => { settings.cb = cbEl.checked; saveSettings(); });
const rmEl = $('set-rm') as HTMLInputElement, bigEl = $('set-big') as HTMLInputElement;
rmEl.checked = settings.rm; bigEl.checked = settings.big;
rmEl.addEventListener('change', () => { settings.rm = rmEl.checked; saveSettings(); });
bigEl.addEventListener('change', () => { settings.big = bigEl.checked; document.documentElement.classList.toggle('big', settings.big); saveSettings(); });

// ---------- đổi phím ----------
let capturing: Action | null = null;
const keyName = (c: string) => c.replace(/^Key/, '').replace(/^Digit/, '').replace('ShiftLeft', 'Shift trái').replace('ShiftRight', 'Shift phải').replace('Space', 'Space');
function renderKeymap(): void {
  const used = new Map<string, Action[]>();
  for (const [a] of ACTIONS) used.set(settings.keys[a], [...(used.get(settings.keys[a]) ?? []), a]);
  const dups = [...used.entries()].filter(([, as]) => as.length > 1);
  $('keymap').innerHTML = ACTIONS.map(([a, label]) => {
    const dup = (used.get(settings.keys[a]) ?? []).length > 1;
    return `<div class="keyrow"><span>${label}</span><button data-act="key:${a}" class="${dup ? 'dup' : ''}">${capturing === a ? 'Nhấn phím…' : keyName(settings.keys[a])}</button></div>`;
  }).join('');
  $('key-warn').textContent = dups.length ? `⚠ Trùng phím: ${dups.map(([k, as]) => `${keyName(k)} → ${as.map((x) => ACTIONS.find((y) => y[0] === x)![1]).join(' & ')}`).join('; ')}` : '';
}

// ---------- bảng xếp hạng (lưu đĩa qua server; không có server thì localStorage) ----------
const lbForm = $('lb-form'); lbForm.style.display = 'none';
function offerSave(where: string): void { $(where).insertBefore(lbForm, $(where).querySelector('button')); lbForm.style.display = 'flex'; $('lb-msg').textContent = ''; (lbForm.querySelector('button') as HTMLButtonElement).disabled = false; }
async function loadBoard(): Promise<LeaderboardEntry[]> {
  try { const r = await fetch('api/leaderboard'); if (r.ok) return (await r.json()).entries; } catch { /* không có server */ }
  try { return sortEntries(JSON.parse(localStorage.getItem('ddl-leaderboard') ?? '[]').map(validateEntry).filter(Boolean)); } catch { return []; }
}
async function saveScore(): Promise<void> {
  const name = validateName(($('lb-name') as HTMLInputElement).value);
  if (!name) { $('lb-msg').textContent = '⚠ Tên 3–12 ký tự: chữ (có dấu), số hoặc _'; return; }
  const e: LeaderboardEntry = { name, score: totalScore, nights_won: nightsWon, achieved_at: isoLocal(new Date()), seed: sessionSeed };
  let rank = 0;
  try {
    const r = await fetch('api/leaderboard', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(e) });
    if (!r.ok) throw new Error(String(r.status));
    rank = (await r.json()).rank;
  } catch {
    const res = addEntry(await loadBoard(), e); rank = res.rank;
    try { localStorage.setItem('ddl-leaderboard', JSON.stringify(res.entries)); } catch { /* bỏ qua */ }
  }
  $('lb-msg').textContent = rank ? `Đã lưu — hạng ${rank}` : 'Đã lưu (chưa vào top 10)';
  (lbForm.querySelector('button') as HTMLButtonElement).disabled = true;
}
async function renderBoard(): Promise<void> {
  const es = await loadBoard();
  $('board-table').innerHTML = '<tr><th>#</th><th>Tên</th><th>Điểm</th><th>Đêm thắng</th><th>Lúc</th></tr>' +
    (es.length ? es.map((e, i) => `<tr><td>${i + 1}</td><td>${e.name.replace(/[<>&]/g, '')}</td><td>${e.score}</td><td>${e.nights_won}</td><td>${e.achieved_at.slice(0, 16).replace('T', ' ')}</td></tr>`).join('') : '<tr><td colspan="5">Chưa có ai</td></tr>');
}

// ---------- phụ đề / chỉ báo ----------
const lowWarned = new Set<string>();
let warnedWind = -1, warned10 = false, shadeArrowUntil = 0, shadeArrowId = '', shakeUntil = 0;
function caption(text: string, ms = 3500): void {
  const d = document.createElement('div'); d.textContent = text; $('captions').appendChild(d);
  setTimeout(() => d.remove(), ms);
}
volEl.value = String(settings.volume); sensEl.value = String(settings.sens);
volEl.addEventListener('input', () => { settings.volume = Number(volEl.value); audio.setVolume(settings.volume); saveSettings(); });
sensEl.addEventListener('input', () => { settings.sens = Number(sensEl.value); saveSettings(); });

function onEvents(evs: GameEvent[]): void {
  for (const e of evs) {
    const d = e.data as Record<string, unknown>;
    switch (e.name) {
      case 'mote_picked': case 'charm_picked': audio.play('pickup'); break;
      case 'lantern_lit': case 'refuel': audio.play('lit'); break;
      case 'lantern_out': audio.play('lose'); break;
      case 'pulse': audio.play('pulse'); ringT = 0; break;
      case 'player_hit': case 'drifter_steal': audio.play('hit');
        if (!settings.rm) { shakeUntil = performance.now() + 300; const f = $('flash'); f.style.transition = 'none'; f.style.opacity = '0.35'; requestAnimationFrame(() => { f.style.transition = 'opacity .4s'; f.style.opacity = '0'; }); }
        break;
      case 'dash': audio.play('dash'); break;
      case 'shade_spawned': audio.play('shade'); caption('⚠ Bóng Mực xuất hiện'); shadeArrowId = String(d.id); shadeArrowUntil = performance.now() + 3500; break;
      case 'lantern_out': caption(`🏮 Đèn ${d.lantern_id} đã tắt`); break;
      case 'paused': show('pause'); break;
      case 'resumed': show('play'); break;
      case 'game_over': {
        const won = d.result === 'won';
        audio.play(won ? 'win' : 'lose');
        if (won) { totalScore += sim.score; nightsWon++; }
        if (won && night === 3) { $('dawn-score').textContent = `Tổng điểm: ${totalScore}`; show('dawn'); offerSave('scr-dawn'); break; }
        $('res-title').textContent = won ? `${sim.map.name} sáng tới bình minh!` : d.reason === 'dawn' ? `Bình minh nhưng chỉ ${sim.litCount}/${sim.winNeed} đèn sáng…` : 'Mây đã hết Ngọn Lửa…';
        $('res-text').innerHTML = `Điểm Đêm ${night}: <b>${won ? sim.score : 0}</b> · Tổng: <b>${totalScore}</b>`;
        $('res-next').style.display = won ? '' : 'none';
        $('res-retry').style.display = won ? 'none' : '';
        show('result');
        if (!won) offerSave('scr-result'); else lbForm.style.display = 'none';
      }
    }
  }
}

// ---------- đồng bộ hình ----------
function sync(dt: number, time: number): void {
  const p = sim.player;
  player.position.set(p.x, p.y, p.z);
  player.rotation.y = Math.atan2(p.fx, p.fz);
  player.visible = p.respawnWait === 0 && (p.invuln === 0 || Math.floor(time * 12) % 2 === 0);
  const blinkSlow = Math.floor(time * 2) % 2 === 0; // 1 Hz
  sim.lanterns.forEach((l, i) => {
    const v = lanternViews[i];
    const m = v.head.material as THREE.MeshStandardMaterial;
    const fuel = sim.fuel(l), low = l.lit && fuel < tuning.low_fuel_threshold;
    const on = l.lit && (!low || blinkSlow);
    m.color.setHex(l.lit ? C.core : C.off);
    m.emissiveIntensity = on ? 2.2 : l.lit ? 0.6 : (l.deposited / (l.everLit ? tuning.relight_cost : tuning.lantern_cost)) * 0.9;
    v.light.intensity = on ? 45 : 12;
    v.light.visible = l.lit; // đèn tắt không tốn chi phí chiếu sáng
    (v.safe.material as THREE.MeshBasicMaterial).opacity = sim.isSafe(l) ? 0.35 : 0;
    v.bar.visible = v.barBg.visible = l.lit && (!low || blinkSlow);
    v.bar.scale.x = Math.max(0.001, fuel / tuning.fuel_max); v.bar.position.x = -0.7 * (1 - v.bar.scale.x);
    (v.bar.material as THREE.MeshBasicMaterial).color.setHex(low ? (settings.cb ? 0xffffff : 0xff5a5f) : C.lit);
    v.bar.lookAt(camera.position); v.barBg.lookAt(camera.position);
    // đèn tắt: xẹp 20% + vết rách (phân biệt không cần màu)
    v.head.scale.set(1, l.lit ? 1 : 0.8, 1);
    v.tear.visible = !l.lit;
  });
  let mi = 0;
  for (const m of sim.motes) {
    if (mi >= MAX_MOTES) break;
    const vis = m.kind === 'random' || m.ttl > 120 || Math.floor(time * 8) % 2 === 0;
    dummy.position.set(m.x, m.y + 0.6 + Math.sin(time * 3 + m.x) * 0.15, m.z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(vis ? 1 : 0); dummy.updateMatrix();
    moteCoreIM.setMatrixAt(mi, dummy.matrix); moteHaloIM.setMatrixAt(mi, dummy.matrix); mi++;
  }
  moteCoreIM.count = moteHaloIM.count = mi;
  moteCoreIM.instanceMatrix.needsUpdate = moteHaloIM.instanceMatrix.needsUpdate = true;
  let si = 0;
  for (const s of sim.shades) {
    if (si >= MAX_SHADES) break;
    dummy.position.set(s.x, s.y + Math.sin(time * 2 + s.x) * 0.12, s.z);
    dummy.rotation.set(0, Math.atan2(p.x - s.x, p.z - s.z), 0);
    dummy.scale.setScalar(s.state === 'spawning' ? 0.4 + 0.6 * (1 - s.stateTicks / 60) : s.state === 'stunned' ? 0.8 : 1);
    dummy.updateMatrix();
    shadeIM.setMatrixAt(si, dummy.matrix);
    shadeIM.setColorAt(si, s.state === 'stunned' ? colStun : colShade);
    if (s.state === 'stunned') { tmpM.makeScale(0, 0, 0); rimIM.setMatrixAt(si, tmpM); } else rimIM.setMatrixAt(si, dummy.matrix);
    eyeIM.setMatrixAt(si * 2, tmpM.multiplyMatrices(dummy.matrix, eyeL));
    eyeIM.setMatrixAt(si * 2 + 1, tmpM.multiplyMatrices(dummy.matrix, eyeR));
    si++;
  }
  shadeIM.count = rimIM.count = si; eyeIM.count = si * 2;
  shadeIM.instanceMatrix.needsUpdate = rimIM.instanceMatrix.needsUpdate = eyeIM.instanceMatrix.needsUpdate = true;
  if (shadeIM.instanceColor) shadeIM.instanceColor.needsUpdate = true;
  for (const d of sim.drifters) {
    let v = drifterViews.get(d.id);
    if (!v) { v = new THREE.Mesh(new THREE.TorusKnotGeometry(0.45, 0.08, 48, 6), mat(C.drifter, C.drifter, 0.4)); drifterViews.set(d.id, v); world.add(v); }
    v.visible = d.state !== 'removed';
    v.position.set(d.x, d.y, d.z); v.rotation.y = time * 4;
  }
  for (const c of sim.charms) {
    let v = charmViews.get(c.id);
    if (!v) {
      v = new THREE.Group();
      v.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.05), mat(C.scarf, C.scarf, 0.4)));
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.56, 0.76, 0.06)), new THREE.LineBasicMaterial({ color: C.gold }));
      v.add(edge); charmViews.set(c.id, v); world.add(v);
    }
    v.visible = c.available; v.position.set(c.x, c.y + 0.9 + Math.sin(time * 2) * 0.1, c.z); v.rotation.y = time;
  }
  rimMat.color.setHex(settings.cb ? 0x00b3ff : C.shadeRim);
  eyeMat.color.setHex(settings.cb ? 0x00b3ff : 0xd9b3ff);
  // Ánh sáng môi trường = 0.15 + 0.55 × tiến độ
  ambient.intensity = 0.15 + 0.55 * (sim.litCount / sim.lanterns.length);
  ringT = Math.min(1, ringT + dt / 0.4);
  ring.position.set(p.x, p.y + 0.05, p.z);
  ring.scale.setScalar(0.5 + ringT * tuning.pulse_radius);
  (ring.material as THREE.MeshBasicMaterial).opacity = (1 - ringT) * 0.8;
  const h = (camYaw * Math.PI) / 180, fx = Math.sin(h), fz = Math.cos(h);
  const shake = !settings.rm && performance.now() < shakeUntil ? (Math.random() - 0.5) * 0.4 : 0;
  camera.position.set(p.x - fx * 9 + shake, p.y + 5.5 + shake, p.z - fz * 9);
  camera.lookAt(p.x + fx * 2, p.y + 1, p.z + fz * 2);
  hud();
}

let lastWhole = -1;
function hud(): void {
  const p = sim.player, tl = Math.max(0, sim.timeLeft);
  setHTML('hud-flames', '🔥'.repeat(p.flames) + '·'.repeat(Math.max(0, tuning.flames - p.flames)));
  const clock = $('hud-clock');
  let clockText = `${String(Math.floor(tl / 60)).padStart(2, '0')}:${String(Math.floor(tl % 60)).padStart(2, '0')}`;
  clock.classList.toggle('danger', tl <= 30);
  clock.classList.toggle('cb', settings.cb);
  if (tl <= 30 && settings.cb) clockText = `⚠ ${clockText}`;
  setHTML('hud-clock', clockText);
  const whole = Math.ceil(tl);
  if (tl <= 10 && whole !== lastWhole && mode === 'play') audio.play('tick');
  lastWhole = whole;
  setHTML('hud-right', `Đèn sáng <b>${sim.litCount}/${sim.lanterns.length}</b> (cần ${sim.winNeed})<br>Điểm <b>${sim.score}</b>${totalScore ? `<br><span style="opacity:.7">Tổng ${totalScore}</span>` : ''}`);
  setHTML('hud-bar', Array.from({ length: sim.capacity }, (_, i) => `<i class="${i < p.carried ? 'on' : ''}"></i>`).join('') + `<span style="margin-left:8px">${p.carried}/${sim.capacity}</span>`);
  const cd = (id: string, left: number, total: number, ready: boolean) => {
    const el = $(id); (el.querySelector('.fill') as HTMLElement).style.height = `${(1 - left / total) * 100}%`; el.classList.toggle('off', !ready);
  };
  cd('cd-dash', p.charm > 0 ? 0 : p.dashCd, sim.K.dashCd, p.dashCd === 0 || p.charm > 0);
  cd('cd-pulse', p.pulseCd, sim.K.pulseCd, p.pulseCd === 0 && p.carried >= tuning.pulse_cost);
  // Nhắc nạp ánh sáng khi đứng gần đèn chưa sáng
  let near: (typeof sim.lanterns)[number] | undefined, nearD = Infinity, target: (typeof sim.lanterns)[number] | undefined, targetD = Infinity;
  for (const l of sim.lanterns) { // vòng lặp không cấp phát
    const dl = Math.hypot(l.x - p.x, l.z - p.z);
    if ((!l.lit || sim.fuel(l) < tuning.fuel_max) && dl <= tuning.interact_radius && dl < nearD) { near = l; nearD = dl; }
    if ((!l.lit || sim.fuel(l) < tuning.low_fuel_threshold) && dl < targetD) { target = l; targetD = dl; }
  }
  const pr = $('hud-prompt');
  pr.style.display = near ? 'block' : 'none';
  if (near) pr.textContent = near.lit ? `E — Châm dầu (${Math.floor(sim.fuel(near))}/${tuning.fuel_max})` : `E — Nạp ánh sáng (${near.deposited}/${near.everLit ? tuning.relight_cost : tuning.lantern_cost})`;
  // Mũi tên tới đèn chưa sáng gần nhất khi nó ở ngoài màn hình
  const arrow = $('hud-arrow');
  if (target) {
    const v = tmpV.set(target.x, target.y + 3, target.z).project(camera);
    const behind = v.z > 1;
    let x = behind ? -v.x : v.x, y = behind ? -v.y : v.y;
    const off = behind || Math.abs(x) > 1 || Math.abs(y) > 1;
    arrow.style.display = off ? 'block' : 'none';
    if (off) {
      const k = 0.85 / Math.max(Math.abs(x), Math.abs(y), 1e-6); x *= k; y *= k;
      arrow.style.left = `${(x * 0.5 + 0.5) * innerWidth - 14}px`; arrow.style.top = `${(-y * 0.5 + 0.5) * innerHeight - 15}px`;
      arrow.style.transform = `rotate(${Math.atan2(x, y)}rad)`;
    }
  } else arrow.style.display = 'none';
  // Báo trước gió 2 s (Đêm 3)
  const toGust = WIND_EVERY - (sim.simTick % WIND_EVERY);
  const windSoon = sim.windEnabled && !sim.wind.active && toGust <= 120;
  $('hud-wind').style.display = windSoon ? 'block' : 'none';
  if (mode === 'play') {
    const gust = Math.floor(sim.simTick / WIND_EVERY);
    if (windSoon && warnedWind !== gust) { warnedWind = gust; caption('🍃 Gió sắp thổi'); }
    if (tl <= 10 && !warned10) { warned10 = true; caption('⏳ 10 giây cuối — giữ đèn sáng!'); }
    for (const l of sim.lanterns) {
      const low = l.lit && sim.fuel(l) < tuning.low_fuel_threshold;
      if (low && !lowWarned.has(l.id)) { lowWarned.add(l.id); caption(`🏮 Đèn ${l.id} sắp cạn dầu`); }
      if (!low) lowWarned.delete(l.id);
    }
  }
  // Mũi tên mép màn hình chỉ Bóng Mực vừa xuất hiện
  const sa = $('hud-shade-arrow'), sh = sim.shades.find((s) => s.id === shadeArrowId);
  if (sh && performance.now() < shadeArrowUntil) {
    const v = tmpV.set(sh.x, sh.y, sh.z).project(camera);
    const behind = v.z > 1; let x = behind ? -v.x : v.x, y = behind ? -v.y : v.y;
    const kk = 0.8 / Math.max(Math.abs(x), Math.abs(y), 1e-6); if (behind || Math.abs(x) > 1 || Math.abs(y) > 1) { x *= kk; y *= kk; }
    sa.style.display = 'block'; sa.style.borderBottomColor = settings.cb ? '#00B3FF' : '#7A3CFF';
    sa.style.left = `${(x * 0.5 + 0.5) * innerWidth - 14}px`; sa.style.top = `${(-y * 0.5 + 0.5) * innerHeight - 15}px`; sa.style.transform = `rotate(${Math.atan2(x, y)}rad)`;
  } else sa.style.display = 'none';
}

// ---------- vòng lặp ----------
let acc = 0, last = performance.now();
const STEP = 1 / 60;
const fpsEl = $('fps');
const fps = { frames: 0, time: 0, avg: 0 };
(window as unknown as { __fps: typeof fps }).__fps = fps;
if (params.has('fps')) fpsEl.style.display = 'block';
let wasGrounded = true;
function frame(now: number): void {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  fps.frames++; fps.time += dt; fps.avg = fps.frames / fps.time;
  if (params.has('fps')) fpsEl.textContent = `${(1 / Math.max(dt, 1e-3)).toFixed(0)} fps · tb ${fps.avg.toFixed(1)} · ${innerWidth}×${innerHeight}`;
  if (sim && (mode === 'play' || mode === 'pause')) {
    acc += dt;
    while (acc >= STEP) {
      acc -= STEP;
      const inp = readInput();
      pauseRequest = false;
      onEvents(sim.step(inp)); // khi đang dừng, core chỉ tăng tick — logic đứng yên hoàn toàn
      if (wasGrounded && !sim.player.grounded && sim.player.vy > 6) audio.play('jump');
      wasGrounded = sim.player.grounded;
      if (mode !== 'play' && mode !== 'pause') break;
    }
  }
  if (mode === 'bench') { acc += dt; while (acc >= STEP) { acc -= STEP; sim.step(emptyInput()); } }
  if (keys.has('KeyJ')) camYaw += 120 * dt;
  if (keys.has('KeyL')) camYaw -= 120 * dt;
  if (sim) sync(dt, now / 1000);
  if (mode === 'bench') benchFrame(now);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
// ---------- benchmark (Ticket-04 §1) ----------
// Cảnh chuẩn: Đêm 1, 200 Bóng Mực wander rải đều trên đảo (seed), 100 đom đóm, L1–L3 sáng fuel 100; không input;
// camera bay vòng tâm (0,0,0) bán kính 30 m, Y = 15 m, bắt đầu (30,15,0), ngược kim đồng hồ nhìn từ trên, 15 s/vòng.
const bench = { on: params.has('bench'), seed: Number(params.get('seed') ?? 42), duration: Number(params.get('duration') ?? 30), t0: -1, first: -1, startedMeasure: false, dts: [] as number[], last: -1, done: false, longAt: [] as number[], pinged: false };
function startBench(): void {
  const rng = new Rng(bench.seed);
  const disc = (): [number, number] => { const r = 38 * Math.sqrt(rng.next()), a = rng.next() * 2 * Math.PI; return [r * Math.cos(a), r * Math.sin(a)]; };
  const shades = Array.from({ length: 200 }, (_, i) => { const [x, z] = disc(); return { id: `S${i + 1}`, pos: [x, 1, z] as [number, number, number], state: 'wander' as const }; });
  const motes = Array.from({ length: 100 }, () => { const [x, z] = disc(); return [x, 0, z] as [number, number, number]; });
  sim = new Sim(tuning, bench.seed, 1, { random_motes: false, random_shades: false, random_drifters: false, motes, shades,
    lanterns: [{ id: 'L1', lit: true, fuel: 100 }, { id: 'L2', lit: true, fuel: 100 }, { id: 'L3', lit: true, fuel: 100 }] });
  sim.bench = true;
  night = 1; buildWorld(); show('bench');
  sync(0, 0); renderer.compile(scene, camera); // biên dịch shader trong lúc khởi động, không để rơi vào khoảng đo
}
function benchFrame(now: number): void {
  if (bench.first < 0) { bench.first = now; bench.t0 = now; }
  const t = (now - bench.t0) / 1000;
  const th = (2 * Math.PI * t) / 15; // ngược kim đồng hồ nhìn từ trên: (30·cosθ, 15, 30·sinθ)
  camera.position.set(30 * Math.cos(th), 15, 30 * Math.sin(th));
  camera.lookAt(0, 0, 0);
  if (bench.done) return;
  if (t >= 2.5 && !bench.pinged) { bench.pinged = true; void fetch('api/bench-start', { method: 'POST' }).catch(() => {}); } // báo launcher trong lúc khởi động
  if (t >= 3) {
    if (!bench.startedMeasure) { bench.startedMeasure = true; bench.last = now; return; }
    const dtm = now - bench.last; bench.dts.push(dtm); bench.last = now;
    if (dtm > 33 && bench.longAt.length < 80) bench.longAt.push(Math.round((t - 3) * 1000)); // chẩn đoán: thời điểm khung chậm (ms từ lúc bắt đầu đo)
    if (t >= 3 + bench.duration) finishBench();
  }
}
function finishBench(): void {
  bench.done = true;
  const dts = bench.dts, N = dts.length, sum = dts.reduce((a, b) => a + b, 0);
  const sorted = [...dts].sort((a, b) => a - b);
  const k = Math.max(1, Math.ceil(0.01 * N));
  const worst = sorted.slice(N - k);
  const p95 = sorted[Math.min(N - 1, Math.ceil(0.95 * N) - 1)];
  const gl = renderer.getContext();
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const r = {
    avg_fps: Math.round((1000 * N / sum) * 10) / 10,
    p1_low_fps: Math.round((1000 / (worst.reduce((a, b) => a + b, 0) / k)) * 10) / 10,
    frame_ms_p95: Math.round(p95 * 100) / 100, frames: N,
    first_frame_epoch_ms: performance.timeOrigin + bench.first, load_ms_page: Math.round(bench.first),
    gl_renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), viewport: `${innerWidth}×${innerHeight}`,
    long_frames: dts.filter((d) => d > 33).length, long_frame_at_ms: bench.longAt, worst_ms: Math.round(sorted[N - 1]),
  };
  caption(`Bench xong: ${JSON.stringify(r)}`, 600000);
  (window as unknown as { __bench: typeof r }).__bench = r;
  void fetch('api/bench', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(r) }).catch(() => {});
}

if (bench.on) startBench();
else { startNight(params.has('night') ? Number(params.get('night')) : 1); show(params.has('night') ? 'intro' : 'menu'); }
requestAnimationFrame(frame);
(window as unknown as { __game: () => Sim }).__game = () => sim;
