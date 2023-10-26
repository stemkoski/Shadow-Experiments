
// ## License
// 
// Copyright (c) 2011 Evan Wallace (http://madebyevan.com/), under the MIT license.
// THREE.js rework by thrax

// # class CSG
// Holds a binary space partition tree representing a 3D solid. Two solids can
// be combined using the `union()`, `subtract()`, and `intersect()` methods.


class CSG {
    constructor() {
        this.polygons = [];
    }
    clone() {
        let csg = new CSG();
        csg.polygons = this.polygons.map(p=>p.clone())
        return csg;
    }

    toPolygons() {
        return this.polygons;
    }

    union(csg) {
        let a = new BSPNode(this.clone().polygons);
        let b = new BSPNode(csg.clone().polygons);
        a.clipTo(b);
        b.clipTo(a);
        b.invert();
        b.clipTo(a);
        b.invert();
        a.build(b.allPolygons());
        return CSG.fromPolygons(a.allPolygons());
    }

    subtract(csg) {
        let a = new BSPNode(this.clone().polygons);
        let b = new BSPNode(csg.clone().polygons);
        a.invert();
        a.clipTo(b);
        b.clipTo(a);
        b.invert();
        b.clipTo(a);
        b.invert();
        a.build(b.allPolygons());
        a.invert();
        return CSG.fromPolygons(a.allPolygons());
    }

    intersect(csg) {
        let a = new BSPNode(this.clone().polygons);
        let b = new BSPNode(csg.clone().polygons);
        a.invert();
        b.clipTo(a);
        b.invert();
        a.clipTo(b);
        b.clipTo(a);
        a.build(b.allPolygons());
        a.invert();
        return CSG.fromPolygons(a.allPolygons());
    }

    // Return a new CSG solid with solid and empty space switched. This solid is
    // not modified.
    inverse() {
        let csg = this.clone();
        csg.polygons.forEach(p=>p.flip());
        return csg;
    }
}

// Construct a CSG solid from a list of `Polygon` instances.
CSG.fromPolygons=function(polygons) {
    let csg = new CSG();
    csg.polygons = polygons;
    return csg;
}

// # class Vector

// Represents a 3D vector.
// 
// Example usage:
// 
//     new CSG.Vector(1, 2, 3);



class Vector {
    constructor(x=0, y=0, z=0) {
        this.x=x;
        this.y=y;
        this.z=z;
    }
    copy(v){
        this.x=v.x;
        this.y=v.y;
        this.z=v.z;
        return this
    }
    clone() {
        return new Vector(this.x,this.y,this.z)
    }
    negate() {
        this.x*=-1;
        this.y*=-1;
        this.z*=-1;
        return this
    }
    add(a) {
        this.x+=a.x
        this.y+=a.y
        this.z+=a.z
        return this;
    }
    sub(a) {
        this.x-=a.x
        this.y-=a.y
        this.z-=a.z
        return this
    }
    times(a) {
        this.x*=a
        this.y*=a
        this.z*=a
        return this
    }
    dividedBy(a) {
        this.x/=a
        this.y/=a
        this.z/=a
        return this
    }
    lerp(a, t) {
        return this.add(tv0.copy(a).sub(this).times(t))
    }
    unit() {
        return this.dividedBy(this.length())
    }
    length(){
        return Math.sqrt((this.x**2)+(this.y**2)+(this.z**2))
    }
    normalize(){
        return this.unit()
    }
    cross(b) {
        let a = this;
		const ax = a.x, ay = a.y, az = a.z;
		const bx = b.x, by = b.y, bz = b.z;

		this.x = ay * bz - az * by;
		this.y = az * bx - ax * bz;
		this.z = ax * by - ay * bx;

		return this;
    }
    dot(b){
        return (this.x*b.x)+(this.y*b.y)+(this.z*b.z)
    }
}

//Temporaries used to avoid internal allocation..
let tv0=new Vector()
let tv1=new Vector()


// # class Vertex

