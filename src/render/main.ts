// Phần hiển thị: chỉ đọc state từ core (Sim) và gửi InputState. Không chứa luật game.
import * as THREE from 'three';
import { Sim, emptyInput, WIND_EVERY } from '../core/sim.ts';
import { getMap } from '../core/map.ts';
import type { Floor } from '../core/map.ts';
import { parseTuning } from '../core/tuning.ts';
import type { GameEvent, InputState, Tuning } from '../core/types.ts';
import { Audio } from './audio.ts';

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
// Tham số qua ?query hoặc #hash (trang artifact chỉ giữ #hash), ví dụ #fps&night=2
const params = new URLSearchParams(`${location.search.slice(1)}&${location.hash.slice(1)}`);
const audio = new Audio();

// Cài đặt (lưu giữa các lần mở game)
const settings = { volume: 0.6, sens: 0.3, cb: false };
try { Object.assign(settings, JSON.parse(localStorage.getItem('ddl-settings') ?? '{}')); } catch { /* storage có thể bị chặn */ }
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
  for (const m of [moteViews, shadeViews, drifterViews, charmViews]) m.clear();
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
  if ((e.code === 'Escape' || e.code === 'KeyP') && (mode === 'play' || mode === 'pause')) togglePause();
});
addEventListener('keyup', (e) => keys.delete(e.code));
renderer.domElement.addEventListener('mousedown', () => { dragging = true; audio.ensure(); });
addEventListener('mouseup', () => { dragging = false; });
addEventListener('mousemove', (e) => { if (dragging) camYaw -= e.movementX * settings.sens; });
let pauseRequest = false;

function readInput(): InputState {
  const k = (c: string) => keys.has(c);
  const fwd = (k('KeyW') || k('ArrowUp') ? 1 : 0) - (k('KeyS') || k('ArrowDown') ? 1 : 0);
  // Camera nhìn theo +Z khi yaw 0 nên "phải màn hình" là −X của contract: D → move.x = −1.
  const right = (k('KeyD') ? 1 : 0) - (k('KeyA') ? 1 : 0);
  return { ...emptyInput(), move: [-right, fwd], cam_yaw_deg: camYaw, jump: k('Space'), interact: k('KeyE'),
    pulse: k('KeyQ') || k('KeyF'), dash: k('ShiftLeft') || k('ShiftRight'), pause: pauseRequest };
}

