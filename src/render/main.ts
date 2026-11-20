// Phần hiển thị: chỉ đọc state từ core (Sim) và gửi InputState. Không chứa luật game.
import * as THREE from 'three';
import { Sim, ISLAND_RADIUS, emptyInput } from '../core/sim.ts';
import { parseTuning } from '../core/tuning.ts';
import type { GameEvent, InputState, Tuning } from '../core/types.ts';

const tuning: Tuning = parseTuning(await (await fetch('game.contract.json')).json());
const hud = document.getElementById('hud')!;
const overlay = document.getElementById('overlay')!;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const NIGHT = new THREE.Color(0x140a24), DAWNISH = new THREE.Color(0x3a2340);
scene.background = NIGHT.clone();
scene.fog = new THREE.Fog(0x140a24, 18, 75);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 300);
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

const hemi = new THREE.HemisphereLight(0x6b5a9e, 0x1a0f2a, 0.5);
scene.add(hemi);
const moon = new THREE.DirectionalLight(0x9aa0ff, 0.35);
moon.position.set(-20, 40, 10);
scene.add(moon);

// Đảo + biển mây
const island = new THREE.Mesh(new THREE.CylinderGeometry(ISLAND_RADIUS, ISLAND_RADIUS - 3, 3, 64), new THREE.MeshStandardMaterial({ color: 0x2f4a3a, roughness: 1 }));
island.position.y = -1.5;
scene.add(island);
const clouds = new THREE.Mesh(new THREE.CircleGeometry(160, 48), new THREE.MeshStandardMaterial({ color: 0x3b2c5c, roughness: 1 }));
clouds.rotation.x = -Math.PI / 2; clouds.position.y = -4;
scene.add(clouds);

const mat = (color: number, emissive = 0, ei = 0) => new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: ei, roughness: 0.7 });

// Mây: thân + nón lá + đèn lồng nhỏ
const player = new THREE.Group();
const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.33, 0.6, 4, 12), mat(0x5b8fd6));
body.position.y = 0.65; player.add(body);
const hat = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.45, 24), mat(0xe8cf8a));
hat.position.y = 1.45; player.add(hat);
const mini = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), mat(0xffa040, 0xff8a20, 2));
mini.position.set(0.55, 1.05, 0.2); player.add(mini);
const miniLight = new THREE.PointLight(0xffa040, 6, 7);
miniLight.position.copy(mini.position); player.add(miniLight);
scene.add(player);

// Pulse ring
const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0, side: THREE.DoubleSide }));
ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05;
scene.add(ring);
let ringT = 1;

let sim: Sim;
let lanternViews: { g: THREE.Group; head: THREE.Mesh; light: THREE.PointLight; safe: THREE.Mesh }[] = [];
const moteViews = new Map<string, THREE.Mesh>();
const shadeViews = new Map<string, THREE.Group>();
const moteGeo = new THREE.SphereGeometry(0.12, 8, 6);
const moteMat = mat(0xfff2a0, 0xffe066, 2.5);

function clearDynamic(): void {
  for (const v of lanternViews) scene.remove(v.g);
  for (const m of moteViews.values()) scene.remove(m);
  for (const s of shadeViews.values()) scene.remove(s);
  lanternViews = []; moteViews.clear(); shadeViews.clear();
}

function newGame(): void {
  clearDynamic();
  const urlSeed = new URLSearchParams(location.search).get('seed');
  const seed = urlSeed !== null ? Number(urlSeed) : Math.floor(Math.random() * 1e9);
  sim = new Sim(tuning, seed);
  for (const l of sim.lanterns) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 3, 8), mat(0x4a3424));
    pole.position.y = 1.5; g.add(pole);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), mat(0x5a3a2a, 0xff9a3c, 0));
    head.position.y = 3.3; g.add(head);
    const light = new THREE.PointLight(0xffa24a, 0, 22);
    light.position.y = 3.3; g.add(light);
    const safe = new THREE.Mesh(new THREE.RingGeometry(tuning.safe_radius - 0.12, tuning.safe_radius, 64), new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0, side: THREE.DoubleSide }));
    safe.rotation.x = -Math.PI / 2; safe.position.y = 0.03; g.add(safe);
    g.position.set(l.x, 0, l.z);
    scene.add(g);
    lanternViews.push({ g, head, light, safe });
  }
  overlay.style.display = 'none';
  acc = 0;
}

// Input
const keys = new Set<string>();
let camYaw = 0;
addEventListener('keydown', (e) => { keys.add(e.code); if (e.code === 'KeyR') newGame(); if (e.code === 'Space') e.preventDefault(); });
addEventListener('keyup', (e) => keys.delete(e.code));
let dragging = false;
addEventListener('mousedown', () => { dragging = true; });
addEventListener('mouseup', () => { dragging = false; });
addEventListener('mousemove', (e) => { if (dragging) camYaw -= e.movementX * 0.3; });

function readInput(): InputState {
  const k = (c: string) => keys.has(c);
  const fwd = (k('KeyW') || k('ArrowUp') ? 1 : 0) - (k('KeyS') || k('ArrowDown') ? 1 : 0);
  // Camera nhìn theo hướng tiến (+Z khi yaw 0) nên "phải màn hình" là −X của contract: D → move.x = −1.
  const right = (k('KeyD') ? 1 : 0) - (k('KeyA') ? 1 : 0);
  return { ...emptyInput(), move: [-right, fwd], cam_yaw_deg: camYaw, jump: k('Space'), interact: k('KeyE'), pulse: k('KeyQ') || k('KeyF') };
}