// Represents a vertex of a polygon. Use your own vertex class instead of this
// one to provide additional features like texture coordinates and vertex
// colors. Custom vertex classes need to provide a `pos` property and `clone()`,
// `flip()`, and `interpolate()` methods that behave analogous to the ones
// defined by `CSG.Vertex`. This class provides `normal` so convenience
// functions like `CSG.sphere()` can return a smooth vertex normal, but `normal`
// is not used anywhere else.

class Vertex {

    constructor(pos, uv=null, color=null) {
        this.pos = new Vector().copy(pos);
        // this.normal = new Vector().copy(normal);
        // uv && (this.uv = new Vector().copy(uv)) && (this.uv.z=0);
        // color && (this.color = new Vector().copy(color));
    }

    clone() 
    {
        return new Vertex(this.pos,this.uv,this.color);
    }

    // Invert all orientation-specific data (e.g. vertex normal). Called when the
    // orientation of a polygon is flipped.
    flip() {
        // this.normal.negate();
    }

    // Create a new vertex between this vertex and `other` by linearly
    // interpolating all properties using a parameter of `t`. Subclasses should
    // override this to interpolate additional properties.
    interpolate(other, t) {
        return new Vertex(this.pos.clone().lerp(other.pos, t),
        
        this.uv&&other.uv&&this.uv.clone().lerp(other.uv, t),
        this.color&&other.color&&this.color.clone().lerp(other.color,t) )
    }
}
;
// # class Plane
// Represents a plane in 3D space.

/*
// related constants

*/

class Plane {

    constructor(normal, w) 
    {
        this.normal = normal;
        this.w = w;
    }

    clone() {
        return new Plane(this.normal.clone(),this.w);
    }

    flip() {
        this.normal.negate();
        this.w = -this.w;
    }

    // determine if a point is in front, in back, or (epsilon-)coplanar with this plane
    classifyPoint(point)
    {
        let t = this.normal.dot(point) - this.w;
        if (t > Plane.EPSILON)
            return Plane.FRONT;
        else if (t < -Plane.EPSILON)
            return Plane.BACK;
        else // -Plane.EPSILON <= t <= +Plane.EPSILON
            return Plane.COPLANAR;
    }

    // determine if the polygon is complete
    classifyPolygon(polygon)
    {
        let frontPointCount    = 0;
        let backPointCount     = 0;
        let coplanarPointCount = 0;

        for (let i = 0; i < polygon.vertices.length; i++) 
        {
            let point     = polygon.vertices[i].pos;
            let pointType = this.classifyPoint( point );
            if (pointType == Plane.FRONT)
                frontPointCount += 1;
            else if (pointType == Plane.BACK)
                backPointCount += 1;
            else // pointType == Plane.COPLANAR
                coplanarPointCount += 1;
        }

        if (frontPointCount > 0 && backPointCount == 0)
            return Plane.FRONT;
        else if (frontPointCount == 0 && backPointCount > 0)
            return Plane.BACK;
        else if (frontPointCount == 0 && backPointCount == 0)
            return Plane.COPLANAR;
        else // (frontPointCount > 0 && backPointCount > 0)
            return Plane.SPANNING;
    }

    // SORT polygon into one of four lists of polygons.

