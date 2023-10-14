// block-mesh.js: creates BLOCK_MESH = {}, containing extruded shapes, normalized to unit cube, indexed by name
// PacMan, Clover, Moon, Heart, Smile, Frown, Star4, Star5, Star6, 
// Circle, Square, Triangle, Diamond, Pentagon, Hexagon, Heptagon, Octagon
// A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z,
// 1, 2, 3, 4, 5, 6, 7, 8, 9, 0,    @, +, #, $, &, <, >


// requires three.js, FontLoader.js, and TextGeometry.js to already be loaded

// resize to bounding box with given dimensions
let resizeMesh = function(mesh, xSize, ySize, zSize)
{
	let bbox = new THREE.Box3();
	bbox.setFromObject( mesh );
	mesh.geometry.scale( xSize/(bbox.max.x - bbox.min.x), ySize/(bbox.max.y - bbox.min.y), zSize/(bbox.max.z - bbox.min.z) );
	mesh.geometry.center();
}

// function to scale object to a unit box centered at the origin
let normalizeMesh = function(mesh)
{
	resizeMesh(mesh, 1, 1, 1);
};

// declare namespace to collect unit block-sized meshes
var BLOCK_MESH = {};

// declare namespace to temporarily collect shapes
var SHAPE = {};

/*
   if currentPoint = (x1,y1)
   then bezierCurveTo(xA,yA, xB,yB, x2,y2)
   draws a cubic curve from x1,y1 to x2,y2
   slope at (x1,y1) is slope of segment from (x1,y1) to (xA,yA)
   slope at (x2,y2) is slope of segment from (xB,yB) to (x2,y2)
   the longer a segment is, the closer the cubic curve stays to the segment
*/
let shape;

// Shape: PacMan 
shape = new THREE.Shape(); // Pac-Man
shape.moveTo(0,0);
shape.lineTo( Math.cos(Math.PI/8), Math.sin(Math.PI/8) );
shape.absarc(0,0, 1, Math.PI/8, -Math.PI/8, false);
shape.lineTo(0,0)
SHAPE["PacMan"] = shape;

// Shape: Clover
shape = new THREE.Shape();
shape.moveTo(0.5,0);
shape.absarc(+0.5,+0.5, 0.5, -Math.PI/2, Math.PI, false);
shape.absarc(-0.5,+0.5, 0.5, 0, 3/2*Math.PI, false);
shape.absarc(-0.5,-0.5, 0.5, Math.PI/2, 2*Math.PI, false);
shape.absarc(+0.5,-0.5, 0.5, Math.PI, Math.PI/2, false);
SHAPE["Clover"] = shape;

// Shape: Moon
shape = new THREE.Shape();
shape.moveTo(1,0);
shape.absarc(0,0, 1, Math.PI/2, 2*Math.PI, false);
shape.bezierCurveTo(0,-1, -1,0, 0,1)
SHAPE["Moon"] = shape;

// Shape: Heart
shape = new THREE.Shape();
shape.moveTo(0, 0.5);  
shape.absarc(-0.5,0.5, 0.5, 0, Math.PI, false);
let p = 0.3;
shape.bezierCurveTo(-1,-p, -p,-p, 0,-1);
shape.bezierCurveTo(+p,-p, +1,-p, 1,0.5);
shape.absarc(0.5,0.5, 0.5, 0, Math.PI, false);
SHAPE["Heart"] = shape;

// Shape: Smile
let shape0 = new THREE.Shape();
shape0.moveTo(1,0);
shape0.absarc(0,0, 1, 0, 2*Math.PI, false);

let scx = 0.0;
let scy = -0.15;
let scr = 0.6;
let shape1 = new THREE.Shape();
shape1.moveTo( scx + scr, scy );
shape1.lineTo( scx - scr, scy );
shape1.absarc( scx,scy, scr, Math.PI, 2*Math.PI);

let ecx = 0.35;
let ecy = 0.35;
let ecr = 0.28;
let shape2 = new THREE.Shape();
shape2.moveTo( ecx, ecy );
shape2.absarc( ecx,ecy, ecr, 0, 2*Math.PI);

let shape3 = new THREE.Shape();
shape3.moveTo( -ecx, ecy );
shape3.absarc( -ecx, ecy, ecr, 0, 2*Math.PI);

shape0.holes.push(shape1);
shape0.holes.push(shape2);
shape0.holes.push(shape3);
SHAPE["Smile"] = shape0;

