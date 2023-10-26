

console.log("three-csg-2")

let { BufferGeometry, Vector3, Vector2 } = THREE;


CSG.fromGeometry = function(geom,objectIndex) {
    let polys = []
    if (geom.isGeometry) {
        let fs = geom.faces;
        let vs = geom.vertices;
        let fm = ['a', 'b', 'c']
        for (let i = 0; i < fs.length; i++) {
            let f = fs[i];
            let vertices = []
            for (let j = 0; j < 3; j++)
                vertices.push(new Vertex(vs[f[fm[j]]],f.vertexNormals[j],geom.faceVertexUvs[0][i][j]))
            polys.push(new Polygon(vertices, objectIndex))
        }
    } else if (geom.isBufferGeometry) {
        let vertices, normals, uvs
        let posattr = geom.attributes.position
        let normalattr = geom.attributes.normal
        let uvattr = geom.attributes.uv
        let colorattr = geom.attributes.color
        let index;
        if (geom.index)
            index = geom.index.array;
        else {
            index = new Array((posattr.array.length / posattr.itemSize) | 0);
            for (let i = 0; i < index.length; i++)
                index[i] = i
        }
        let triCount = (index.length / 3) | 0
        polys = new Array(triCount)
        for (let i = 0, pli = 0, l = index.length; i < l; i += 3,
        pli++) {
            let vertices = new Array(3)
            for (let j = 0; j < 3; j++) {
                let vi = index[i + j]
                let vp = vi * 3;
                let vt = vi * 2;
                let x = posattr.array[vp]
                let y = posattr.array[vp + 1]
                let z = posattr.array[vp + 2]
                let nx = normalattr.array[vp]
                let ny = normalattr.array[vp + 1]
                let nz = normalattr.array[vp + 2]
                //let u = uvattr.array[vt]
                //let v = uvattr.array[vt + 1]
                vertices[j] = new Vertex({
                    x,
                    y,
                    z
                },{
                    x: nx,
                    y: ny,
                    z: nz
                },uvattr&&{
                    x: uvattr.array[vt],
                    y: uvattr.array[vt+1],
                    z: 0
                },colorattr&&{x:colorattr.array[vt],y:colorattr.array[vt+1],z:colorattr.array[vt+2]});
            }
            polys[pli] = new Polygon(vertices,objectIndex)
        }
    } else
        console.error("Unsupported CSG input type:" + geom.type)
    return new CSG(polys)
}

let ttvv0 = new THREE.Vector3()
let tmpm3 = new THREE.Matrix3();
CSG.fromMesh = function(mesh,objectIndex) {
    let csg = CSG.fromGeometry(mesh.geometry,objectIndex)
    tmpm3.getNormalMatrix(mesh.matrix);
    for (let i = 0; i < csg.polygons.length; i++) {
        let p = csg.polygons[i]
        for (let j = 0; j < p.vertices.length; j++) {
            let v = p.vertices[j]
            v.pos.copy(ttvv0.copy(v.pos).applyMatrix4(mesh.matrix));
            v.normal.copy(ttvv0.copy(v.normal).applyMatrix3(tmpm3))
        }
    }
    return csg;
}

// write into allocated array...
let nbuf3=(ct)=>{
    return{
        top:0,
        array:new Float32Array(ct),
        write:function(v){(this.array[this.top++]=v.x);(this.array[this.top++]=v.y);(this.array[this.top++]=v.z);}
    }
}
let nbuf2=(ct)=>{
    return{
        top:0,
        array:new Float32Array(ct),
        write:function(v){(this.array[this.top++]=v.x);(this.array[this.top++]=v.y)}
    }
}

// note: NO SHARED / INDEXED DATA
CSG.toGeometry = function(csg) 
{ 
    let polygonArray = csg.polygons;

    // triCount = number of triangles used by this geometry;
    //   each n-sided polygon contributes (n-2) triangles

    let triCount = 0;        
    for (let polygon of polygonArray)
        triCount += polygon.vertices.length - 2;

    let geom = new THREE.BufferGeometry();


    let posArray = [];
   
    // TODO use these instead
    let uvArray = [];
    let colorArray = [];

    let uvs;
    let colors;

    for (let polygon of polygonArray)
    {
        let pvs = polygon.vertices
        let pvlen = pvs.length
        
        // TODO these should be allocated earlier
        if(pvlen > 0)
        {
            if(pvs[0].color!==undefined){
                if(!colors)colors = nbuf3(triCount*3*3);
            }
            if(pvs[0].uv!==undefined){
                if(!uvs)uvs = nbuf2(triCount * 2 * 3)
            }
        }

        for (let j = 3; j <= pvlen; j++) 
        {            
            posArray.push( pvs[ 0 ].pos.x, pvs[ 0 ].pos.y, pvs[ 0 ].pos.z );
            posArray.push( pvs[j-2].pos.x, pvs[j-2].pos.y, pvs[j-2].pos.z );
            posArray.push( pvs[j-1].pos.x, pvs[j-2].pos.y, pvs[j-1].pos.z );
            
            // TODO make better
            if (uvs)
                (pvs[0].uv)&&(uvs.write(pvs[0].uv)||uvs.write(pvs[j-2].uv)||uvs.write(pvs[j-1].uv));
            if (colors)
                (colors.write(pvs[0].color)||colors.write(pvs[j-2].color)||colors.write(pvs[j-1].color))
        }
    
    }

    geom.setAttribute('position', 
        new THREE.BufferAttribute( new Float32Array(posArray), 3 ) );

    let normalArray = new Array(triCount * 3 * 3).fill(0);
    geom.setAttribute('normal', 
        new THREE.BufferAttribute( new Float32Array(normalArray), 3 ) );

    // TODO fix this
    uvs && geom.setAttribute('uv', new THREE.BufferAttribute(uvs.array,2));
    colors && geom.setAttribute('color', new THREE.BufferAttribute(colors.array,3));
    
    // since this geometry is non-indexed, set each vertex normal to its face normal
	geom.computeVertexNormals();

    return geom;
}

CSG.toMesh = function(csg, toMatrix, toMaterial) {
    let geom = CSG.toGeometry(csg);
    let inv = new THREE.Matrix4().copy(toMatrix).invert();
    geom.applyMatrix4(inv);
    geom.computeBoundingSphere();
    geom.computeBoundingBox();
    let m = new THREE.Mesh(geom,toMaterial);
    m.matrix.copy(toMatrix);
    m.matrix.decompose(m.position, m.quaternion, m.scale)
    m.rotation.setFromQuaternion(m.quaternion)
    m.updateMatrixWorld();
    m.castShadow = m.receiveShadow = true;
    return m
}

// import "./csg-worker.js" ???

// export default CSG