    // if the polygon is both in front and in back of plane,
    //   then also split it into multiple polygons (2? more?)
    // Split `polygon` by this plane if needed, then put the polygon or polygon
    // fragments in the appropriate lists. Coplanar polygons go into either
    // `coplanarFront` or `coplanarBack` depending on their orientation with
    // respect to this plane. Polygons in front or in back of this plane go into
    // either `front` or `back`.
    splitPolygon(polygon, coplanarFrontPolygonList, coplanarBackPolygonList, 
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

        // Put the polygon in the correct list, splitting it when necessary.
        if (polygonType == Plane.COPLANAR) 
        {
            if ( this.normal.dot(polygon.plane.normal) > 0 )
                coplanarFrontPolygonList.push(polygon);
            else // dot product < 0
                coplanarBackPolygonList.push(polygon);

            // note: dot product can never be zero,
            //   since that would near the plane/polygon are perpendicular,
            //   but we already know they are coplanar, so that would be impossible.
        }
        else if (polygonType == Plane.FRONT)
        {
            frontPolygonList.push(polygon);
        }
        else if (polygonType == Plane.BACK)
        {
            backPolygonList.push(polygon);
        }
        else // (polygonType == Plane.SPANNING)
        {
            let f = []
              , b = [];
            for (let i = 0; i < polygon.vertices.length; i++) {
                let j = (i + 1) % polygon.vertices.length;
                let ti = types[i]
                  , tj = types[j];
                let vi = polygon.vertices[i]
                  , vj = polygon.vertices[j];
                if (ti != Plane.BACK)
                    f.push(vi);
                if (ti != Plane.FRONT)
                    b.push(ti != Plane.BACK ? vi.clone() : vi);
                if ((ti | tj) == Plane.SPANNING) {
                    let t = (this.w - this.normal.dot(vi.pos)) / this.normal.dot(tv0.copy(vj.pos).sub(vi.pos));
                    let v = vi.interpolate(vj, t);
                    f.push(v);
                    b.push(v.clone());
                }
            }
            if (f.length >= 3)
                frontPolygonList.push(new Polygon(f,polygon.shared));
            if (b.length >= 3)
                backPolygonList.push(new Polygon(b,polygon.shared));
        }
    }
}

// `Plane.EPSILON` is the tolerance used by `splitPolygon()` to decide if a
// point is on the plane.
Plane.EPSILON = 1e-5;

// other class constants
Plane.COPLANAR = 0;
Plane.FRONT    = 1;
Plane.BACK     = 2;
Plane.SPANNING = 3;

Plane.fromPoints = function(a, b, c) {
    let n = tv0.copy(b).sub(a).cross(tv1.copy(c).sub(a)).normalize()
    return new Plane(n.clone(),n.dot(a));
}


// # class Polygon

// Represents a convex polygon. The vertices used to initialize a polygon must
// be coplanar and form a convex loop. They do not have to be `Vertex`
// instances but they must behave similarly (duck typing can be used for
// customization).
// 
// Each convex polygon has a `shared` property, which is shared between all
// polygons that are clones of each other or were split from the same polygon.
// This can be used to define per-polygon properties (such as surface color).

class Polygon {
    constructor(vertices, shared) {
        this.vertices = vertices;
        this.shared = shared;
        this.plane = Plane.fromPoints(vertices[0].pos, vertices[1].pos, vertices[2].pos);
    }
    clone() {
        return new Polygon(this.vertices.map(v=>v.clone()),this.shared);
    }
    flip() {
        this.vertices.reverse().forEach(v=>v.flip())
        this.plane.flip();
    }
}

// # class BSPNode

// Holds a node in a BSP tree. A BSP tree is built from a collection of polygons
// by picking a polygon to split along. That polygon (and all other coplanar
// polygons) are added directly to that node and the other polygons are added to
// the front and/or back subtrees. This is not a leafy BSP tree since there is
// no distinction between internal and leaf nodes.

// This is a node in a binary tree data structure.
// Primarily it stores a plane to divide space into two regions: front and back.
// The plane is used to sort additional plane-storing nodes into "front" and "back" groups,
//   represented by branches of the tree.
class BSPNode 
{
    constructor(polygons) 
    {
        // a Plane divides space into two regions: front and back
        this.plane = null;

        // if they exist, these nodes contain additional Plane objects that are used
        //   to further subdivide space. 
        this.frontNode = null;
        this.backNode  = null;


        this.polygons = [];
        
        if (polygons)
            this.build(polygons);
    }

    // THIS IS USED BOTH FOR INITIAL CONSTRUCTION AND LATER APPENDING

