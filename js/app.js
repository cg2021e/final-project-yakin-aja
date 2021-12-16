const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const distance = 500;
const initialCameraPositionY = 120;
const initialCameraPositionX = 0;

camera.position.y = initialCameraPositionY;
camera.position.x = initialCameraPositionX;
camera.position.z = distance;

const zoom = 1.5;

const positionWidth = 42;
const columns = 17;
const boardWidth = positionWidth*columns;

hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.0);
scene.add(hemiLight);

function Grass() {
  const grass = new THREE.Group();

  const createSection = color => new THREE.Mesh(
    new THREE.BoxBufferGeometry( boardWidth*zoom, positionWidth*zoom, 3*zoom ), 
    new THREE.MeshPhongMaterial( { color } )
  );

  const middle = createSection(0x55f472); // light green
  middle.receiveShadow = true;
  grass.add(middle);

  const left = createSection(0x46c871); // dark green
  left.position.x = -boardWidth*zoom;
  grass.add(left);

  const right = createSection(0x46c871); // dark green
  right.position.x = boardWidth*zoom;
  grass.add(right);

  grass.position.z = 1.5*zoom;
  return grass;
}

function Lane(index) {
  this.index = index;

  // field
  this.type = 'field';
  this.mesh = new Grass();
}

const generateLanes = () => [-9,-8,-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8,9].map((index) => {
  const lane = new Lane(index);
  lane.mesh.position.y = index*positionWidth*zoom;
  scene.add( lane.mesh );
  return lane;
}).filter((lane) => lane.index >= 0);

const initaliseValues = () => {
  lanes = generateLanes()

  camera.position.y = initialCameraPositionY;
  camera.position.x = initialCameraPositionX;
}

initaliseValues();

const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

function animate() {
  requestAnimationFrame( animate );  

  renderer.render( scene, camera );	
}

requestAnimationFrame( animate );