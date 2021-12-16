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

// hemilight
hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
scene.add(hemiLight);

const initialDirLightPositionX = -100;
const initialDirLightPositionY = -100;

// directionallight
dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(initialDirLightPositionX, initialDirLightPositionY, 200);
dirLight.castShadow = true;
scene.add(dirLight);

dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
var d = 500;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;

// define lane property
const laneTypes = ['road', 'forest'];
const treeHeights = [20, 45, 60];

// first lanes
const generateLanes = () => [-9,-8,-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8,9].map((index) => {
  const lane = new Lane(index);
  lane.mesh.position.y = index*positionWidth*zoom;
  scene.add( lane.mesh );
  return lane;
}).filter((lane) => lane.index >= 0);

// inisialitation
const initaliseValues = () => {
  lanes = generateLanes();

  camera.position.y = initialCameraPositionY;
  camera.position.x = initialCameraPositionX;

  dirLight.position.x = initialDirLightPositionX;
  dirLight.position.y = initialDirLightPositionY;
}

initaliseValues();

// lane
function Lane(index) {
  this.index = index;
  this.type = index <= 0 ? 'field' : laneTypes[Math.floor(Math.random()*laneTypes.length)];

  if (this.type == 'field') { // field
    this.mesh = new Grass();
  } else if (this.type == 'forest') { // forest
    this.mesh = new Grass();

    this.occupiedPositions = new Set();
    this.trees = [1,2,3,4].map(() => {
      const tree = new Tree();
      let position;
      do {
        position = Math.floor(Math.random()*columns);
      } while (this.occupiedPositions.has(position))
        this.occupiedPositions.add(position);
      tree.position.x = (position*positionWidth+positionWidth/2)*zoom-boardWidth*zoom/2;
      this.mesh.add( tree );
      return tree;
    })
  } else if (this.type == 'road') {
    this.mesh = new Road();
  }
}

// grass for field and forest
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

// tree for forest
function Tree() {
  const tree = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 15*zoom, 15*zoom, 20*zoom ), 
    new THREE.MeshPhongMaterial( { color: 0x4d2926, flatShading: true } )
  );
  trunk.position.z = 10*zoom;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  tree.add(trunk);

  height = treeHeights[Math.floor(Math.random()*treeHeights.length)];

  const crown = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 30*zoom, 30*zoom, height*zoom ), 
    new THREE.MeshLambertMaterial( { color: 0x7aa21d, flatShading: true } )
  );
  crown.position.z = (height/2+20)*zoom;
  crown.castShadow = true;
  crown.receiveShadow = false;
  tree.add(crown);

  return tree;  
}

// road 
function Road() {
  const road = new THREE.Group();

  const createSection = color => new THREE.Mesh(
    new THREE.PlaneBufferGeometry( boardWidth*zoom, positionWidth*zoom ), 
    new THREE.MeshPhongMaterial( { color } )
  );

  const middle = createSection(0x454A59); // dark gray
  middle.receiveShadow = true;
  road.add(middle);

  const left = createSection(0x393D49); // darker
  left.position.x = -boardWidth*zoom;
  road.add(left);

  const right = createSection(0x393D49); // darker
  right.position.x = boardWidth*zoom;
  road.add(right);

  return road;
}

// render
const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

// animation
function animate() {
  requestAnimationFrame( animate );  

  renderer.render( scene, camera );	
}

requestAnimationFrame( animate );