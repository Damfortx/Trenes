import * as THREE from './libs/three.module.js';
import {OrbitControls} from './libs/OrbitControls.js';

const TILE = 2;
const GRID_W = 16, GRID_H = 12;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xCFE7A2);
const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('c'), antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(30,30,30);
const controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = 20; controls.maxDistance = 80; controls.maxPolarAngle = Math.PI/2.2; controls.enablePan = true;

const light = new THREE.DirectionalLight(0xffffff,1); light.position.set(50,50,50); scene.add(light); scene.add(new THREE.AmbientLight(0xffffff,0.4));
const ground = new THREE.Mesh(new THREE.BoxGeometry(GRID_W*TILE,2,GRID_H*TILE), new THREE.MeshPhongMaterial({color:0xF7F7F0}));
ground.position.y = -1; scene.add(ground);
const water = new THREE.Mesh(new THREE.BoxGeometry(6*TILE,0.1,4*TILE), new THREE.MeshPhongMaterial({color:0xA6FBFF}));
water.position.set(0,-0.5,0); scene.add(water);
const gridHelper = new THREE.GridHelper(GRID_W*TILE, GRID_W, 0x888888, 0xcccccc); gridHelper.position.y=0.01; scene.add(gridHelper);

function createTrackStraight(){
  const g=new THREE.Group();
  const railMat=new THREE.MeshPhongMaterial({color:0x6F6F6F});
  const sleeperMat=new THREE.MeshPhongMaterial({color:0x8B5A2B});
  const rail1=new THREE.Mesh(new THREE.BoxGeometry(TILE*2,0.2,0.2),railMat); rail1.position.set(0,0.1,-0.4);
  const rail2=rail1.clone(); rail2.position.z=0.4; g.add(rail1, rail2);
  for(let i=-1;i<=1;i++){ const sl=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.1,1),sleeperMat); sl.position.set(i*TILE,0,0); g.add(sl); }
  return g;
}

function createTrackCurve(){
  const g=new THREE.Group();
  const railMat=new THREE.MeshPhongMaterial({color:0x6F6F6F});
  const sleeperMat=new THREE.MeshPhongMaterial({color:0x8B5A2B});
  const quarter=new THREE.QuadraticBezierCurve3(new THREE.Vector3(0,0,-TILE), new THREE.Vector3(0,0,0), new THREE.Vector3(TILE,0,0));
  const tube=new THREE.TubeGeometry(quarter,20,0.1,8,false);
  const rail=new THREE.Mesh(tube,railMat);
  const rail2=rail.clone(); rail2.position.y=0.2;
  g.add(rail, rail2);
  for(let i=0;i<3;i++){ const sl=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.1,0.8),sleeperMat); sl.position.set(i*0.6,0,-i*0.6); g.add(sl); }
  return g;
}

const pieces={straight:createTrackStraight(),curve:createTrackCurve()};
const board=[]; for(let x=0;x<GRID_W;x++){board[x]=Array(GRID_H).fill(null);}

let current='straight';
const palette=document.getElementById('palette');
palette.addEventListener('click',e=>{const type=e.target.dataset.piece; if(!type) return; current=type; [...palette.children].forEach(btn=>btn.classList.toggle('active',btn.dataset.piece===type));});

let rotate=0; window.addEventListener('keydown',e=>{if(e.key==='r'||e.key==='R') rotate=(rotate+1)%4;});

const raycaster=new THREE.Raycaster(); const mouse=new THREE.Vector2();
renderer.domElement.addEventListener('pointerdown',placeTrack);
function placeTrack(event){
  const rect=renderer.domElement.getBoundingClientRect();
  mouse.x=((event.clientX-rect.left)/rect.width)*2-1; mouse.y=-((event.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(mouse,camera);
  const plane=new THREE.Plane(new THREE.Vector3(0,1,0),0); const intersect=new THREE.Vector3();
  raycaster.ray.intersectPlane(plane,intersect);
  const gx=Math.floor((intersect.x+GRID_W*TILE/2)/TILE);
  const gz=Math.floor((intersect.z+GRID_H*TILE/2)/TILE);
  if(gx<0||gx>=GRID_W||gz<0||gz>=GRID_H) return;
  if(current==='erase'){ if(board[gx][gz]){scene.remove(board[gx][gz].mesh); board[gx][gz]=null;} return; }
  const piece=pieces[current].clone(); piece.rotation.y=rotate*Math.PI/2;
  piece.position.set(-GRID_W*TILE/2+gx*TILE+TILE/2,0.01,-GRID_H*TILE/2+gz*TILE+TILE/2);
  if(board[gx][gz]) scene.remove(board[gx][gz].mesh);
  board[gx][gz]={type:current,rot:rotate,mesh:piece}; scene.add(piece);
}

const trainMat=new THREE.MeshPhongMaterial({color:0xE31C3D});
const train=new THREE.Mesh(new THREE.BoxGeometry(1.4,0.8,0.8),trainMat);
train.position.set(-GRID_W*TILE/2+TILE/2,0.4,-GRID_H*TILE/2+TILE/2); scene.add(train);

let started=false, timer=60; const timerSpan=document.getElementById('timer');
const startBtn=document.getElementById('start'); startBtn.onclick=()=>{started=true;};
const resetBtn=document.getElementById('reset'); resetBtn.onclick=()=>{location.reload();};

function animate(){
  requestAnimationFrame(animate);
  controls.update(); renderer.render(scene,camera);
  if(!started) return; timer-=0.016; if(timer<0) timer=0; timerSpan.textContent=timer.toFixed(0);
  train.position.x+=0.02;
}
animate();

window.addEventListener('resize',()=>{camera.aspect=window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth,window.innerHeight);});