// ---------- màn hình ----------
type Mode = 'menu' | 'intro' | 'play' | 'pause' | 'result' | 'dawn' | 'settings';
let mode: Mode = 'menu';
let settingsReturn: Mode = 'menu';
function show(m: Mode): void {
  mode = m;
  for (const id of ['menu', 'intro', 'result', 'dawn', 'pause', 'settings']) $(`scr-${id}`).style.display = id === m ? 'flex' : 'none';
  for (const el of document.querySelectorAll<HTMLElement>('.hud')) el.style.visibility = m === 'play' || m === 'pause' ? 'visible' : 'hidden';
}
function startNight(n: number): void {
  night = n;
  const seed = params.has('seed') ? Number(params.get('seed')) : Math.floor(Math.random() * 1e9);
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
      case 'player_hit': case 'drifter_steal': audio.play('hit'); break;
      case 'dash': audio.play('dash'); break;
      case 'shade_spawned': audio.play('shade'); break;
      case 'paused': show('pause'); break;
      case 'resumed': show('play'); break;
      case 'game_over': {
        const won = d.result === 'won';
        audio.play(won ? 'win' : 'lose');
        if (won) totalScore += sim.score;
        if (won && night === 3) { $('dawn-score').textContent = `Tổng điểm: ${totalScore}`; show('dawn'); break; }
        $('res-title').textContent = won ? `${sim.map.name} sáng tới bình minh!` : d.reason === 'dawn' ? `Bình minh nhưng chỉ ${sim.litCount}/${sim.winNeed} đèn sáng…` : 'Mây đã hết Ngọn Lửa…';
        $('res-text').innerHTML = `Điểm Đêm ${night}: <b>${won ? sim.score : 0}</b> · Tổng: <b>${totalScore}</b>`;
        $('res-next').style.display = won ? '' : 'none';
        $('res-retry').style.display = won ? 'none' : '';
        show('result');
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
    v.light.intensity = on ? 45 : l.lit ? 12 : 0;
    (v.safe.material as THREE.MeshBasicMaterial).opacity = sim.isSafe(l) ? 0.35 : 0;
    v.bar.visible = v.barBg.visible = l.lit && (!low || blinkSlow);
    v.bar.scale.x = Math.max(0.001, fuel / tuning.fuel_max); v.bar.position.x = -0.7 * (1 - v.bar.scale.x);
    (v.bar.material as THREE.MeshBasicMaterial).color.setHex(low ? (settings.cb ? 0xffffff : 0xff5a5f) : C.lit);
    v.bar.lookAt(camera.position); v.barBg.lookAt(camera.position);
    // đèn tắt: xẹp 20% + vết rách (phân biệt không cần màu)
    v.head.scale.set(1, l.lit ? 1 : 0.8, 1);
    v.tear.visible = !l.lit;
  });
  const seen = new Set<string>();
  for (const m of sim.motes) {
    seen.add(m.id);
    let v = moteViews.get(m.id);
    if (!v) { v = new THREE.Group(); v.add(new THREE.Mesh(moteCoreGeo, moteCoreMat), new THREE.Mesh(moteHaloGeo, moteHaloMat)); moteViews.set(m.id, v); world.add(v); }
    v.position.set(m.x, m.y + 0.6 + Math.sin(time * 3 + m.x) * 0.15, m.z);
    v.visible = m.kind === 'random' || m.ttl > 120 || Math.floor(time * 8) % 2 === 0;
  }
  for (const [id, v] of moteViews) if (!seen.has(id)) { world.remove(v); moteViews.delete(id); }
  for (const s of sim.shades) {
    let v = shadeViews.get(s.id);
    if (!v) {
      v = new THREE.Group();
      const blob = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 12), mat(C.shade));
      blob.name = 'blob'; v.add(blob);
      const rim = new THREE.Mesh(new THREE.SphereGeometry(0.88, 16, 12), new THREE.MeshBasicMaterial({ color: C.shadeRim, side: THREE.BackSide, transparent: true, opacity: 0.9 }));
      rim.name = 'rim'; v.add(rim); // viền #7A3CFF quanh thân #120A1A
      for (const dx of [-0.25, 0.25]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), mat(0xd9b3ff, C.shadeRim, 2)); eye.position.set(dx, 0.2, 0.7); v.add(eye); }
      shadeViews.set(s.id, v); world.add(v);
    }
    v.position.set(s.x, s.y + Math.sin(time * 2 + s.x) * 0.12, s.z);
    v.lookAt(p.x, v.position.y, p.z);
    const bm = (v.getObjectByName('blob') as THREE.Mesh).material as THREE.MeshStandardMaterial;
    bm.color.setHex(s.state === 'stunned' ? C.shadeStun : C.shade);
    const rim = v.getObjectByName('rim') as THREE.Mesh;
    rim.visible = s.state !== 'stunned';
    (rim.material as THREE.MeshBasicMaterial).color.setHex(settings.cb ? 0x00b3ff : C.shadeRim);
    v.children.forEach((c) => { if (c !== rim && c.name !== 'blob') ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).emissive.setHex(settings.cb ? 0x00b3ff : C.shadeRim); });
    v.scale.setScalar(s.state === 'spawning' ? 0.4 + 0.6 * (1 - s.stateTicks / 60) : s.state === 'stunned' ? 0.8 : 1);
  }
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
  // Ánh sáng môi trường = 0.15 + 0.55 × tiến độ
  ambient.intensity = 0.15 + 0.55 * (sim.litCount / sim.lanterns.length);
  ringT = Math.min(1, ringT + dt / 0.4);
  ring.position.set(p.x, p.y + 0.05, p.z);
  ring.scale.setScalar(0.5 + ringT * tuning.pulse_radius);
  (ring.material as THREE.MeshBasicMaterial).opacity = (1 - ringT) * 0.8;
  const h = (camYaw * Math.PI) / 180, fx = Math.sin(h), fz = Math.cos(h);
  camera.position.set(p.x - fx * 9, p.y + 5.5, p.z - fz * 9);
  camera.lookAt(p.x + fx * 2, p.y + 1, p.z + fz * 2);
  hud();
}

