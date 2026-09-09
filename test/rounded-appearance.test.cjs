const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../src/appearance.js');

test('retired art styles migrate in both old and current schemas without changing other preferences',()=>{
  assert.deepEqual(Object.keys(A.ART_STYLES),['classic','mime','clay','pixel','rubber']);
  for(const artStyle of ['paper','doodle'])for(const schemaVersion of [1,2]){
    const value=A.migrate({schemaVersion,artStyle,eyeStyle:'anime',shape:'triangle',skin:'pink',reducedMotion:true});
    assert.equal(value.artStyle,'auto');assert.equal(value.eyeStyle,'anime');assert.equal(value.shape,'triangle');assert.equal(value.skin,'pink');assert.equal(value.motion,'reduced');
    assert.deepEqual(A.migrate(value),value);
  }
});

test('all body outlines are cached, immutable and softly rounded at every sampled turn',()=>{
  for(const shape of A.SHAPES){
    const p=A.points(shape);assert.equal(A.points(shape),p);assert.ok(Object.isFrozen(p)&&p.every(Object.isFrozen));
    for(let i=0;i<p.length;i++){
      const a=p[(i+p.length-1)%p.length],b=p[i],c=p[(i+1)%p.length];
      const turn=Math.acos(Math.max(-1,Math.min(1,((b.x-a.x)*(c.x-b.x)+(b.y-a.y)*(c.y-b.y))/(Math.hypot(b.x-a.x,b.y-a.y)*Math.hypot(c.x-b.x,c.y-b.y)))));
      assert.ok(turn<.20,`${shape} has a sharp turn ${turn}`);
    }
  }
});

test('every pair of body shapes morphs with continuous quadratic tangents and a closed seam',()=>{
  const body={cx:64,cy:64,rx:52,ry:52};
  for(const from of A.SHAPES)for(const to of A.SHAPES)for(const t of [0,.25,.5,.75,1]){
    const path=A.path(to,body,from,t);assert.ok(!/[LC]|NaN|Infinity|undefined/.test(path));
    assert.equal((path.match(/Q/g)||[]).length,120);
    const values=path.match(/-?\d+(?:\.\d+)?/g).map(Number),start=values.slice(0,2),segments=[];
    for(let i=2;i<values.length;i+=4)segments.push({control:values.slice(i,i+2),end:values.slice(i+2,i+4)});
    assert.deepEqual(segments.at(-1).end,start);
    for(let i=0;i<segments.length;i++){
      const previous=segments[(i+segments.length-1)%segments.length],current=segments[i];
      const end=previous.end,control=previous.control,next=current.control;
      for(let axis=0;axis<2;axis++)assert.ok(Math.abs((end[axis]-control[axis])-(next[axis]-end[axis]))<.0031,`${from} -> ${to}: tangent discontinuity`);
    }
    assert.ok(values.every(n=>Number.isFinite(n)&&n>=0&&n<=128));
  }
});

test('pixel art preserves square grid steps while following rounded morph silhouettes',()=>{
  const body={cx:64,cy:64,rx:52,ry:52};
  for(const from of A.SHAPES)for(const to of A.SHAPES)for(const t of [0,.5,1]){
    const path=A.pixelPath(to,body,from,t);
    assert.ok(!/[QLC]|NaN|undefined|Infinity/.test(path));
    assert.equal((path.match(/H/g)||[]).length,120);assert.equal((path.match(/V/g)||[]).length,120);
    const numbers=path.match(/-?\d+(?:\.\d+)?/g).map(Number);assert.ok(numbers.every(n=>n%5===0));
    const a=A.points(from),b=A.points(to);
    for(let i=0;i<120;i++){
      assert.ok(Math.abs(numbers[2*i]-(body.cx+body.rx*(a[i].x+(b[i].x-a[i].x)*t)))<=2.5001);
      assert.ok(Math.abs(numbers[2*i+1]-(body.cy+body.ry*(a[i].y+(b[i].y-a[i].y)*t)))<=2.5001);
    }
    assert.deepEqual(numbers.slice(-2),numbers.slice(0,2));
  }
});