    // Build a BSP tree out of `polygons`. When called on an existing tree, the
    // new polygons are filtered down to the bottom of the tree and become new
    // nodes there. Each set of polygons is partitioned using the first polygon
    // (no heuristic is used to pick a good split).
    build(polygons) 
    {
        if (polygons.length == 0)
            return;

        // if a Plane has not been assigned to this node yet, use the first polygon in the list
        if (!this.plane)
            this.plane = polygons[0].plane.clone();

        let frontPolygonList = [], backPolygonList = [];

        for (let i = 0; i < polygons.length; i++) 
        {
            this.plane.splitPolygon(polygons[i], 
                this.polygons, this.polygons, 
                frontPolygonList, backPolygonList);
        }

        if (frontPolygonList.length > 0) 
        {
            if (!this.frontNode)
                this.frontNode = new BSPNode();
            this.frontNode.build(frontPolygonList);
        }

        if (backPolygonList.length > 0) 
        {
            if (!this.backNode)
                this.backNode= new BSPNode();
            this.backNode.build(backPolygonList);
        }
    }

    clone() 
    {
        let node = new BSPNode();
        node.plane = this.plane && this.plane.clone();
        node.frontNode = this.frontNode && this.frontNode.clone();
        node.backNode = this.backNode && this.backNode.clone();
        node.polygons = this.polygons.map(p=>p.clone());
        return node;
    }

    // Convert solid space to empty space and empty space to solid space.
    invert() {
        for (let i = 0; i < this.polygons.length; i++)
            this.polygons[i].flip();
        
        this.plane && this.plane.flip();
        this.frontNode && this.frontNode.invert();
        this.backNode&& this.backNode.invert();
        let temp = this.frontNode;
        this.frontNode = this.backNode;
        this.backNode= temp;
    }

    // Recursively remove all polygons in `polygons` that are inside this BSP
    // tree.
    clipPolygons(polygons) {
        if (!this.plane)
            return polygons.slice();
        let front = []
          , back = [];
        for (let i = 0; i < polygons.length; i++) {
            this.plane.splitPolygon(polygons[i], front, back, front, back);
        }
        if (this.frontNode)
            front = this.frontNode.clipPolygons(front);
        if (this.backNode)
            back = this.backNode.clipPolygons(back);
        else 
            back = [];
            //return front;
        return front.concat(back);
    }

    // Remove all polygons in this BSP tree that are inside the other BSP tree
    // `bsp`.
    clipTo(bsp) {
        this.polygons = bsp.clipPolygons(this.polygons);
        if (this.frontNode)
            this.frontNode.clipTo(bsp);
        if (this.backNode)
            this.backNode.clipTo(bsp);
    }

    // Return a list of all polygons in this BSP tree.
    allPolygons() {
        let polygons = this.polygons.slice();
        if (this.frontNode)
            polygons = polygons.concat(this.frontNode.allPolygons());
        if (this.backNode)
            polygons = polygons.concat(this.backNode.allPolygons());
        return polygons;
    }

    
}

// Return a new CSG solid representing space in either this solid or in the
// solid `csg`. Neither this solid nor the solid `csg` are modified.
// 
//     A.union(B)
// 
//     +-------+            +-------+
//     |       |            |       |
//     |   A   |            |       |
//     |    +--+----+   =   |       +----+
//     +----+--+    |       +----+       |
//          |   B   |            |       |
//          |       |            |       |
//          +-------+            +-------+
// 
// Return a new CSG solid representing space in this solid but not in the
// solid `csg`. Neither this solid nor the solid `csg` are modified.
// 
//     A.subtract(B)
// 
//     +-------+            +-------+
//     |       |            |       |
//     |   A   |            |       |
//     |    +--+----+   =   |    +--+
//     +----+--+    |       +----+
//          |   B   |
//          |       |
//          +-------+
// 
// Return a new CSG solid representing space both this solid and in the
// solid `csg`. Neither this solid nor the solid `csg` are modified.
// 
//     A.intersect(B)
// 
//     +-------+
//     |       |
//     |   A   |
//     |    +--+----+   =   +--+
//     +----+--+    |       +--+
//          |   B   |
//          |       |
//          +-------+
// 

