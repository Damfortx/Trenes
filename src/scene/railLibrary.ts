/* ===== FILE: src/scene/railLibrary.ts ===== */
import * as THREE from 'three';
import { railsLoader } from './loaders';
import { RAIL_UNIT } from './rails';

const loader = railsLoader();

export type RailKind = 'straight' | 'curve90' | 'tjunction' | 'cross';
export type CacheEntry = {
  wrap: THREE.Object3D;
  span: number;
  kind: RailKind;
  ports: { p: THREE.Vector2; d: THREE.Vector2 }[];
};

const cache = new Map<RailKind, CacheEntry>();
const DBG = true;
const log  = (...a: any[]) => { if (DBG) console.log(...a); };
const warn = (...a: any[]) => { if (DBG) console.warn(...a); };

/* ---------- utils ---------- */
function ensureSRGBAndShadows(o: THREE.Object3D) {
  o.traverse((m: any) => {
    if (!m?.isMesh) return;
    m.castShadow = true; m.receiveShadow = true;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    mats.forEach((mat: any) => { if (mat?.map) mat.map.colorSpace = THREE.SRGBColorSpace; });
  });
}

function bbox(obj: THREE.Object3D) {
  const b = new THREE.Box3().setFromObject(obj);
  const size = b.getSize(new THREE.Vector3());
  const center = b.getCenter(new THREE.Vector3());
  return { box: b, size, center };
}

function normalizeToUnit(src: THREE.Object3D, forceLongAxisZ = false) {
  ensureSRGBAndShadows(src);
  src.updateWorldMatrix(true, true);
  const { size, center } = bbox(src);
  const long = Math.max(size.x, size.z) || 1;
  const scale = THREE.MathUtils.clamp(RAIL_UNIT / long, 0.02, 5);

  const wrap = new THREE.Group();
  src.position.add(center.multiplyScalar(-scale));
  src.scale.setScalar(scale);
  wrap.add(src);

  if (forceLongAxisZ && size.x >= size.z) wrap.rotation.y = Math.PI / 2;
  wrap.position.y = 0;

  wrap.updateWorldMatrix(true, true);
  const after = bbox(wrap).size;
  const span = Math.max(after.x, after.z);
  return { wrap, span, size: after };
}

async function loadRawOne(name: string): Promise<THREE.Object3D | null> {
  return await new Promise(res => loader.load(name, g => res(g.scene), undefined, () => res(null)));
}
async function loadRaw(cands: string[]) {
  for (const p of cands) {
    const s = await loadRawOne(p);
    if (s) return { scene: s, name: p };
  }
  return null;
}

function collectXZPoints(obj: THREE.Object3D) {
  const pts: THREE.Vector2[] = [];
  obj.updateWorldMatrix(true, true);
  obj.traverse((m: any) => {
    if (!m?.isMesh || !m.geometry) return;
    const pos = (m.geometry as THREE.BufferGeometry).getAttribute('position');
    if (!pos) return;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
      m.localToWorld(v);
      pts.push(new THREE.Vector2(v.x, v.z));
    }
  });
  return pts;
}

/** rotación 0..3 que coloca la esquina como –X → +Z */
function rotationIdxForCorner(allXZ: THREE.Vector2[], span: number) {
  const rotV = (v: THREE.Vector2, k: number) => {
    const a = k * (Math.PI/2), c = Math.cos(a), s = Math.sin(a);
    return new THREE.Vector2(c*v.x - s*v.y, s*v.x + c*v.y);
  };
  let bestIdx = 0, bestScore = -Infinity;
  const scores: number[] = [];
  for (let k = 0; k < 4; k++) {
    const pts = allXZ.map(p => rotV(p, k));
    let minX = +Infinity, maxX = -Infinity, minZ = +Infinity, maxZ = -Infinity;
    for (const p of pts) { if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x; if (p.y < minZ) minZ = p.y; if (p.y > maxZ) maxZ = p.y; }
    const tol = 0.08 * span;
    let nearLeft = 0, nearTop = 0, nearRight = 0, nearBottom = 0;
    for (const p of pts) {
      if (p.x - minX < tol) nearLeft++;
      if (maxZ - p.y < tol) nearTop++;
      if (maxX - p.x < tol) nearRight++;
      if (p.y - minZ < tol) nearBottom++;
    }
    const score = nearLeft + nearTop - 0.35*(nearRight + nearBottom);
    scores.push(score);
    if (score > bestScore) { bestScore = score; bestIdx = k; }
  }
  log('[curve] rotation scores (0..3):', scores, '→ chosen', bestIdx);
  return bestIdx;
}