// Shape: Frown
let shape4 = new THREE.Shape();
shape4.moveTo(1,0);
shape4.absarc(0,0, 1, 0, 2*Math.PI, false);

let fcx = 0.0;
let fcy = -0.6;
let fcr = 0.5; 
let shape5 = new THREE.Shape();
shape5.moveTo( fcx - fcr, fcy );
shape5.lineTo( fcx + fcr, fcy );
shape5.absarc( fcx,fcy, fcr, 0, Math.PI);

shape4.holes.push(shape5)
shape4.holes.push(shape2);
shape4.holes.push(shape3);

SHAPE["Frown"] = shape4;

function makeStarShape(numSides)
{
	let shape = new THREE.Shape();
	let angle = Math.PI / numSides;

	shape.moveTo(0.5 * Math.sin(-angle), 0.5 * Math.cos(-angle));

	for (let i = 0; i < 2 * numSides; i++) 
	{
		if (i % 2 == 0)
			shape.lineTo( Math.sin(i*angle), Math.cos(i*angle) );
		else
			shape.lineTo( 0.5 * Math.sin(i*angle), 0.5 * Math.cos(i*angle) );
	}
	return shape;
}

SHAPE["Star4"] = makeStarShape(4);    
SHAPE["Star5"] = makeStarShape(5);    
SHAPE["Star6"] = makeStarShape(6);    

// for a flat shape:
// let geometry = new THREE.ShapeGeometry( SHAPE[shapeName] );
let extrudeSettings = {depth:1, bevelEnabled:false};   
let tempMaterial = new THREE.MeshLambertMaterial( { color: 0xCC88FF } );

// convert each shape to a block mesh
let shapeKeyArray = Object.keys(SHAPE);
for (let i = 0; i < shapeKeyArray.length; i++)
{
	let keyName = shapeKeyArray[i];
	let shape = SHAPE[keyName];
	let mesh = new THREE.Mesh(
		new THREE.ExtrudeGeometry( shape, extrudeSettings ), tempMaterial );
	normalizeMesh(mesh);
	BLOCK_MESH[keyName] = mesh;
}

let cylinder = new THREE.Mesh( 
	new THREE.CylinderGeometry(1,1, 1, 32), tempMaterial );
normalizeMesh(cylinder);
cylinder.geometry.rotateX(Math.PI/2);
BLOCK_MESH["Circle"] = cylinder;

let cube = new THREE.Mesh(
	new THREE.BoxGeometry(1,1,1), tempMaterial );
BLOCK_MESH["Square"] = cube;

function makePrismMesh(numSides)
{
	let prism = new THREE.Mesh( 
		new THREE.CylinderGeometry(1,1, 1, numSides), tempMaterial )
	prism.geometry.rotateX(-Math.PI/2);
	normalizeMesh(prism);
	return prism;
}

BLOCK_MESH["Triangle"] = makePrismMesh(3);
BLOCK_MESH["Diamond"]  = makePrismMesh(4);
BLOCK_MESH["Pentagon"] = makePrismMesh(5);
BLOCK_MESH["Hexagon"]  = makePrismMesh(6);
BLOCK_MESH["Heptagon"] = makePrismMesh(7);
BLOCK_MESH["Octagon"]  = makePrismMesh(8);

// add letters

let fontLoader = new FontLoader();

// text array contains strings to be rendered and converted to mesh data
let textArray = [
	"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
    "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
    "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", 
    "@", "+", "#", "$", "&", "<", ">" ];

// this variable is used to determine when meshes are ready to render
var blockMeshReady = false;

fontLoader.load( '../fonts/droid_sans_bold.typeface.json',  
	function ( font ) 
	{
		let textStyle = { 
			font: font,
			size: 1,   // height: size along y-axis; includes capitals and b,d,f,h,k,l
			height: 1, // depth: size along z-axis
			curveSegments: 10,
			bevelEnabled: false
		};

		for (let i = 0; i < textArray.length; i++)
		{
			let textString = textArray[i];
			let textGeometry = new TextGeometry( textString, textStyle );
			let textMesh = new THREE.Mesh( textGeometry, tempMaterial );			
			normalizeMesh(textMesh);

			BLOCK_MESH[textString] = textMesh;
		}

        console.log("done");
        blockMeshReady = true;
	} 
);