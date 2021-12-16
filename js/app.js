const counterDOM = document.getElementById('counter');  
const endDOM = document.getElementById('end');  

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

const zoom = 1.5;

const initialDirLightPositionX = -100;
const initialDirLightPositionY = -100;

const positionWidth = 42;
const columns = 17;
const boardWidth = positionWidth*columns;

const chickenSize = 15;
const stepTime = 200;

let lanes, currentLane, currentColumn;
let previousTimestamp, startMoving, moves, stepStartTimestamp;
let gameOver, requestId;

// chicken
const chicken = new Chicken();
scene.add( chicken );

// hemilight
const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
scene.add(hemiLight);

// directionallight
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(initialDirLightPositionX, initialDirLightPositionY, 200);
dirLight.castShadow = true;
dirLight.target = chicken;
scene.add(dirLight);

dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
var d = 500;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;

// lane property
const laneTypes = ['car', 'truck', 'forest'];
const treeHeights = [20, 45, 60];
const laneSpeeds = [2, 2.5, 3];
const vechicleColors = [0x428eff, 0xffef42, 0xff7b42, 0xff426b];

const carFrontTexture = new Texture(40, 80, [{x: 0, y: 10, w: 30, h: 60 }]);
const carBackTexture = new Texture(40, 80, [{x: 10, y: 10, w: 30, h: 60 }]);
const carRightSideTexture = new Texture(110, 40, [{x: 10, y: 0, w: 50, h: 30 }, {x: 70, y: 0, w: 30, h: 30 }]);
const carLeftSideTexture = new Texture(110, 40, [{x: 10, y: 10, w: 50, h: 30 }, {x: 70, y: 10, w: 30, h: 30 }]);

const truckFrontTexture = new Texture(30, 30, [{x: 15, y: 0, w: 10, h: 30 }]);
const truckRightSideTexture = new Texture(25, 30, [{x: 0, y: 15, w: 10, h: 10 }]);
const truckLeftSideTexture = new Texture(25, 30, [{x: 0, y: 5, w: 10, h: 10 }]);

// first lanes
const generateLanes = () => [-9,-8,-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8,9].map((index) => {
  const lane = new Lane(index);
  lane.mesh.position.y = index*positionWidth*zoom;
  scene.add( lane.mesh );
  return lane;
}).filter((lane) => lane.index >= 0);

// new lane
const addLane = () => {
  const index = lanes.length;
  const lane = new Lane(index);
  lane.mesh.position.y = index*positionWidth*zoom;
  scene.add(lane.mesh);
  lanes.push(lane);
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

// initialization
const initaliseValues = () => {
  lanes = generateLanes();
  currentLane = 0;
  currentColumn = Math.floor(columns/2);
  
  previousTimestamp = null;
  startMoving = false;
  moves = [];

  gameOver = false;
  requestId = undefined;
  counterDOM.innerHTML = currentLane;
  // counterDOM.value = 0;

  chicken.position.x = 0;
  chicken.position.y = 0;

  camera.position.y = initialCameraPositionY;
  camera.position.x = initialCameraPositionX;
  camera.position.z = distance;

  dirLight.position.x = initialDirLightPositionX;
  dirLight.position.y = initialDirLightPositionY;

  requestAnimationFrame( animate );
}

initaliseValues();

// chicken
function Chicken() {
  const chicken = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxBufferGeometry( chickenSize*zoom, chickenSize*zoom, 20*zoom ), 
    new THREE.MeshPhongMaterial( { color: 0xffffff } )
  );
  body.position.z = 10*zoom;
  body.castShadow = true;
  body.receiveShadow = true;
  chicken.add(body);

  const rowel = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 2*zoom, 4*zoom, 2*zoom ), 
    new THREE.MeshLambertMaterial( { color: 0xF0619A } )
  );
  rowel.position.z = 21*zoom;
  rowel.castShadow = true;
  rowel.receiveShadow = false;
  chicken.add(rowel);

  return chicken;  
}

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
    });
  } else if (this.type == 'car') { // car
    this.mesh = new Road();
    this.direction = Math.random() >= 0.5;

    this.occupiedPositions = new Set();
    this.vechicles = [1,2,3].map(() => {
      const vechicle = new Car();
      let position;
      do {
        position = Math.floor(Math.random()*columns/2);
      } while (this.occupiedPositions.has(position))
        this.occupiedPositions.add(position);
      vechicle.position.x = (position*positionWidth*2+positionWidth/2)*zoom-boardWidth*zoom/2;
      if (!this.direction) vechicle.rotation.z = Math.PI;
      this.mesh.add( vechicle );
      return vechicle;
    });

    this.speed = laneSpeeds[Math.floor(Math.random()*laneSpeeds.length)];
  } else if (this.type == 'truck') { // truck
    this.mesh = new Road();
    this.direction = Math.random() >= 0.5;

    this.occupiedPositions = new Set();
    this.vechicles = [1,2].map(() => {
      const vechicle = new Truck();
      let position;
      do {
        position = Math.floor(Math.random()*columns/3);
      } while (this.occupiedPositions.has(position))
        this.occupiedPositions.add(position);
      vechicle.position.x = (position*positionWidth*3+positionWidth/2)*zoom-boardWidth*zoom/2;
      if(!this.direction) vechicle.rotation.z = Math.PI;
      this.mesh.add( vechicle );
      return vechicle;
    })

    this.speed = laneSpeeds[Math.floor(Math.random()*laneSpeeds.length)];
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
    new THREE.MeshPhongMaterial( { color: 0x4d2926 } )
  );
  trunk.position.z = 10*zoom;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  tree.add(trunk);

  height = treeHeights[Math.floor(Math.random()*treeHeights.length)];

  const crown = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 30*zoom, 30*zoom, height*zoom ), 
    new THREE.MeshLambertMaterial( { color: 0x7aa21d } )
  );
  crown.position.z = (height/2+20)*zoom;
  crown.castShadow = true;
  crown.receiveShadow = false;
  tree.add(crown);

  return tree;  
}