/* ---------- puertos fijos a la rejilla ---------- */
function fixedPorts(kind: RailKind, L = RAIL_UNIT) {
  const h = L / 2;
  if (kind === 'straight') {
    return [
      { p: new THREE.Vector2(0, -h), d: new THREE.Vector2(0, -1) },
      { p: new THREE.Vector2(0,  h), d: new THREE.Vector2(0,  1) },
    ];
  }
  if (kind === 'curve90') {
    return [
      { p: new THREE.Vector2(-h, 0), d: new THREE.Vector2(-1, 0) },
      { p: new THREE.Vector2( 0, h), d: new THREE.Vector2(0,  1) },
    ];
  }
  if (kind === 'tjunction') {
    return [
      { p: new THREE.Vector2(-h, 0), d: new THREE.Vector2(-1, 0) },
      { p: new THREE.Vector2( 0,-h), d: new THREE.Vector2(0, -1) },
      { p: new THREE.Vector2( 0, h), d: new THREE.Vector2(0,  1) },
    ];
  }
  // cross
  return [
    { p: new THREE.Vector2(-h, 0), d: new THREE.Vector2(-1, 0) },
    { p: new THREE.Vector2( h, 0), d: new THREE.Vector2( 1, 0) },
    { p: new THREE.Vector2( 0,-h), d: new THREE.Vector2(0, -1) },
    { p: new THREE.Vector2( 0, h), d: new THREE.Vector2(0,  1) },
  ];
}

/* ===================================
   API
   =================================== */
