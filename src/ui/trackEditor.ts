/* ===== FILE: src/ui/trackEditor.ts ===== */
import * as THREE from 'three';
import { tryGetRail } from '../scene/railLibrary';
import type { RailKind } from '../scene/railLibrary';
import { RAIL_UNIT } from '../scene/rails';

type EditorOpts = {
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  grid: { step: number, y: number };
};

type Placed = {
  kind: RailKind;
  center: THREE.Vector3;
  rotIdx: number;          // 0..3
  node: THREE.Object3D;
};

const DBG = true;
const log = (...a: any[]) => { if (DBG) console.log('[editor]', ...a); };
const warn = (...a: any[]) => { if (DBG) console.warn('[editor]', ...a); };

// === helpers geom ===
function rotate2a(v: THREE.Vector2, angle: number) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return new THREE.Vector2(c * v.x - s * v.y, s * v.x + c * v.y);
}

function getLocalPortsFrom(kind: RailKind, obj: THREE.Object3D) {
  const ports = obj.userData?.ports as { p: THREE.Vector2; d: THREE.Vector2 }[] | undefined;
  if (ports && ports.length) return ports;

  const L = RAIL_UNIT, h = L/2;
  if (kind === 'straight') return [
    { p: new THREE.Vector2(0, -h), d: new THREE.Vector2(0, -1) },
    { p: new THREE.Vector2(0,  h), d: new THREE.Vector2(0,  1) },
  ];
  if (kind === 'curve90') return [
    { p: new THREE.Vector2(-h, 0), d: new THREE.Vector2(-1, 0) },
    { p: new THREE.Vector2( 0, h), d: new THREE.Vector2(0,  1) },
  ];
  if (kind === 'tjunction') return [
    { p: new THREE.Vector2(-h, 0), d: new THREE.Vector2(-1, 0) },
    { p: new THREE.Vector2( 0,-h), d: new THREE.Vector2(0, -1) },
    { p: new THREE.Vector2( 0, h), d: new THREE.Vector2(0,  1) },
  ];
  return [
    { p: new THREE.Vector2(-h, 0), d: new THREE.Vector2(-1, 0) },
    { p: new THREE.Vector2( h, 0), d: new THREE.Vector2( 1, 0) },
    { p: new THREE.Vector2( 0,-h), d: new THREE.Vector2(0, -1) },
    { p: new THREE.Vector2( 0, h), d: new THREE.Vector2(0,  1) },
  ];
}

function portsWorldFromObject(
  kind: RailKind,
  obj: THREE.Object3D,
  center: THREE.Vector3,
  angle: number,
  y: number
) {
  const base = getLocalPortsFrom(kind, obj);
  return base.map(({ p, d }) => {
    const pr = rotate2a(p, angle);
    const dr = rotate2a(d, angle);
    return {
      p: new THREE.Vector3(center.x + pr.x, y, center.z + pr.y),
      d: new THREE.Vector2(dr.x, dr.y)
    };
  });
}

// === debug grid (G) ===
function makeDebugGrid(step: number, y: number) {
  const size = 40;
  const lines = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.25 });
  for (let x=-size; x<=size; x+=step) {
    const g = new THREE.BufferGeometry().setFromPoints([ new THREE.Vector3(x,y,-size), new THREE.Vector3(x,y,size) ]);
    lines.add(new THREE.Line(g, mat));
  }
  for (let z=-size; z<=size; z+=step) {
    const g = new THREE.BufferGeometry().setFromPoints([ new THREE.Vector3(-size,y,z), new THREE.Vector3(size,y,z) ]);
    lines.add(new THREE.Line(g, mat));
  }
  return lines;
}

// === nuevo: marco 1×1 de RAIL_UNIT (H) ===
function makeUnitFrame(L: number, y: number) {
  const h = L / 2;
  const pts = [
    new THREE.Vector3(-h, y, -h), new THREE.Vector3( h, y, -h),
    new THREE.Vector3( h, y, -h), new THREE.Vector3( h, y,  h),
    new THREE.Vector3( h, y,  h), new THREE.Vector3(-h, y,  h),
    new THREE.Vector3(-h, y,  h), new THREE.Vector3(-h, y, -h),
  ];
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.6 });
  const frame = new THREE.LineSegments(g, mat);
  frame.renderOrder = 999;
  return frame;
}

// helper de logs: mide bbox world
function logWorldSize(tag: string, obj: THREE.Object3D) {
  const b = new THREE.Box3().setFromObject(obj);
  const s = b.getSize(new THREE.Vector3());
  const span = Math.max(s.x, s.z);
  console.log(`[place] ${tag} size=[${s.x.toFixed(4)}, ${s.z.toFixed(4)}] span=${span.toFixed(4)}  (L=${RAIL_UNIT})`);
}

