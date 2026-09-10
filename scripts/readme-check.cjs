const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {marked}=require('marked'),sharp=require('sharp');
const {buildCatalog}=require('./readme-catalog.cjs');
const root=path.resolve(__dirname,'..');
const slug=text=>text.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu,'').replace(/\s/g,'-');
const files=['README.md','docs/readme-media.md',...fs.readdirSync(path.join(root,'docs/gallery')).filter(f=>f.endsWith('.md')).map(f=>'docs/gallery/'+f)];
function headings(source){const ids=new Set(),seen={};marked.walkTokens(marked.lexer(source),t=>{if(t.type==='heading'){const id=slug(t.text),n=seen[id]||0;seen[id]=n+1;ids.add(id+(n?'-'+n:''));}});return ids;}
async function check(){
  const catalog=buildCatalog(),saved=JSON.parse(fs.readFileSync(path.join(root,'docs/gallery/catalog.json'),'utf8'));
  if(JSON.stringify(catalog)!==JSON.stringify(saved))throw Error('Regenerate stale catalog');
  const media=JSON.parse(fs.readFileSync(path.join(root,'docs/assets/readme/media.json'),'utf8'));
  if(media.catalogHash!==crypto.createHash('sha256').update(JSON.stringify(catalog)).digest('hex'))throw Error('Regenerate stale images');
  const external=new Set(),images=new Set(),readmeImages=new Set();let links=0;
  for(const file of files){
    const source=fs.readFileSync(path.join(root,file),'utf8');
    marked.walkTokens(marked.lexer(source),t=>{
      if(!['link','image'].includes(t.type))return;const href=t.href;links++;
      if(/^https?:/.test(href)){external.add(href);return;}
      if(/^[a-z]+:/i.test(href))throw Error('Unsupported link '+href);
      const [raw,hash]=href.split('#'),target=path.resolve(path.dirname(path.join(root,file)),decodeURIComponent(raw||path.basename(file)));
      if(!fs.existsSync(target))throw Error('Missing link '+file+' -> '+href);
      if(hash&&target.endsWith('.md')&&!headings(fs.readFileSync(target,'utf8')).has(decodeURIComponent(hash)))throw Error('Missing anchor '+href);
      if(t.type==='image'){images.add(target);if(file==='README.md')readmeImages.add(target);}
    });
  }
  let totalBytes=0,readmeBytes=0;
  for(const file of images){
    const bytes=fs.statSync(file).size;totalBytes+=bytes;if(readmeImages.has(file))readmeBytes+=bytes;
    const m=await sharp(file,{animated:true}).metadata();if(!m.width||!m.height)throw Error('Invalid image '+file);
    if(file.endsWith('.webp')&&bytes>250*1024)throw Error('Large static image '+file);
  }
  for(const motion of media.animations){
    const m=await sharp(path.join(root,motion.file),{animated:true}).metadata();
    if(m.pages!==motion.frames||m.delay.reduce((a,b)=>a+b,0)!==motion.durationMs||motion.frames<20)throw Error('Invalid animation '+motion.file);
  }
  if(readmeBytes>5*1024**2||totalBytes>8*1024**2)throw Error('Image budget exceeded');
  const dir=path.join(root,'.runtime/readme-preview');fs.mkdirSync(dir,{recursive:true});
  const css='*{box-sizing:border-box}body{margin:0;background:white;color:#1f2328;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;letter-spacing:0}article{max-width:880px;margin:auto;padding:32px}h1,h2{border-bottom:1px solid #d1d9e0;padding-bottom:.3em;line-height:1.3}h1{font-size:32px}h2{font-size:24px;margin-top:32px}h3{font-size:20px;margin-top:24px}a{color:#0969da;text-decoration:none}a:hover{text-decoration:underline}img{max-width:100%;height:auto}p{margin:16px 0}table{border-collapse:collapse;display:block;max-width:100%;overflow:auto}th,td{padding:6px 13px;border:1px solid #d1d9e0}tr:nth-child(even){background:#f6f8fa}pre{background:#f6f8fa;overflow:auto;padding:16px;border-radius:6px}code{font-size:13px}li+li{margin-top:4px} @media(max-width:520px){article{padding:20px 16px}h1{font-size:28px}}';
  for(const file of files){
    const used={};marked.use({renderer:{
      heading({tokens,depth,text}){const id=slug(text),n=used[id]||0;used[id]=n+1;return `<h${depth} id="${id}${n?'-'+n:''}">${this.parser.parseInline(tokens)}</h${depth}>`;},
      link({href,tokens}){
        if(!/^(https?:|#)/.test(href)){
          const [part,hash]=href.split('#'),target=path.relative(root,path.resolve(root,path.dirname(file),part)).replaceAll('\\','/');
          if(files.includes(target))href='/.runtime/readme-preview/'+target.replaceAll('/','-').replace('.md','.html')+(hash?'#'+hash:'');
        }
        return `<a href="${href.replaceAll('&','&amp;').replaceAll('"','&quot;')}">${this.parser.parseInline(tokens)}</a>`;
      }
    }});
    const base='/'+path.dirname(file).replaceAll('\\','/').replace(/^\.$/,'');
    const html=marked.parse(fs.readFileSync(path.join(root,file),'utf8'));
    fs.writeFileSync(path.join(dir,file.replaceAll('/','-').replace('.md','.html')),`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="${base.endsWith('/')?base:base+'/'}"><link rel="icon" href="data:,"><title>Codex Bot · 文档预览</title><style>${css}</style></head><body><article>${html}</article></body></html>`);
  }
  const remote=[];
  if(process.argv.includes('--remote'))for(const url of external){const r=await fetch(url,{method:'HEAD',signal:AbortSignal.timeout(15000)});remote.push({url,status:r.status});if(!r.ok)throw Error('Remote link '+r.status+' '+url);}
  const report={documents:files.length,links,images:images.size,readmeImages:readmeImages.size,readmeBytes,totalBytes,remote};
  fs.writeFileSync(path.join(root,'output/playwright/readme/check.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}
check().catch(e=>{console.error(e);process.exitCode=1;});