export async function tryGetRail(kind: RailKind): Promise<CacheEntry | null> {
  if (cache.has(kind)) return cache.get(kind)!;

  log('[rails] tryGetRail kind=' + kind + ', RAIL_UNIT=' + RAIL_UNIT);

  // ---------- STRAIGHT ----------
  if (kind === 'straight') {
    const cand = [
      'railroad-straight.glb','railroad-rail-straight.glb',
      'track-straight.glb','track.glb','track-single.glb','track-single-detailed.glb',
      'rail_straight.glb','railStraight.glb','straight.glb'
    ];
    const raw = await loadRaw(cand);
    if (!raw) return null;
    log('[straight] using', raw.name);
    const norm = normalizeToUnit(raw.scene, true);
    log('[straight] span after normalize =', norm.span, 'size=', norm.size);
    const ports = fixedPorts('straight', RAIL_UNIT);
    (norm.wrap.userData ??= {}).ports = ports;
    const entry: CacheEntry = { wrap: norm.wrap, span: norm.span, kind: 'straight', ports };
    cache.set('straight', entry);
    log('→ straight ready, span:', entry.span);
    return entry;
  }

  // ---------- CURVE 90 ----------
  if (kind === 'curve90') {
    const cornerFirst = [
      'railroad-corner-small.glb','railroad-corner-large.glb',
      'railroad-rail-corner-small.glb','railroad-rail-corner-large.glb',
      'railroad-corner-small-ramp.glb','railroad-corner-large-ramp.glb',
      'railroad-rail-corner-small-ramp.glb','railroad-rail-corner-large-ramp.glb',
      'corner.glb','corner-90.glb','quarter.glb','quarter-turn.glb','turn-90.glb','turn90.glb'
    ];
    const genericCurves = [
      'track-curve-90.glb','railroad-curve-90.glb','railroad-rail-curve-90.glb',
      'railroad-curve.glb','railroad-rail-curve.glb','track-curve.glb','turn.glb','curve.glb'
    ];

    const tryOne = async (name: string) => {
      const raw = await loadRaw([name]);
      if (!raw) return null;

      log('[curve]', name);

      // 1) normaliza por caja a RAIL_UNIT (span ≈ 2)
      const norm = normalizeToUnit(raw.scene, false);
      log('raw bbox size after normalize:', norm.size);

      // 2) orienta como –X → +Z
      const xz = collectXZPoints(norm.wrap);
      const idx = rotationIdxForCorner(xz, Math.max(norm.size.x, norm.size.z));
      norm.wrap.rotation.y += idx * (Math.PI / 2);
      norm.wrap.updateWorldMatrix(true, true);

      // IMPORTANTÍSIMO:
      // NO volver a reescalar por “bocas”; mantener span = 2 igual que la recta.
      // (los puertos están fijados a ±RAIL_UNIT/2, el snap usa eso)
      const after = bbox(norm.wrap).size;
      const span = Math.max(after.x, after.z);
      log('[curve] final span (sin fix de bocas) =', span);

      const ports = fixedPorts('curve90', RAIL_UNIT);
      (norm.wrap.userData ??= {}).ports = ports;
      const entry: CacheEntry = { wrap: norm.wrap, span, kind: 'curve90', ports };
      cache.set('curve90', entry);
      log('[curve] ready from', name, ', span:', entry.span);
      return entry;
    };

    for (const n of cornerFirst) { const e = await tryOne(n); if (e) return e; }
    for (const n of genericCurves) { const e = await tryOne(n); if (e) return e; }

    warn('[rails] No curve90 (esquina) válida encontrada. Se omitirá del selector.');
    return null;
  }

  // ---------- T-JUNCTION ----------
  if (kind === 'tjunction') {
    const cand = ['track-t.glb','railroad-t.glb','railroad-rail-t.glb','switch-t.glb','t.glb','t_junction.glb','junction-t.glb'];
    const raw = await loadRaw(cand);
    if (raw) {
      const norm = normalizeToUnit(raw.scene, true);
      const ports = fixedPorts('tjunction', RAIL_UNIT);
      (norm.wrap.userData ??= {}).ports = ports;
      const entry: CacheEntry = { wrap: norm.wrap, span: norm.span, kind: 'tjunction', ports };
      cache.set('tjunction', entry);
      return entry;
    }
    // fallback con 2 rectas
    const straight = await tryGetRail('straight');
    if (straight) {
      const g = new THREE.Group();
      const a = straight.wrap.clone(true); a.rotation.y = 0; g.add(a);
      const b = straight.wrap.clone(true); b.rotation.y = Math.PI/2; g.add(b);
      const norm = normalizeToUnit(g, true);
      const ports = fixedPorts('tjunction', RAIL_UNIT);
      (norm.wrap.userData ??= {}).ports = ports;
      const entry: CacheEntry = { wrap: norm.wrap, span: norm.span, kind: 'tjunction', ports };
      cache.set('tjunction', entry);
      warn('[rails] T junction no encontrada → usando fallback compuesto.');
      return entry;
    }
    warn('[rails] T junction no encontrada');
    return null;
  }

  // ---------- CROSS (+) ----------
  const cand = ['track-cross.glb','railroad-cross.glb','railroad-rail-cross.glb','cross.glb','x.glb'];
  const raw = await loadRaw(cand);
  if (raw) {
    const norm = normalizeToUnit(raw.scene, true);
    const ports = fixedPorts('cross', RAIL_UNIT);
    (norm.wrap.userData ??= {}).ports = ports;
    const entry: CacheEntry = { wrap: norm.wrap, span: norm.span, kind: 'cross', ports };
    cache.set('cross', entry);
    return entry;
  }
  // Fallback con 2 rectas
  const straight = await tryGetRail('straight');
  if (straight) {
    const g = new THREE.Group();
    const a = straight.wrap.clone(true); a.rotation.y = 0; g.add(a);
    const b = straight.wrap.clone(true); b.rotation.y = Math.PI/2; g.add(b);
    const norm = normalizeToUnit(g, true);
    const ports = fixedPorts('cross', RAIL_UNIT);
    (norm.wrap.userData ??= {}).ports = ports;
    const entry: CacheEntry = { wrap: norm.wrap, span: norm.span, kind: 'cross', ports };
    cache.set('cross', entry);
    warn('[rails] Cross + no encontrado → usando fallback compuesto.');
    return entry;
  }
  warn('[rails] Cross + no encontrado');
  return null;
}