export function enableTrackEditor({ scene, camera, renderer, grid }: EditorOpts) {
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -grid.y);
  const mouse = new THREE.Vector2();

  const tracksGroup = new THREE.Group();
  scene.add(tracksGroup);

  const placed: Placed[] = [];

  // toggles
  let dbgGrid: THREE.Object3D | null = null;
  let showFrames = true; // ⬅ por defecto ON para que lo veas

  const toggleGrid = () => {
    if (dbgGrid) { scene.remove(dbgGrid); dbgGrid = null; }
    else { dbgGrid = makeDebugGrid(grid.step, grid.y); scene.add(dbgGrid); }
  };
  const toggleFrames = () => {
    showFrames = !showFrames;
    tracksGroup.traverse(o => {
      if ((o as any).__unitFrame) (o as any).__unitFrame.visible = showFrames;
    });
  };

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'g') toggleGrid();
    if (k === 'h') toggleFrames(); // ⬅ nuevo
  });

  // Paleta (elimina una previa por HMR)
  const old = document.getElementById('track-palette');
  if (old && old.parentElement) old.parentElement.removeChild(old);

  const bar = document.createElement('div');
  bar.id = 'track-palette';
  Object.assign(bar.style, {
    position: 'fixed',
    left: '50%', transform: 'translateX(-50%)',
    bottom: '14px',
    background: 'rgba(255,255,255,0.95)',
    padding: '10px',
    borderRadius: '12px',
    boxShadow: '0 6px 18px rgba(0,0,0,.15)',
    zIndex: '99999',
    pointerEvents: 'auto',
    display: 'flex', gap: '10px', alignItems: 'center',
    fontFamily: 'ui-sans-serif, system-ui, Segoe UI, Roboto, Arial'
  } as CSSStyleDeclaration);

  const hint = document.createElement('span');
  hint.textContent = 'Arrastra una pieza. R: rotar 90° — G: grilla — H: marcos 1×1';
  hint.style.marginLeft = '8px';

  const kinds: RailKind[] = ['straight', 'curve90', 'tjunction', 'cross'];

  // mini scene para thumbs
  const thumbScene = new THREE.Scene();
  const thumbCam = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  thumbCam.position.set(2.2, 2.5, 2.2); thumbCam.lookAt(0,0,0);
  const thumbDL = new THREE.DirectionalLight(0xffffff, 1);
  thumbDL.position.set(2,3,1);
  thumbScene.add(new THREE.AmbientLight(0xffffff, 0.7), thumbDL);

  async function makeButton(kind: RailKind) {
    const entry = await tryGetRail(kind);
    if (!entry) { warn('no hay pieza', kind); return null; }

    const btn = document.createElement('button');
    Object.assign(btn.style, {
      width: '68px', height: '48px',
      border: '1px solid #ddd', borderRadius: '10px',
      cursor: 'grab', padding: '0', background: '#fff',
      display: 'inline-block'
    } as CSSStyleDeclaration);
    btn.dataset.kind = kind;

    const canvas = document.createElement('canvas');
    canvas.width = 136; canvas.height = 96;
    canvas.style.width = '68px'; canvas.style.height = '48px';
    btn.appendChild(canvas);

    const r = new THREE.WebGLRenderer({ antialias: true, canvas });
    r.setPixelRatio(1); r.setSize(136,96,false);
    const mini = entry.wrap.clone(true);
    thumbScene.add(mini); r.render(thumbScene, thumbCam); thumbScene.remove(mini);

    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); beginDrag(kind, e as PointerEvent); });
    return btn;
  }

  (async () => {
    const frags: HTMLElement[] = [];
    for (const k of kinds) {
      const b = await makeButton(k);
      if (b) frags.push(b);
    }
    frags.forEach(b => bar.appendChild(b));
    bar.appendChild(hint);
    document.body.appendChild(bar);
  })();

  // Drag & snap
  let dragging = false;
  let currentKind: RailKind = 'straight';
  let ghost: THREE.Object3D | null = null;
  let proto: THREE.Object3D | null = null;
  let rotIdx = 0; // 0..3
  let ghostFrame: THREE.Object3D | null = null;

  function screenToWorld(ev: PointerEvent) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hit = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, hit);
    return hit;
  }

  function snapToGrid(v: THREE.Vector3) {
    const s = grid.step;
    return new THREE.Vector3(Math.round(v.x / s) * s, grid.y, Math.round(v.z / s) * s);
  }

  function makeGhost(from: THREE.Object3D) {
    const g = from.clone(true);
    g.traverse((o: any) => {
      if (!o?.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((mat: any) => { if (!mat) return; const c = mat.clone(); c.transparent = true; c.opacity = 0.55; o.material = c; });
      o.castShadow = false; o.receiveShadow = false;
    });
    return g;
  }

  function bestSnapFor(kind: RailKind, idxStart: number, centerGuess: THREE.Vector3) {
    if (!proto) return { center: snapToGrid(centerGuess), rotIdx: idxStart, score: 999 };

    const thresh = RAIL_UNIT * 0.38;
    let best: { center: THREE.Vector3; rotIdx: number; score: number, pair?: any } | null = null;

    for (let ri = 0; ri < 4; ri++) {
      const idx = (idxStart + ri) % 4;
      const angle = idx * (Math.PI / 2);
      const ghostPorts = portsWorldFromObject(kind, proto, centerGuess, angle, grid.y);

      for (const other of placed) {
        const otherAngle = other.rotIdx * (Math.PI / 2);
        const otherPorts = portsWorldFromObject(other.kind, other.node, other.center, otherAngle, grid.y);

        for (const gp of ghostPorts) {
          for (const op of otherPorts) {
            const dist = gp.p.distanceTo(op.p);
            if (dist > thresh) continue;
            const dot = gp.d.clone().multiplyScalar(-1).dot(op.d);
            if (dot < 0.93) continue;

            const shift = op.p.clone().sub(gp.p);
            const newCenter = centerGuess.clone().add(shift);
            const score = dist + (1 - dot) * 0.1;
            if (!best || score < best.score) best = { center: newCenter, rotIdx: idx, score, pair: { gp, op, dist, dot } };
          }
        }
      }
    }
    return best ?? { center: snapToGrid(centerGuess), rotIdx: idxStart, score: 999 };
  }

  async function beginDrag(kind: RailKind, ev: PointerEvent) {
    const entry = await tryGetRail(kind);
    if (!entry) return;
    currentKind = kind;
    rotIdx = 0;
    proto = entry.wrap;
    log('begin drag:', kind, 'proto span≈', entry.span.toFixed(4), '(L=', RAIL_UNIT, ')');

    if (ghost) scene.remove(ghost);
    ghost = makeGhost(proto);
    scene.add(ghost);

    // marco para el ghost
    if (ghostFrame) scene.remove(ghostFrame);
    ghostFrame = makeUnitFrame(RAIL_UNIT, grid.y + 0.001);
    ghost.add(ghostFrame);
    (ghost as any).__unitFrame = ghostFrame;
    ghostFrame.visible = showFrames;

    dragging = true;
    moveGhost(ev);
  }

  function moveGhost(ev: PointerEvent) {
    if (!dragging || !ghost || !proto) return;
    const p = screenToWorld(ev);
    const guess = new THREE.Vector3(p.x, grid.y, p.z);
    const snapped = bestSnapFor(currentKind, rotIdx, guess);
    ghost.position.copy(snapped.center);
    ghost.rotation.y = snapped.rotIdx * (Math.PI / 2);
  }

  function endDrag() {
    if (!dragging || !ghost || !proto) return;
    const real = proto.clone(true);
    real.position.copy(ghost.position);
    real.rotation.y = ghost.rotation.y;

    // marco 1×1 en la pieza real
    const frame = makeUnitFrame(RAIL_UNIT, grid.y + 0.001);
    (real as any).__unitFrame = frame;
    frame.visible = showFrames;
    real.add(frame);

    tracksGroup.add(real);

    const idx = Math.round((ghost.rotation.y / (Math.PI / 2)) % 4 + 4) % 4;
    placed.push({ kind: currentKind, center: ghost.position.clone(), rotIdx: idx, node: real });
    log('placed:', currentKind, 'center=', ghost.position, 'rotIdx=', idx);
    logWorldSize(currentKind, real);

    scene.remove(ghost);
    ghost = null; proto = null; dragging = false;
    ghostFrame = null;
  }

  // Eventos
  renderer.domElement.addEventListener('pointermove', (e) => moveGhost(e));
  renderer.domElement.addEventListener('pointerup', () => endDrag());
  window.addEventListener('keydown', (e) => {
    if (!dragging) return;
    if (e.key.toLowerCase() === 'r') {
      rotIdx = (rotIdx + 1) % 4;
      if (ghost) ghost.rotation.y = rotIdx * (Math.PI / 2);
      log('rot idx ->', rotIdx);
    }
    if (e.key === 'Escape') {
      if (ghost) scene.remove(ghost);
      ghost = null; proto = null; dragging = false;
      if (ghostFrame) { scene.remove(ghostFrame); ghostFrame = null; }
      log('drag cancel');
    }
  });
}
