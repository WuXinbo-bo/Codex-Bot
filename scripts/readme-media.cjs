const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('sharp');
const {buildCatalog}=require('./readme-catalog.cjs');
const root=path.resolve(__dirname,'..'),captures=path.join(root,'output/playwright/readme');
async function build(){
  const catalog=buildCatalog(),report={images:[],animations:[]};
  for(const [group,sheets] of [['readme',catalog.sheets],['atlas',catalog.pages]]){
    const dir=path.join(root,'docs/assets',group);fs.mkdirSync(dir,{recursive:true});
    for(const sheet of sheets){
      const out=path.join(dir,sheet.id+'.webp');
      await sharp(path.join(captures,sheet.id+'.png')).webp({quality:86,effort:6}).toFile(out);
      const meta=await sharp(out).metadata();report.images.push({file:path.relative(root,out).replaceAll('\\','/'),bytes:fs.statSync(out).size,width:meta.width,height:meta.height});
    }
  }
  await sharp(path.join(captures,'hero-hires.png')).webp({quality:90}).toFile(path.join(root,'docs/assets/readme/hero.webp'));
  for(const [name,count] of [['start',80],['complete',120],['story',150]]){
    const frames=[];let width,height;
    for(let i=0;i<count;i++){
      let source=sharp(path.join(captures,name,String(i).padStart(3,'0')+'.png'));
      if(name!=='story')source=source.extract({left:28,top:70,width:530,height:280});
      const {data,info}=await source.resize({width:name==='story'?400:636}).ensureAlpha().raw().toBuffer({resolveWithObject:true});width=info.width;height=info.height;frames.push(data);
    }
    const out=path.join(root,'docs/assets/readme',name+'.gif');
    await sharp(Buffer.concat(frames),{raw:{width,height:height*count,channels:4,pageHeight:height}}).gif({delay:Array(count).fill(100),loop:0,colours:128,effort:8,dither:0}).toFile(out);
    const meta=await sharp(out,{animated:true}).metadata(),durationMs=meta.delay.reduce((a,b)=>a+b,0);
    // Identical holds may be coalesced by the GIF encoder; timing must not change.
    if(meta.pages<20||durationMs!==count*100)throw Error('Animation timing '+name);
    report.animations.push({file:path.relative(root,out).replaceAll('\\','/'),bytes:fs.statSync(out).size,capturedFrames:count,frames:meta.pages,durationMs,width,height});
  }
  report.catalogHash=crypto.createHash('sha256').update(JSON.stringify(catalog)).digest('hex');
  fs.writeFileSync(path.join(root,'docs/assets/readme/media.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({images:report.images.length,staticBytes:report.images.reduce((n,e)=>n+e.bytes,0),animations:report.animations},null,2));
}
build().catch(e=>{console.error(e);process.exitCode=1;});