function onEvents(evs: GameEvent[]): void {
  for (const e of evs) {
    if (e.name === 'pulse') ringT = 0;
    if (e.name === 'game_over') {
      const won = (e.data as { result: string }).result === 'won';
      overlay.className = won ? 'won' : 'lost';
      overlay.style.display = 'flex';
      const reason = (e.data as { reason: string }).reason;
      document.getElementById('ov-title')!.textContent = won ? 'Đảo Bến đã sáng lại!' : reason === 'dawn' ? 'Trời đã sáng…' : 'Mây đã hết lửa…';
      document.getElementById('ov-text')!.innerHTML = `Điểm: <b>${sim.score}</b><br><br>Nhấn <b>R</b> để chơi lại`;
    }
  }
}

function sync(dt: number, time: number): void {
  const p = sim.player;
  player.position.set(p.x, p.y, p.z);
  const heading = (camYaw * Math.PI) / 180;
  player.rotation.y = heading;
  const blink = sim.tick < p.invulnUntil;
  player.visible = !blink || Math.floor(time * 12) % 2 === 0;
  sim.lanterns.forEach((l, i) => {
    const v = lanternViews[i];
    (v.head.material as THREE.MeshStandardMaterial).emissiveIntensity = l.lit ? 2.2 : 0.15 + (l.deposited / tuning.lantern_cost) * 0.8;
    v.light.intensity = l.lit ? 40 : 0;
    (v.safe.material as THREE.MeshBasicMaterial).opacity = l.lit ? 0.35 : 0;
  });
  for (const m of sim.motes) {
    let v = moteViews.get(m.id);
    if (!v) { v = new THREE.Mesh(moteGeo, moteMat); moteViews.set(m.id, v); scene.add(v); }
    v.position.set(m.x, 0.6 + Math.sin(time * 3 + m.x) * 0.2, m.z);
  }
  for (const [id, v] of moteViews) if (!sim.motes.some((m) => m.id === id)) { scene.remove(v); moteViews.delete(id); }
  for (const s of sim.shades) {
    let v = shadeViews.get(s.id);
    if (!v) {
      v = new THREE.Group();
      const blob = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 12), mat(0x1a0a2a, 0x5a1a8a, 0.6));
      blob.name = 'blob'; v.add(blob);
      for (const dx of [-0.25, 0.25]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), mat(0xd9b3ff, 0xc080ff, 2)); eye.position.set(dx, 0.2, 0.7); v.add(eye); }
      shadeViews.set(s.id, v); scene.add(v);
    }
    v.position.set(s.x, s.y + Math.sin(time * 2 + s.x) * 0.15, s.z);
    v.lookAt(p.x, v.position.y, p.z);
    const stunned = sim.isStunned(s);
    const bm = (v.getObjectByName('blob') as THREE.Mesh).material as THREE.MeshStandardMaterial;
    bm.emissive.setHex(stunned ? 0xb090ff : 0x5a1a8a);
    v.scale.setScalar(stunned ? 0.75 : 1);
  }
  // Đảo sáng dần lên khi thắp đèn
  const lit = sim.litCount / sim.lanterns.length;
  hemi.intensity = 0.5 + lit * 1.3;
  (scene.background as THREE.Color).copy(NIGHT).lerp(DAWNISH, lit);
  (scene.fog as THREE.Fog).color.copy(scene.background as THREE.Color);
  (scene.fog as THREE.Fog).far = 75 + lit * 60;
  // Pulse ring
  ringT = Math.min(1, ringT + dt / 0.4);
  ring.position.set(p.x, 0.05, p.z);
  ring.scale.setScalar(0.5 + ringT * tuning.pulse_radius);
  (ring.material as THREE.MeshBasicMaterial).opacity = (1 - ringT) * 0.8;
  // Camera sau lưng
  const fx = Math.sin(heading), fz = Math.cos(heading);
  camera.position.set(p.x - fx * 9, p.y + 5.5, p.z - fz * 9);
  camera.lookAt(p.x + fx * 2, p.y + 1, p.z + fz * 2);
  // HUD
  const tl = Math.max(0, sim.timeLeft);
  const cd = Math.max(0, p.pulseReadyAt - sim.tick) / 60;
  hud.innerHTML = `<b>Đêm 1 – Đảo Bến</b><br>Lửa: ${'🔥'.repeat(p.flames)}${'·'.repeat(Math.max(0, tuning.flames - p.flames))}<br>` +
    `Đom đóm: <b>${p.carried}</b>/${tuning.carry_capacity}<br>Đèn: <b>${sim.litCount}</b>/${sim.lanterns.length}<br>` +
    `Còn: ${Math.floor(tl / 60)}:${String(Math.floor(tl % 60)).padStart(2, '0')}<br>Điểm: <b>${sim.score}</b><br>` +
    `Tỏa sáng: ${p.carried < tuning.pulse_cost ? 'thiếu ánh sáng' : cd > 0 ? cd.toFixed(1) + ' s' : 'sẵn sàng'}`;
}

let acc = 0, last = performance.now();
const STEP = 1 / 60;
function frame(now: number): void {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  acc += dt;
  while (acc >= STEP) {
    acc -= STEP;
    if (sim.state === 'playing') onEvents(sim.step(readInput()));
  }
  if (keys.has('KeyJ')) camYaw += 120 * dt;
  if (keys.has('KeyL')) camYaw -= 120 * dt;
  sync(dt, now / 1000);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
newGame();
requestAnimationFrame(frame);
(window as unknown as { __game: () => Sim }).__game = () => sim;