// road for vechicle
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

// wheel for vechicle
function Wheel() {
  const wheel = new THREE.Mesh( 
    new THREE.BoxBufferGeometry( 12*zoom, 33*zoom, 12*zoom ), 
    new THREE.MeshLambertMaterial( { color: 0x333333 } ) 
  );
  wheel.position.z = 6*zoom;
  return wheel;
}

// vechicle: car
function Car() {
  const car = new THREE.Group();
  const color = vechicleColors[Math.floor(Math.random() * vechicleColors.length)];
  
  const main = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 60*zoom, 30*zoom, 15*zoom ), 
    new THREE.MeshPhongMaterial( { color } )
  );
  main.position.z = 12*zoom;
  main.castShadow = true;
  main.receiveShadow = true;
  car.add(main);
  
  const cabin = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 33*zoom, 24*zoom, 12*zoom ), 
    [
      new THREE.MeshPhongMaterial( { color: 0xcccccc, map: carBackTexture } ),
      new THREE.MeshPhongMaterial( { color: 0xcccccc, map: carFrontTexture } ),
      new THREE.MeshPhongMaterial( { color: 0xcccccc, map: carRightSideTexture } ),
      new THREE.MeshPhongMaterial( { color: 0xcccccc, map: carLeftSideTexture } ),
      new THREE.MeshPhongMaterial( { color: 0xcccccc } ), // top
      new THREE.MeshPhongMaterial( { color: 0xcccccc } ) // bottom
    ]
  );
  cabin.position.x = 6*zoom;
  cabin.position.z = 25.5*zoom;
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  car.add( cabin );
  
  const frontWheel = new Wheel();
  frontWheel.position.x = -18*zoom;
  car.add( frontWheel );

  const backWheel = new Wheel();
  backWheel.position.x = 18*zoom;
  car.add( backWheel );

  car.castShadow = true;
  car.receiveShadow = false;
  
  return car;  
}