let lastWhole = -1;
function hud(): void {
  const p = sim.player, tl = Math.max(0, sim.timeLeft);
  $('hud-flames').textContent = '🔥'.repeat(p.flames) + '·'.repeat(Math.max(0, tuning.flames - p.flames));
  const clock = $('hud-clock');
  clock.textContent = `${String(Math.floor(tl / 60)).padStart(2, '0')}:${String(Math.floor(tl % 60)).padStart(2, '0')}`;
  clock.classList.toggle('danger', tl <= 30);
  clock.classList.toggle('cb', settings.cb);
  if (tl <= 30 && settings.cb) clock.textContent = `⚠ ${clock.textContent}`;
  const whole = Math.ceil(tl);
  if (tl <= 10 && whole !== lastWhole && mode === 'play') audio.play('tick');
  lastWhole = whole;
  $('hud-right').innerHTML = `Đèn sáng <b>${sim.litCount}/${sim.lanterns.length}</b> (cần ${sim.winNeed})<br>Điểm <b>${sim.score}</b>${totalScore ? `<br><span style="opacity:.7">Tổng ${totalScore}</span>` : ''}`;
  $('hud-bar').innerHTML = Array.from({ length: sim.capacity }, (_, i) => `<i class="${i < p.carried ? 'on' : ''}"></i>`).join('') + `<span style="margin-left:8px">${p.carried}/${sim.capacity}</span>`;
  const cd = (id: string, left: number, total: number, ready: boolean) => {
    const el = $(id); (el.querySelector('.fill') as HTMLElement).style.height = `${(1 - left / total) * 100}%`; el.classList.toggle('off', !ready);
  };
  cd('cd-dash', p.charm > 0 ? 0 : p.dashCd, sim.K.dashCd, p.dashCd === 0 || p.charm > 0);
  cd('cd-pulse', p.pulseCd, sim.K.pulseCd, p.pulseCd === 0 && p.carried >= tuning.pulse_cost);
  // Nhắc nạp ánh sáng khi đứng gần đèn chưa sáng
  const near = sim.lanterns.filter((l) => (!l.lit || sim.fuel(l) < tuning.fuel_max) && Math.hypot(l.x - p.x, l.z - p.z) <= tuning.interact_radius).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
  const pr = $('hud-prompt');
  pr.style.display = near ? 'block' : 'none';
  if (near) pr.textContent = near.lit ? `E — Châm dầu (${Math.floor(sim.fuel(near))}/${tuning.fuel_max})` : `E — Nạp ánh sáng (${near.deposited}/${near.everLit ? tuning.relight_cost : tuning.lantern_cost})`;
  // Mũi tên tới đèn chưa sáng gần nhất khi nó ở ngoài màn hình
  const target = sim.lanterns.filter((l) => !l.lit || sim.fuel(l) < tuning.low_fuel_threshold).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
  const arrow = $('hud-arrow');
  if (target) {
    const v = new THREE.Vector3(target.x, target.y + 3, target.z).project(camera);
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
  $('hud-wind').style.display = sim.windEnabled && !sim.wind.active && toGust <= 120 ? 'block' : 'none';
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
  if (keys.has('KeyJ')) camYaw += 120 * dt;
  if (keys.has('KeyL')) camYaw -= 120 * dt;
  if (sim) sync(dt, now / 1000);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
startNight(params.has('night') ? Number(params.get('night')) : 1);
show(params.has('night') ? 'intro' : 'menu');
requestAnimationFrame(frame);
(window as unknown as { __game: () => Sim }).__game = () => sim;
