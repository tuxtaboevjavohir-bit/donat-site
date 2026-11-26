const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000,DB=process.env.DATA_FILE||path.join(__dirname,'data.json');
let db={streamers:{},donations:[]};
try{db=JSON.parse(fs.readFileSync(DB,'utf8'))}catch(e){}
let tm;const save=()=>{clearTimeout(tm);tm=setTimeout(()=>fs.writeFile(DB,JSON.stringify(db),()=>{}),200)};
const rnd=n=>crypto.randomBytes(n).toString('hex');
const hash=(p,s)=>crypto.scryptSync(p,s,32).toString('hex');
const clients={},hits={};
const limited=(ip,max)=>{const k=ip+':'+Math.floor(Date.now()/60000);hits[k]=(hits[k]||0)+1;return hits[k]>max};
setInterval(()=>{for(const k in hits)if(+k.split(':').pop()<Math.floor(Date.now()/60000)-2)delete hits[k]},120000);
const body=req=>new Promise(ok=>{let b='';req.on('data',c=>{b+=c;if(b.length>1e5)req.destroy()});req.on('end',()=>{try{ok(JSON.parse(b||'{}'))}catch(e){ok({})}})});
const send=(res,c,o)=>{res.writeHead(c,{'Content-Type':'application/json'});res.end(JSON.stringify(o))};
const auth=req=>{const t=req.headers['x-token'];return t&&Object.values(db.streamers).find(s=>s.token===t)};
const page=(res,f)=>fs.readFile(path.join(__dirname,'public',f),(e,d)=>{if(e){res.writeHead(404);return res.end('404')}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(d)});
const str=(v,n)=>String(v==null?'':v).trim().slice(0,n);
function push(slug,d){(clients[slug]||new Set()).forEach(r=>r.write('data: '+JSON.stringify(d)+'\n\n'))}
function mk(slug,name,amount,msg,status){
  const d={id:rnd(6),slug,name:str(name,40)||'Аноним',amount:Math.floor(+amount),msg:str(msg,200),status,ts:Date.now()};
  db.donations.push(d);if(db.donations.length>5000)db.donations.splice(0,500);save();return d}
const alertOf=d=>({id:d.id,name:d.name,amount:d.amount,msg:d.msg,dur:8,tts:false});
http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://x'),p=u.pathname,ip=req.headers['x-forwarded-for']||req.socket.remoteAddress||'';
  let m;
  if(req.method==='GET'){
    if(p==='/')return page(res,'index.html');
    if(/^\/s\/[a-z0-9_]+$/.test(p))return page(res,'donate.html');
    if(/^\/overlay\/[a-z0-9_]+$/.test(p))return page(res,'overlay.html');
    if(m=p.match(/^\/api\/streamer\/([a-z0-9_]+)$/)){const s=db.streamers[m[1]];return s?send(res,200,{name:s.name,kaspi:s.kaspi}):send(res,404,{error:'Не найден'})}
    if(p==='/api/me'){const s=auth(req);if(!s)return send(res,401,{error:'auth'});
      return send(res,200,{slug:s.slug,name:s.name,kaspi:s.kaspi,okey:s.okey,donations:db.donations.filter(d=>d.slug===s.slug).slice(-150).reverse()})}
    if(m=p.match(/^\/api\/stream\/([a-z0-9_]+)$/)){
      const s=db.streamers[m[1]];if(!s||u.searchParams.get('key')!==s.okey)return send(res,403,{error:'key'});
      res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache',Connection:'keep-alive'});res.write(':ok\n\n');
      (clients[s.slug]=clients[s.slug]||new Set()).add(res);
      const k=setInterval(()=>res.write(':p\n\n'),25000);
      req.on('close',()=>{clearInterval(k);clients[s.slug].delete(res)});return}
    res.writeHead(404);return res.end('404')}
  if(req.method!=='POST'){res.writeHead(405);return res.end()}
  const b=await body(req);
  if(p==='/api/register'){
    if(limited(ip,5))return send(res,429,{error:'Слишком часто'});
    const slug=str(b.slug,24).toLowerCase();
    if(!/^[a-z0-9_]{3,24}$/.test(slug))return send(res,400,{error:'Ник: 3–24 символа, латиница, цифры, _'});
    if(str(b.password,100).length<6)return send(res,400,{error:'Пароль минимум 6 символов'});
    if(db.streamers[slug])return send(res,409,{error:'Ник занят'});
    const salt=rnd(8),s={slug,name:str(b.name,40)||slug,kaspi:str(b.kaspi,60),salt,pw:hash(b.password,salt),token:rnd(16),okey:rnd(8)};
    db.streamers[slug]=s;save();return send(res,200,{token:s.token})}
  if(p==='/api/login'){
    if(limited(ip,10))return send(res,429,{error:'Слишком часто'});
    const s=db.streamers[str(b.slug,24).toLowerCase()];
    if(!s||hash(str(b.password,100),s.salt)!==s.pw)return send(res,401,{error:'Неверный ник или пароль'});
    return send(res,200,{token:s.token})}
  if(m=p.match(/^\/api\/donate\/([a-z0-9_]+)$/)){
    if(!db.streamers[m[1]])return send(res,404,{error:'Не найден'});
    if(limited(ip,5))return send(res,429,{error:'Слишком часто, подождите минуту'});
    const a=Math.floor(+b.amount);if(!(a>=1&&a<=10000000))return send(res,400,{error:'Неверная сумма'});
    mk(m[1],b.name,a,b.msg,'pending');return send(res,200,{ok:1})}
  const s=auth(req);if(!s)return send(res,401,{error:'auth'});
  if(p==='/api/confirm'){
    const d=db.donations.find(x=>x.id===b.id&&x.slug===s.slug);if(!d)return send(res,404,{error:'Нет такого'});
    if(b.action==='reject')d.status='rejected';
    else{d.status='confirmed';push(s.slug,{...alertOf(d),tts:!!b.tts,dur:Math.min(30,Math.max(3,+b.dur||8))})}
    save();return send(res,200,{ok:1})}
  if(p==='/api/manual'){
    const a=Math.floor(+b.amount);if(!(a>=1))return send(res,400,{error:'Неверная сумма'});
    const d=mk(s.slug,b.name,a,b.msg,'confirmed');push(s.slug,{...alertOf(d),tts:!!b.tts,dur:Math.min(30,Math.max(3,+b.dur||8))});return send(res,200,{ok:1})}
  if(p==='/api/replay'){
    const d=db.donations.find(x=>x.id===b.id&&x.slug===s.slug);if(!d)return send(res,404,{error:'Нет такого'});
    push(s.slug,{...alertOf(d),tts:!!b.tts});return send(res,200,{ok:1})}
  if(p==='/api/test'){push(s.slug,{id:'t',name:'Тестовый зритель',amount:1000,msg:'Привет, стример! Это проверка.',dur:6,tts:false});return send(res,200,{ok:1})}
  if(p==='/api/settings'){s.kaspi=str(b.kaspi,60);s.name=str(b.name,40)||s.name;save();return send(res,200,{ok:1})}
  res.writeHead(404);res.end()
}).listen(PORT,()=>console.log('http://localhost:'+PORT));