// vechicle: truck
function Truck() {
  const truck = new THREE.Group();
  const color = vechicleColors[Math.floor(Math.random() * vechicleColors.length)];

  const base = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 100*zoom, 25*zoom, 5*zoom ), 
    new THREE.MeshLambertMaterial( { color: 0xb4c6fc } )
  );
  base.position.z = 10*zoom;
  truck.add(base)

  const cargo = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 75*zoom, 35*zoom, 40*zoom ), 
    new THREE.MeshPhongMaterial( { color: 0xb4c6fc } )
  );
  cargo.position.x = 15*zoom;
  cargo.position.z = 30*zoom;
  cargo.castShadow = true;
  cargo.receiveShadow = true;
  truck.add(cargo)

  const cabin = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 25*zoom, 30*zoom, 30*zoom ), 
    [
      new THREE.MeshPhongMaterial( { color } ), // back
      new THREE.MeshPhongMaterial( { color, map: truckFrontTexture } ),
      new THREE.MeshPhongMaterial( { color, map: truckRightSideTexture } ),
      new THREE.MeshPhongMaterial( { color, map: truckLeftSideTexture } ),
      new THREE.MeshPhongMaterial( { color } ), // top
      new THREE.MeshPhongMaterial( { color } ) // bottom
    ]
  );
  cabin.position.x = -40*zoom;
  cabin.position.z = 20*zoom;
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  truck.add( cabin );

  const frontWheel = new Wheel();
  frontWheel.position.x = -38*zoom;
  truck.add( frontWheel );

  const middleWheel = new Wheel();
  middleWheel.position.x = -10*zoom;
  truck.add( middleWheel );

  const backWheel = new Wheel();
  backWheel.position.x = 30*zoom;
  truck.add( backWheel );

  return truck;  
}

// texture for vechicle
function Texture(width, height, rects) {
  const canvas = document.createElement( "canvas" );
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext( "2d" );
  context.fillStyle = "#ffffff";
  context.fillRect( 0, 0, width, height );
  context.fillStyle = "rgba(0,0,0,0.6)";  
  rects.forEach(rect => {
    context.fillRect(rect.x, rect.y, rect.w, rect.h);
  });
  return new THREE.CanvasTexture(canvas);
}

// add mouse interaction
document.querySelector("#retry").addEventListener("click", () => {
  lanes.forEach(lane => scene.remove( lane.mesh ));
  initaliseValues();
  endDOM.style.visibility = 'hidden';
});

// add keyboard interaction
window.addEventListener("keydown", event => {
  if ((event.keyCode == 87 || event.keyCode == 38) && !gameOver) { // move forward w/ W or UP key-button
    move('forward');
  } else if ((event.keyCode == 83 || event.keyCode == 40) && !gameOver) { // move backward w/ S or DOWN key-button
    move('backward');
  } else if ((event.keyCode == 65 || event.keyCode == 37) && !gameOver) { // move leftward w/ A or LEFT key-button
    move('leftward');
  } else if ((event.keyCode == 68 || event.keyCode == 39) && !gameOver) { // move rightward w/ F or RIGHT key-button
    move('rightward');
  } 
  
  if (event.keyCode == 32 && gameOver && endDOM.style.visibility == 'visible') { // retry w/ Space
    lanes.forEach(lane => scene.remove( lane.mesh ));
    initaliseValues();
    endDOM.style.visibility = 'hidden';
  }
});

function move(direction) {
  const finalPositions = moves.reduce((position,move) => {
    if(move === 'forward') return {lane: position.lane+1, column: position.column};
    if(move === 'backward') return {lane: position.lane-1, column: position.column};
    if(move === 'leftward') return {lane: position.lane, column: position.column-1};
    if(move === 'rightward') return {lane: position.lane, column: position.column+1};
  }, {lane: currentLane, column: currentColumn})

  if (direction === 'forward') {
    if(lanes[finalPositions.lane+1].type === 'forest' && lanes[finalPositions.lane+1].occupiedPositions.has(finalPositions.column)) return;
    if(!stepStartTimestamp) startMoving = true;
    addLane();
  } else if (direction === 'backward') {
    if(finalPositions.lane === 0) return;
    if(lanes[finalPositions.lane-1].type === 'forest' && lanes[finalPositions.lane-1].occupiedPositions.has(finalPositions.column)) return;
    if(!stepStartTimestamp) startMoving = true;
  } else if (direction === 'leftward') {
    if(finalPositions.column === 0) return;
    if(lanes[finalPositions.lane].type === 'forest' && lanes[finalPositions.lane].occupiedPositions.has(finalPositions.column-1)) return;
    if(!stepStartTimestamp) startMoving = true;
  } else if (direction === 'rightward') {
    if(finalPositions.column === columns - 1 ) return;
    if(lanes[finalPositions.lane].type === 'forest' && lanes[finalPositions.lane].occupiedPositions.has(finalPositions.column+1)) return;
    if(!stepStartTimestamp) startMoving = true;
  }
  moves.push(direction);
}

