// ## License
// 
// Copyright (c) 2011 Evan Wallace (http://madebyevan.com/), under the MIT license.
// Rewrite by Lee Stemkoski

// namespace

var CSG = CSG || {};

// a Vector can represent either a point or a vector
CSG.Vector = class
{
    constructor(x=0, y=0, z=0) 
    {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    // this function is used for efficiency:
    //   we could copy data into a reusable temporary object 
    //   to avoid repeated full allocation of new object
    //   (that becomes extra garbage for the collector)
    // not currently used
    copy(v)
    {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }

    clone()
    {
        return new CSG.Vector(this.x, this.y, this.z);
    }

    add(v) 
    {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }

    sub(v) 
    {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }

    mult(s) 
    {
        this.x *= s;
        this.y *= s; 
        this.z *= s; 
        return this;
    }
   
    div(s) 
    {
        this.x /= s;
        this.y /= s;
        this.z /= s;
        return this;
    }
    
    // linear interpolation
    lerp(v, t) 
    {
        this.x = ((1 - t) * this.x) + (t * v.x);  
        this.y = ((1 - t) * this.y) + (t * v.y);  
        this.z = ((1 - t) * this.z) + (t * v.z);  
        return this;
    }

    length()
    {
        return Math.sqrt( (this.x**2) + (this.y**2) + (this.z**2) );
    }

    normalize()
    {
        this.div( this.length() );
        return this;
    }

    dot(v)
    {
        return (this.x * v.x) + (this.y * v.y) + (this.z * v.z);
    }

    cross(v) 
    {
        const a = {x:this.x, y:this.y, z:this.z};
		this.x = a.y * v.z - a.z * v.y;
		this.y = a.z * v.x - a.x * v.z;
		this.z = a.x * v.y - a.y * v.x;
		return this;
    }
}

// a Vertex is a data structure that stores information, defined by Vectors, including 
//   position, uv, normal, and color (currently only stores position for clarity)
CSG.Vertex = class 
{
    constructor(position) 
    {
        this.pos = position.clone();
    }

    clone() 
    {
        return new CSG.Vertex( this.pos );
    }

    interpolate(other, t) 
    {
        return new CSG.Vertex( this.pos.clone().lerp(other.pos, t) )
    }
}

// tolerance used to determine if a point is on a plane
CSG.EPSILON = 1e-6;

// constant used to classify position of point/polygon relative to plane
CSG.COPLANAR = 0;
CSG.FRONT    = 1;
CSG.BACK     = 2;
CSG.SPANNING = 3;

CSG.Plane = class 
{
    // normal = unit normal vector to plane
    // d = distance from origin to plane = (unit normal) dot (point on plane)
    constructor(normal, d)  
    {
        this.normal = normal;
        this.d = d;
    }

    clone() 
    {
        // TODO: why is normal cloned? what happens to clones of this plane?
        return new CSG.Plane(this.normal.clone(), this.d);
    }

    flip() 
    {
        this.normal.mult(-1);
        this.d *= -1;
    }

    // determine if a point is in front, in back, or (epsilon-)coplanar with this plane
    classifyPoint(point)
    {
        let t = this.normal.dot(point) - this.d;
        if (t > CSG.EPSILON)
            return CSG.FRONT;
        else if (t < -CSG.EPSILON)
            return CSG.BACK;
        else // -CSG.EPSILON <= t <= +CSG.EPSILON
            return CSG.COPLANAR;
    }

    // determine if the polygon is in front, in back, coplanar with, or spanning across this plane
    classifyPolygon(polygon)
    {
        let frontPointCount    = 0;
        let backPointCount     = 0;
        let coplanarPointCount = 0;

        for (let i = 0; i < polygon.vertices.length; i++) 
        {
            let point     = polygon.vertices[i].pos;
            let pointType = this.classifyPoint( point );
            if (pointType == CSG.FRONT)
                frontPointCount += 1;
            else if (pointType == CSG.BACK)
                backPointCount += 1;
            else // pointType == CSG.COPLANAR
                coplanarPointCount += 1;
        }

        if (frontPointCount > 0 && backPointCount == 0)
            return CSG.FRONT;
        else if (frontPointCount == 0 && backPointCount > 0)
            return CSG.BACK;
        else if (frontPointCount == 0 && backPointCount == 0)
            return CSG.COPLANAR;
        else // (frontPointCount > 0 && backPointCount > 0)
            return CSG.SPANNING;
    }

    // Sort polygon into one of four lists of polygons.
    // If the polygon is both in front and in back of thisPlane,
    //   then also split it into multiple polygons (only two polygons?)
    splitAndSortPolygon(polygon, coplanarFrontPolygonList, coplanarBackPolygonList, 
        frontPolygonList, backPolygonList) 
    {
        let types = [];
        for (let i = 0; i < polygon.vertices.length; i++) 
        {
            let point = polygon.vertices[i].pos;
            let type = this.classifyPoint( point );
            types.push(type);
        }

        let polygonType = this.classifyPolygon(polygon);

        // put the polygon in the correct list, splitting it when necessary
        if (polygonType == CSG.FRONT)
        {
            frontPolygonList.push(polygon);
        }
        else if (polygonType == CSG.BACK)
        {
            backPolygonList.push(polygon);
        }
        else if (polygonType == CSG.COPLANAR) 
        {
            if ( this.normal.dot(polygon.plane.normal) > 0 )
                coplanarFrontPolygonList.push(polygon);
            else // dot product < 0
                coplanarBackPolygonList.push(polygon);

            // note: dot product can never be zero,
            //   since that would near the plane/polygon are perpendicular,
            //   but we already know they are coplanar, so that would be impossible.
        } 
        else // (polygonType == CSG.SPANNING)
        {
            let frontVertexList = [];
            let backVertexList  = [];
            for (let i = 0; i < polygon.vertices.length; i++) 
            {
                let j = (i + 1) % polygon.vertices.length;

                let vertexI = polygon.vertices[i]
                let vertexJ = polygon.vertices[j];
                let typeI = types[i];
                let typeJ = types[j];
                
                if (typeI == CSG.FRONT)
                    frontVertexList.push(vertexI);

                if (typeI == CSG.BACK)
                    backVertexList.push(vertexI);

                if (typeI == CSG.COPLANAR)
                {
                    frontVertexList.push(vertexI);
                    backVertexList.push(vertexI.clone());
                }
                
                if ((typeI == CSG.FRONT && typeJ == CSG.BACK) ||
                    (typeI == CSG.BACK  && typeJ == CSG.FRONT) ) 
                {
                    // TODO: replace clone by copy into CSG class temp Vector object?
                    let t = (this.d - this.normal.dot(vertexI.pos)) / this.normal.dot( vertexJ.pos.clone().sub(vertexI.pos) );
                    let v = vertexI.interpolate(vertexJ, t);
                    frontVertexList.push(v);
                    backVertexList.push(v.clone());
                }
            }

            if (frontVertexList.length >= 3)
                frontPolygonList.push(new CSG.Polygon(frontVertexList));
            
            if (backVertexList.length >= 3)
                backPolygonList.push(new CSG.Polygon(backVertexList));
        }
    }
}

// store an array of Vertex objects (positions must be coplanar and form a convex loop)
//   and a Plane to classify position of other objects relative to the Polygon.
// TODO: why convex??
CSG.Polygon = class
{
    constructor(vertexArray) 
    {
        this.vertices = vertexArray;

        let a = vertexArray[0].pos.clone();
        let b = vertexArray[1].pos.clone();
        let c = vertexArray[2].pos.clone();
        let normal = b.sub(a).cross( c.sub(a) ).normalize();
        let w = normal.dot(a);
        this.plane = new CSG.Plane(normal, w); 
    }

    clone()
    {
        let cloneVertexArray = [];
        for (let vertex of this.vertices)
            cloneVertexArray.push( vertex.clone() );
        return new CSG.Polygon(cloneVertexArray);
    }

    flip() 
    {    
        // The array of vertices (initially specified in counterclockwise order)
        //   does not technically need to be reversed for CSG calculation purposes; 
        //   their order is no longer relevant, 
        //   because the polygon's normal vector is never recalculated.

        // However, vertex order is important for the extrude method below
        this.vertices.reverse();
        this.plane.flip();
    }

    extrudeToMesh(distance=1)
    {
        let n = this.vertices.length;
        let polygonBottom = this.clone();
        let polygonTop    = this.clone();
        for (let i = 0; i < n; i++)
        {
            // translate by distance along the (unit) normal direction
            polygonTop.vertices[i].pos.add( this.plane.normal.clone().mult(distance) );
        }

        let polygonList = [polygonBottom, polygonTop];
        // add side faces resulting from extrusion
        for (let i = 0; i < n; i++)
        {
            let face = new CSG.Polygon([
                polygonTop.vertices[i].clone(),
                polygonBottom.vertices[i].clone(),
                polygonBottom.vertices[(i+1)%n].clone(),
                polygonTop.vertices[(i+1)%n].clone()
            ]);

            polygonList.push( face ); 
        }

        polygonBottom.flip();
        return new CSG.Mesh(polygonList) 
    }

    // convert this polygon to a list of triangular polygons
    //   use the "ear clipping" algorithm to handle non-convex polygons
    triangularize()
    {
        // test: assume convex
        let triangleArray = []; 
        for (let i = 3; i <= this.vertices.length; i++)
        {
            let triangle = new CSG.Polygon([
                this.vertices[0].clone(),
                this.vertices[i-2].clone(),
                this.vertices[i-1].clone()
            ]);
            triangleArray.push( triangle );
        }
        return triangleArray;
    }
}

// a Mesh is a collection of Polygons with convenience methods for class functions
CSG.Mesh = class 
{
    constructor(polygons=[]) 
    {
        this.polygons = polygons;
    }

    clone() 
    {
        let cloneMesh = new CSG.Mesh();
        for (let polygon of this.polygons)
            cloneMesh.polygons.push( polygon.clone() );
        return cloneMesh;
    }

    union(other) 
    {
        return CSG.union(this, other);
    }

    intersect(other) 
    {
        return CSG.intersect(this, other);
    }

    subtract(other) 
    {
       return CSG.subtract(this, other);
    }

    toMeshGeometry()
    {
        return CSG.toMeshGeometry(this);
    }

    toLineGeometry()
    {
        return CSG.toLineGeometry(this);
    }
}

CSG.union = function( csgMesh1, csgMesh2 )
{
    let bspA = new CSG.BSPNode(csgMesh1.clone().polygons);
    let bspB = new CSG.BSPNode(csgMesh2.clone().polygons);
    bspA.clipTo(bspB);
    bspB.clipTo(bspA);
    bspB.invert();
    bspB.clipTo(bspA);
    bspB.invert();
    bspA.augment(bspB.getAllPolygons());
    return new CSG.Mesh( bspA.getAllPolygons() );
}

CSG.intersect = function( csgMesh1, csgMesh2 )
{
    let bspA = new CSG.BSPNode(csgMesh1.clone().polygons);
    let bspB = new CSG.BSPNode(csgMesh2.clone().polygons);
    bspA.invert();
    bspB.clipTo(bspA);
    bspB.invert();
    bspA.clipTo(bspB);
    bspB.clipTo(bspA);
    bspA.augment(bspB.getAllPolygons());
    bspA.invert();
    return new CSG.Mesh( bspA.getAllPolygons() );
}

CSG.subtract = function( csgMesh1, csgMesh2 )
{
    let bspA = new CSG.BSPNode(csgMesh1.clone().polygons);
    let bspB = new CSG.BSPNode(csgMesh2.clone().polygons);
    bspA.invert();
    bspA.clipTo(bspB);
    bspB.clipTo(bspA);
    bspB.invert();
    bspB.clipTo(bspA);
    bspB.invert();
    bspA.augment(bspB.getAllPolygons());
    bspA.invert();
    return new CSG.Mesh( bspA.getAllPolygons() );
}

CSG.createBox = function(centerPoint = new CSG.Vector(0,0,0), xSize=1, ySize=1, zSize=1)
{
    let p = centerPoint, hx = xSize/2, hy = ySize/2, hz = zSize/2;
    let pointArray = [
        new CSG.Vector(p.x + hx, p.y + hy, p.z + hz),
        new CSG.Vector(p.x + hx, p.y + hy, p.z - hz),
        new CSG.Vector(p.x + hx, p.y - hy, p.z + hz),
        new CSG.Vector(p.x + hx, p.y - hy, p.z - hz),
        new CSG.Vector(p.x - hx, p.y + hy, p.z + hz),
        new CSG.Vector(p.x - hx, p.y + hy, p.z - hz),
        new CSG.Vector(p.x - hx, p.y - hy, p.z + hz),
        new CSG.Vector(p.x - hx, p.y - hy, p.z - hz)
    ]

    /*

    Top square face:

        p5 +----+ p1
        /    /
    p4 +----+ p0

    Bottom square face:

        p7 +----+ p3
        /    /
    p6 +----+ p2

    */

    // vertex array
    let v = []; 
    for (let i = 0; i < 8; i++)
        v.push( new CSG.Vertex(pointArray[i]) );

    let polygonArray = [
        new CSG.Polygon( [ v[0], v[1], v[5], v[4] ] ), // top
        new CSG.Polygon( [ v[0], v[4], v[6], v[2] ] ), // front
        new CSG.Polygon( [ v[0], v[2], v[3], v[1] ] ), // right
        new CSG.Polygon( [ v[1], v[3], v[7], v[5] ] ), // back
        new CSG.Polygon( [ v[4], v[5], v[7], v[6] ] ), // left
        new CSG.Polygon( [ v[2], v[6], v[7], v[3] ] )  // bottom
    ];

    return new CSG.Mesh( polygonArray );
}

// TODO: new version with just (base)Radius, height, numberOfSides
//  alter with geom transform functions
// TODO: default values
CSG.createPyramid = function(apexPoint, baseCenterPoint, baseRadialVector, baseRadius, numberOfSides )
{
    // all vectors use baseCenterPoint as their initial point
    let apexVector = apexPoint.clone().sub( baseCenterPoint );
    let baseRadialVector1 = baseRadialVector.clone().normalize();
    let baseRadialVector2 = apexVector.clone().cross( baseRadialVector ).normalize();

    // generate points around polygon base
    let basePointArray = [];
    let angle = 2 * Math.PI / numberOfSides;
    for (let pointIndex = 0; pointIndex < numberOfSides; pointIndex++)
    {
        let basePoint = baseCenterPoint.clone()
            .add( baseRadialVector1.clone().mult( baseRadius * Math.cos(pointIndex*angle) ) )
            .add( baseRadialVector2.clone().mult( baseRadius * Math.sin(pointIndex*angle) ) );

        basePointArray.push(basePoint);
    }

    return CSG.createPyramidGeneral(apexPoint, basePointArray);
}

CSG.createPyramidGeneral = function(apexPoint, basePointArray)
{
    let numberOfSides = basePointArray.length;

    // convert Vector objects to Vertex objects, and store in array
    let vertexArray     = [];
    let baseVertexArray = []; // used later for final polygon construction
    vertexArray.push( new CSG.Vertex(apexPoint) );
    for (let pointIndex = 0; pointIndex < numberOfSides; pointIndex++)
    {
        vertexArray.push( new CSG.Vertex( basePointArray[pointIndex] ) );
        baseVertexArray.push( new CSG.Vertex( basePointArray[pointIndex] ) );
    }

    // generate faces of pyramid - Polygon objects
    let polygonArray = [];
    /* 
        example: square base pyramid
        vertexArray: v0 (apex), v1 v2 v3 v4 (base vertices in counterclockwise order from above)
        polygons: v0 v1 v2, v0 v2 v3, v0 v3 v4, v0 v4 v1 (triangle sides)
                  and v4 v3 v2 v1 (square base)
    */

    // triangle faces (except final)
    for (let i = 1; i < numberOfSides; i++)
    {
        polygonArray.push( new CSG.Polygon( [
            vertexArray[0], vertexArray[i], vertexArray[i+1]
        ] ) );
    }

    // final triangle face
    polygonArray.push( new CSG.Polygon( [
        vertexArray[0], vertexArray[numberOfSides], vertexArray[1]
    ] ) );

    // polygon base; requires reversing order of base vertex objects for correct orientation
    polygonArray.push( new CSG.Polygon( baseVertexArray.reverse() ));
    
    return new CSG.Mesh( polygonArray );
}

CSG.createRegularPolygon = function(radius=1, numberOfSides=6)
{
    let vertexList = [];
    let a = 2 * Math.PI / numberOfSides;
    for (let i = 0; i < numberOfSides; i++)
    {
        let vector = new CSG.Vector( radius * Math.sin(i*a), 0, radius * Math.cos(i*a) );
        vertexList.push( new CSG.Vertex( vector ) );
    }
    return new CSG.Polygon( vertexList );
}

CSG.createStarPolygon = function(outerRadius=2, innerRadius=1, numberOfSides=5)
{
    let vertexList = [];
    let a = 2 * Math.PI / numberOfSides;
    for (let i = 0; i < numberOfSides; i++)
    {
        let innerVector = new CSG.Vector( innerRadius * Math.sin((i-0.5)*a), 0, innerRadius * Math.cos((i-0.5)*a) );
        vertexList.push( new CSG.Vertex( innerVector ) );
        let outerVector = new CSG.Vector( outerRadius * Math.sin(i*a), 0, outerRadius * Math.cos(i*a) );
        vertexList.push( new CSG.Vertex( outerVector ) );
        
    }
    return new CSG.Polygon( vertexList );
}

// TODO:
// CSG.createSphere = function()
// CSG.translate(xt,yt,zt), CSG.scale(xs, ys, zs), CSG.rotateX(a), etc. (global transforms only)

// a node in a Binary Space Partitioning tree
// each node stores a plane used to classify objects into "front" or "back" branches.
CSG.BSPNode = class 
{
    constructor(polygons) 
    {
        // a Plane divides space into two regions: front and back
        this.plane = polygons[0].plane.clone();

        // if they exist, these nodes contain additional Plane objects that are used
        //   to further subdivide space. 
        this.frontNode = null;
        this.backNode  = null;

        this.polygons = [];
        
        if (polygons)
            this.augment(polygons);
    }

    // sort additional polygons into this tree structure
    augment(polygons) 
    {
        // TODO: is this really necessary?
        if (!polygons || polygons.length == 0)
            return;

        // TODO: is this really necessary?
        //if (!this.plane)
        //    this.plane = polygons[0].plane.clone();

        let frontPolygonList = [];
        let  backPolygonList = [];

        for (let i = 0; i < polygons.length; i++) 
        {
            this.plane.splitAndSortPolygon(polygons[i], 
                this.polygons, this.polygons, 
                frontPolygonList, backPolygonList);
        }

        if (frontPolygonList.length > 0) 
        {
            if (this.frontNode == null)
                this.frontNode = new CSG.BSPNode(frontPolygonList);
            else
                this.frontNode.augment(frontPolygonList);
        }

        if (backPolygonList.length > 0) 
        {
            if ( this.backNode == null )
                this.backNode = new CSG.BSPNode(backPolygonList);
            else
                this.backNode.augment(backPolygonList);
        }
    }

    // inverting a node reverses "inside" and "outside"; 
    //   interior space becomes exterior space and vice versa
    invert() 
    {
        // TODO: determine if this is necessary?
        // for (let i = 0; i < this.polygons.length; i++)
        //    this.polygons[i].flip();
        
        this.plane.flip();

        if (this.frontNode != null) 
            this.frontNode.invert();
        
        if (this.backNode != null)
            this.backNode.invert();

        // swap front and back nodes
        let tempNode = this.frontNode;
        this.frontNode = this.backNode;
        this.backNode = tempNode;
    }

    // recursively split and remove all polygons in polygonList that are 
    //   "inside" this mesh, indicated by being on back side of a leaf of the BSP tree.
    clipPolygons(polygonList) 
    {

        let frontPolygonList = [];
        let  backPolygonList = [];

        for (let i = 0; i < polygonList.length; i++) 
        {
            // when sorting here, coplanarity is irrelevant
            this.plane.splitAndSortPolygon(polygonList[i], 
                frontPolygonList, backPolygonList, 
                frontPolygonList, backPolygonList);
        }

        if (this.frontNode != null)
            frontPolygonList = this.frontNode.clipPolygons(frontPolygonList);

        if (this.backNode != null)
            backPolygonList = this.backNode.clipPolygons(backPolygonList);
        else // (this.backNode == null)
            backPolygonList = [];
            
        return frontPolygonList.concat(backPolygonList);
    }

    // Remove all polygons in this BSP tree that are inside the other BSP tree
    clipTo(bsp) 
    {
        this.polygons = bsp.clipPolygons(this.polygons);

        if (this.frontNode)
            this.frontNode.clipTo(bsp);
        if (this.backNode)
            this.backNode.clipTo(bsp);
    }

    // recursively generate and return a list of all polygons contained in this BSP tree
    getAllPolygons() 
    {
        // make a copy of the polygon list
        let polygons = this.polygons.slice();

        if (this.frontNode)
            polygons = polygons.concat( this.frontNode.getAllPolygons() );
        if (this.backNode)
            polygons = polygons.concat( this.backNode.getAllPolygons() );

        return polygons;
    }
}

// TODO: option to set vertexColors, based on abs value of normal vectors.
// convert to a three.js compatible THREE.BufferGeometry object, use for rendering as solid
//  via new THREE.Mesh( csgMesh.toMeshGeometry(), new THREE.MeshStandardMaterial({color:0x0000FF}) );
CSG.toMeshGeometry = function(csgMesh, triangularize=true) 
{
    let polygonArray = csgMesh.polygons;  

    let triangleArray = [];

    // triangularize the polygons in this array
    if (triangularize)
    {
        for (let polygon of polygonArray)
        { 
            let tempArray = polygon.triangularize(); 
            for (let triangle of tempArray)
                triangleArray.push( triangle );
        }
    }
    else // polygons were already triangularized
    {
        triangleArray = polygonArray;
    }
    
    let geom = new THREE.BufferGeometry();

    let posArray = [];
    
    for (let triangle of triangleArray)
    {
        let tv = triangle.vertices;
        posArray.push( tv[0].pos.x, tv[0].pos.y, tv[0].pos.z );
        posArray.push( tv[1].pos.x, tv[1].pos.y, tv[1].pos.z );
        posArray.push( tv[2].pos.x, tv[2].pos.y, tv[2].pos.z );           
    }

    geom.setAttribute('position', 
        new THREE.BufferAttribute( new Float32Array(posArray), 3 ) );
    
    // size of array: each triangle has 3 vertices, each vertex has 3 coordinates
    let normalArray = new Array(triangleArray.length * 3 * 3).fill(0.0); 
    geom.setAttribute('normal', 
        new THREE.BufferAttribute( new Float32Array(normalArray), 3 ) );

    // since this geometry is non-indexed, set each vertex normal to its face normal
	geom.computeVertexNormals();
    
    return geom;
}

// convert to a three.js compatible THREE.BufferGeometry object, use for rendering as wireframe
//  via new THREE.LineSegments( csgMesh.toLineGeometry(), new THREE.LineBasicMaterial({color:0x0000FF}) );
CSG.toLineGeometry = function(csgMesh)
{
    let polygonArray = csgMesh.polygons; 
    let geom = new THREE.BufferGeometry();
    let posArray = [];
    
    for (let polygon of polygonArray)
    {
        let pv = polygon.vertices;
        let pvl = polygon.vertices.length;
        for (let j = 0; j < pvl; j++) 
        {            
            posArray.push( pv[j].pos.x, pv[j].pos.y, pv[j].pos.z );
            posArray.push( pv[(j+1) % pvl].pos.x, pv[(j+1) % pvl].pos.y, pv[(j+1) % pvl].pos.z );
        }
    }

    geom.setAttribute('position', 
        new THREE.BufferAttribute( new Float32Array(posArray), 3 ) );
    
    return geom;
}