// animation
function animate(timestamp) {
  if (!gameOver) requestAnimationFrame( animate );  

  if (!previousTimestamp) previousTimestamp = timestamp;
  const delta = timestamp - previousTimestamp;
  previousTimestamp = timestamp;

  // vechicles moving
  lanes.forEach(lane => {
    if (lane.type === 'car' || lane.type === 'truck') {
      const aBitBeforeTheBeginingOfLane = -boardWidth*zoom/2 - positionWidth*2*zoom;
      const aBitAfterTheEndOFLane = boardWidth*zoom/2 + positionWidth*2*zoom;
      lane.vechicles.forEach(vechicle => {
        if (lane.direction) {
          vechicle.position.x = vechicle.position.x < aBitBeforeTheBeginingOfLane ? aBitAfterTheEndOFLane : vechicle.position.x -= lane.speed/16*delta;
        } else{
          vechicle.position.x = vechicle.position.x > aBitAfterTheEndOFLane ? aBitBeforeTheBeginingOfLane : vechicle.position.x += lane.speed/16*delta;
        }
      });
    }
  });

  // chicken moving
  if (startMoving) {
    stepStartTimestamp = timestamp;
    startMoving = false;
  }

  if (stepStartTimestamp) {
    const moveDeltaTime = timestamp - stepStartTimestamp;
    const moveDeltaDistance = Math.min(moveDeltaTime/stepTime,1)*positionWidth*zoom;
    const jumpDeltaDistance = Math.sin(Math.min(moveDeltaTime/stepTime,1)*Math.PI)*8*zoom;
    
    if (moves[0] == 'forward') {
      const positionY = currentLane*positionWidth*zoom + moveDeltaDistance;
      camera.position.y = initialCameraPositionY + positionY; 
      dirLight.position.y = initialDirLightPositionY + positionY; 
      
      chicken.position.y = positionY;
      chicken.position.z = jumpDeltaDistance;
    } else if (moves[0] == 'backward') {
      positionY = currentLane*positionWidth*zoom - moveDeltaDistance
      camera.position.y = initialCameraPositionY + positionY;
      dirLight.position.y = initialDirLightPositionY + positionY; 
      
      chicken.position.y = positionY;
      chicken.position.z = jumpDeltaDistance;
    } else if (moves[0] == 'leftward') {
      const positionX = (currentColumn*positionWidth+positionWidth/2)*zoom -boardWidth*zoom/2 - moveDeltaDistance;
      camera.position.x = initialCameraPositionX + positionX;     
      dirLight.position.x = initialDirLightPositionX + positionX; 
      
      chicken.position.x = positionX;
      chicken.position.z = jumpDeltaDistance;
    } else if (moves[0] == 'rightward') {
      const positionX = (currentColumn*positionWidth+positionWidth/2)*zoom -boardWidth*zoom/2 + moveDeltaDistance;
      camera.position.x = initialCameraPositionX + positionX;       
      dirLight.position.x = initialDirLightPositionX + positionX;
      
      chicken.position.x = positionX; 
      chicken.position.z = jumpDeltaDistance;
    }

    if (moveDeltaTime > stepTime) {
      if (moves[0] == 'forward') {
        currentLane++;
        counterDOM.innerHTML = currentLane;
      } else if (moves[0] == 'backward') {
        currentLane--;  
        counterDOM.innerHTML = currentLane; 
      } else if (moves[0] == 'leftward') {
        currentColumn--;
      } else if (moves[0] == 'rightward') {
        currentColumn++;
      } 
      moves.shift();

      stepStartTimestamp = moves.length === 0 ? null : timestamp;
    }
  }

  // check if chicken hit vechicle
  if (lanes[currentLane].type === 'car' || lanes[currentLane].type === 'truck') {
    const chickenMinX = chicken.position.x - chickenSize*zoom/2;
    const chickenMaxX = chicken.position.x + chickenSize*zoom/2;
    const vechicleLength = { car: 60, truck: 105 }[lanes[currentLane].type]; 
    
    lanes[currentLane].vechicles.forEach(vechicle => {
      const carMinX = vechicle.position.x - vechicleLength*zoom/2;
      const carMaxX = vechicle.position.x + vechicleLength*zoom/2;
      if (chickenMaxX > carMinX && chickenMinX < carMaxX) {
        gameOver = true;
        endDOM.style.visibility = 'visible';
        window.cancelAnimationFrame(requestId);
      }
    });
  }

  renderer.render( scene, camera );	
}
