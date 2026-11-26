'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000,DB=process.env.DATA_FILE||path.join(__dirname,'data.json');
let db={streamers:{},donations:[]};
try{db=JSON.parse(fs.readFileSync(DB,'utf8'))}catch(e){}
db.streamers=db.streamers||{};db.donations=db.donations||[];
let tm;const save=()=>{clearTimeout(tm);tm=setTimeout(()=>fs.writeFile(DB,JSON.stringify(db),()=>{}),200)};
const rnd=n=>crypto.randomBytes(n).toString('hex');
const hash=(p,s)=>crypto.scryptSync(p,s,32).toString('hex');
const str=(v,n)=>String(v==null?'':v).trim().slice(0,n);
const clamp=(v,a,b,d)=>{v=Number(v);return isFinite(v)?Math.min(b,Math.max(a,Math.round(v))):d};
const FONTS=['Rubik','Montserrat','Manrope','Russo One','Comfortaa'],SOUNDS=['chime','bell','coin','none'],POS=['bottom','center','top'];
const DEF={c1:'#ff4d5e',c2:'#ff8a3d',font:'Rubik',sound:'chime',vol:70,pos:'bottom',dur:8,min:0,tts:false,ttsMin:0,bad:'',block:'',goalOn:false,goalTitle:'',goalTarget:0,goalStart:0};
const cfg=s=>({...DEF,...(s.cfg||{})});
function cleanCfg(i,o){const c={...DEF,...(o||{})};i=i||{};
  if(/^#[0-9a-f]{6}$/i.test(i.c1))c.c1=i.c1;if(/^#[0-9a-f]{6}$/i.test(i.c2))c.c2=i.c2;
  if(FONTS.includes(i.font))c.font=i.font;if(SOUNDS.includes(i.sound))c.sound=i.sound;if(POS.includes(i.pos))c.pos=i.pos;
  if('vol' in i)c.vol=clamp(i.vol,0,100,c.vol);if('dur' in i)c.dur=clamp(i.dur,3,30,c.dur);
  if('min' in i)c.min=clamp(i.min,0,1e7,c.min);if('ttsMin' in i)c.ttsMin=clamp(i.ttsMin,0,1e7,c.ttsMin);
  if('tts' in i)c.tts=!!i.tts;if('goalOn' in i)c.goalOn=!!i.goalOn;
  if('bad' in i)c.bad=str(i.bad,500);if('block' in i)c.block=str(i.block,500);
  if('goalTitle' in i)c.goalTitle=str(i.goalTitle,60);if('goalTarget' in i)c.goalTarget=clamp(i.goalTarget,0,1e9,c.goalTarget);
  return c}
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const words=t=>String(t||'').split(/[,\n]/).map(x=>x.trim().toLowerCase()).filter(x=>x.length>1);
const clean=(t,c)=>{t=String(t||'');for(const w of words(c.bad))t=t.replace(new RegExp(esc(w),'gi'),m=>'*'.repeat(m.length));return t};
const isBlocked=(n,c)=>{n=String(n||'').toLowerCase();return words(c.block).some(w=>n.includes(w))};
const sty=c=>({c1:c.c1,c2:c.c2,font:c.font,sound:c.sound,vol:c.vol,pos:c.pos});
const clients={},hits={};
const limited=(ip,max)=>{const k=ip+':'+Math.floor(Date.now()/60000);hits[k]=(hits[k]||0)+1;return hits[k]>max};
setInterval(()=>{const n=Math.floor(Date.now()/60000)-2;for(const k in hits)if(+k.split(':').pop()<n)delete hits[k]},120000);
const body=req=>new Promise(ok=>{let b='';req.on('data',c=>{b+=c;if(b.length>1e5)req.destroy()});req.on('end',()=>{try{ok(JSON.parse(b||'{}'))}catch(e){ok({})}})});
const send=(res,c,o)=>{res.writeHead(c,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(o))};
const auth=req=>{const t=req.headers['x-token'];return t&&Object.values(db.streamers).find(s=>s.token===t)};
const page=(res,f)=>fs.readFile(path.join(__dirname,f),(e,d)=>{if(e){res.writeHead(404);return res.end('404')}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(d)});
const push=(slug,d)=>(clients[slug]||new Set()).forEach(r=>r.write('data: '+JSON.stringify(d)+'\n\n'));
function mk(slug,name,amount,msg,status,src){
  const d={id:rnd(6),slug,name:str(name,40)||'Аноним',amount:Math.floor(+amount),msg:str(msg,200),status,ts:Date.now()};
  if(src)d.src=src;db.donations.push(d);if(db.donations.length>8000)db.donations.splice(0,800);save();return d}
function show(s,d,over){
  const c=cfg(s);over=over||{};
  if(d.amount<c.min){push(s.slug,{type:'update'});return false}
  push(s.slug,{type:'alert',id:d.id,name:clean(d.name,c),amount:d.amount,msg:clean(d.msg,c),
    dur:over.dur?clamp(over.dur,3,30,c.dur):c.dur,tts:!!over.tts||(c.tts&&d.amount>=c.ttsMin&&!!d.msg),style:sty(c)});
  push(s.slug,{type:'update'});return true}
const own=s=>db.donations.filter(d=>d.slug===s.slug&&d.status==='confirmed'&&!d.rep);
function widget(s){
  const c=cfg(s),all=own(s),m={};
  all.forEach(d=>{const k=d.name.toLowerCase();m[k]=m[k]||{name:clean(d.name,c),total:0};m[k].total+=d.amount});
  const top=Object.values(m).sort((a,b)=>b.total-a.total).slice(0,5);
  const cur=all.filter(d=>d.ts>=(c.goalStart||0)).reduce((a,d)=>a+d.amount,0);
  return {goal:{on:c.goalOn&&c.goalTarget>0,title:c.goalTitle,target:c.goalTarget,current:cur},top,
    recent:all.slice(-5).reverse().map(d=>({name:clean(d.name,c),amount:d.amount})),style:sty(c)}}
function stats(s){
  const all=own(s),OFF=5*3600000,day=86400000,t0=Math.floor((Date.now()+OFF)/day)*day-OFF;
  const sum=a=>a.reduce((x,d)=>x+d.amount,0);
  return {today:sum(all.filter(d=>d.ts>=t0)),week:sum(all.filter(d=>d.ts>=Date.now()-7*day)),total:sum(all),count:all.length}}
function notify(q){
  q.key=q.key||q.token;q.title=q.title||q.ttl;
  const s=Object.values(db.streamers).find(x=>x.nkey&&x.nkey===q.key);
  if(!s)return [403,{error:'key'}];
  const raw=str((q.title?q.title+' ':'')+(q.text||''),500).replace(/ /g,' ');
  if(!raw)return [400,{error:'empty'}];
  s.log=s.log||[];
  if(s.log[0]&&s.log[0].raw===raw&&Date.now()-s.log[0].ts<30000)return [200,{ok:1,dup:1}];
  const am=raw.match(/(\d[\d ]*(?:[.,]\d{1,2})?)\s*(?:₸|тг|тенге|KZT)/i);
  const a=am?Math.floor(Number(am[1].replace(/ /g,'').replace(',','.'))):0;
  const rn=raw.replace(/ё/g,'е').replace(/Ё/g,'Е');
  const incoming=/перевел|перевод|поступил|пополн|получил|\+\s*\d/i.test(rn)&&!/оплат|покупк|списан|снят|платеж/i.test(rn);
  let name='',cmt='';
  const pm=raw.match(/Пополнение:\s*[\d\s.,]+\s*(?:₸|тг|тенге)\s*(.*)$/i);
  if(pm&&pm[1]){const k=pm[1].indexOf(':');if(k>=0){name=pm[1].slice(0,k).trim();cmt=pm[1].slice(k+1).trim()}else name=pm[1].trim()}
  if(!name){const nm=rn.match(/(?:^|[^а-яеa-z])от\s+([^\s,.:;]+(?:\s+[^\s,.:;]{1,2}\.?)?)/i)||rn.match(/(?:^|\s)([А-ЯA-Z][^\s,.:;]+(?:\s+[А-ЯA-Z]\.?)?)\s+перевел/);name=nm?nm[1]:''}
  name=str(name,40);cmt=str(cmt,200);
  const c=cfg(s);let result='ignored';
  if(incoming&&a>0){
    if(isBlocked(name,c))result='blocked';
    else{
      const d=db.donations.filter(x=>x.slug===s.slug&&x.status==='pending'&&!x.src&&x.amount===a&&x.ts>Date.now()-3600000).sort((x,y)=>x.ts-y.ts)[0];
      if(d){d.status='confirmed';if(d.name==='Аноним'&&name)d.name=name;show(s,d);result='matched'}
      else if(s.auto){show(s,mk(s.slug,name,a,cmt,'confirmed'));result='auto'}
      else{mk(s.slug,name||'Kaspi',a,cmt||'из уведомления Kaspi','pending','notify');result='pending'}}}
  s.log.unshift({ts:Date.now(),raw,amount:a,name,result});s.log.length=Math.min(s.log.length,20);save();
  return [200,{ok:1,result}]}
const view=s=>({slug:s.slug,name:s.name,kaspi:s.kaspi,okey:s.okey,nkey:s.nkey,auto:!!s.auto,cfg:cfg(s),stats:stats(s),log:(s.log||[]).slice(0,15),
  donations:db.donations.filter(d=>d.slug===s.slug).slice(-150).reverse()});
http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://x'),p=u.pathname,ip=(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0];
  let m;
  if(req.method==='GET'){
    if(p==='/')return page(res,'index.html');
    if(/^\/s\/[a-z0-9_]+$/.test(p))return page(res,'donate.html');
    if(/^\/overlay\/[a-z0-9_]+$/.test(p))return page(res,'overlay.html');
    if(/^\/o\/[a-z0-9_]+\/[a-f0-9]+(\/(alert|goal|top))?$/.test(p))return page(res,'overlay.html');
    if(p==='/api/notify'){if(limited(ip,60))return send(res,429,{error:'limit'});const r=notify(Object.fromEntries(u.searchParams));return send(res,r[0],r[1])}
    if(m=p.match(/^\/api\/streamer\/([a-z0-9_]+)$/)){const s=db.streamers[m[1]];if(!s)return send(res,404,{error:'Не найден'});const w=widget(s);return send(res,200,{name:s.name,kaspi:s.kaspi,goal:w.goal,top:w.top,style:w.style})}
    if(p==='/api/me'){const s=auth(req);if(!s)return send(res,401,{error:'auth'});if(!s.nkey){s.nkey=rnd(10);save()}return send(res,200,view(s))}
    if(m=p.match(/^\/api\/widget\/([a-z0-9_]+)$/)){const s=db.streamers[m[1]];if(!s||u.searchParams.get('key')!==s.okey)return send(res,403,{error:'key'});return send(res,200,widget(s))}
    if(m=p.match(/^\/api\/stream\/([a-z0-9_]+)$/)){
      const s=db.streamers[m[1]];if(!s||u.searchParams.get('key')!==s.okey)return send(res,403,{error:'key'});
      res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache',Connection:'keep-alive'});res.write(':ok\n\n');
      (clients[s.slug]=clients[s.slug]||new Set()).add(res);
      const k=setInterval(()=>res.write(':p\n\n'),25000);
      req.on('close',()=>{clearInterval(k);clients[s.slug].delete(res)});return}
    res.writeHead(404);return res.end('404')}
  if(req.method!=='POST'){res.writeHead(405);return res.end()}
  const b=await body(req);
  if(p==='/api/notify'){if(limited(ip,60))return send(res,429,{error:'limit'});const r=notify({key:u.searchParams.get('key'),...b});return send(res,r[0],r[1])}
  if(p==='/api/register'){
    if(limited(ip,5))return send(res,429,{error:'Слишком часто'});
    const slug=str(b.slug,24).toLowerCase();
    if(!/^[a-z0-9_]{3,24}$/.test(slug))return send(res,400,{error:'Ник: 3–24 символа, латиница, цифры, _'});
    if(str(b.password,100).length<6)return send(res,400,{error:'Пароль минимум 6 символов'});
    if(db.streamers[slug])return send(res,409,{error:'Ник занят'});
    const salt=rnd(8),s={slug,name:str(b.name,40)||slug,kaspi:str(b.kaspi,60),salt,pw:hash(b.password,salt),token:rnd(16),okey:rnd(8),nkey:rnd(10),auto:false,log:[]};
    db.streamers[slug]=s;save();return send(res,200,{token:s.token})}
  if(p==='/api/login'){
    if(limited(ip,10))return send(res,429,{error:'Слишком часто'});
    const s=db.streamers[str(b.slug,24).toLowerCase()];
    if(!s||hash(str(b.password,100),s.salt)!==s.pw)return send(res,401,{error:'Неверный ник или пароль'});
    return send(res,200,{token:s.token})}
  if(m=p.match(/^\/api\/donate\/([a-z0-9_]+)$/)){
    const s=db.streamers[m[1]];if(!s)return send(res,404,{error:'Не найден'});
    if(limited(ip,5))return send(res,429,{error:'Слишком часто, подождите минуту'});
    const a=Math.floor(+b.amount);if(!(a>=1&&a<=10000000))return send(res,400,{error:'Неверная сумма'});
    if(isBlocked(b.name,cfg(s)))return send(res,200,{ok:1});
    mk(s.slug,b.name,a,b.msg,'pending');return send(res,200,{ok:1})}
  const s=auth(req);if(!s)return send(res,401,{error:'auth'});
  if(p==='/api/confirm'){
    const d=db.donations.find(x=>x.id===b.id&&x.slug===s.slug);if(!d)return send(res,404,{error:'Нет такого'});
    if(b.action==='reject')d.status='rejected';else{d.status='confirmed';show(s,d,{tts:b.tts})}
    save();return send(res,200,{ok:1})}
  if(p==='/api/manual'){
    const a=Math.floor(+b.amount);if(!(a>=1))return send(res,400,{error:'Неверная сумма'});
    show(s,mk(s.slug,b.name,a,b.msg,'confirmed'),{tts:b.tts});return send(res,200,{ok:1})}
  if(p==='/api/replay'){const d=db.donations.find(x=>x.id===b.id&&x.slug===s.slug);if(!d)return send(res,404,{error:'Нет такого'});show(s,{...d,amount:Math.max(d.amount,cfg(s).min)},{tts:b.tts});return send(res,200,{ok:1})}
  if(p==='/api/delete'){const i=db.donations.findIndex(x=>x.id===b.id&&x.slug===s.slug);if(i<0)return send(res,404,{error:'Нет такого'});db.donations.splice(i,1);save();push(s.slug,{type:'update'});return send(res,200,{ok:1})}
  if(p==='/api/test'){const c=cfg(s);push(s.slug,{type:'alert',id:'t'+Date.now(),name:'Тестовый зритель',amount:1000,msg:'Привет, стример! Это проверка оформления.',dur:c.dur,tts:false,style:sty(c)});return send(res,200,{ok:1})}
  if(p==='/api/settings'){
    if('name' in b)s.name=str(b.name,40)||s.name;if('kaspi' in b)s.kaspi=str(b.kaspi,60);if('auto' in b)s.auto=!!b.auto;
    if(b.cfg)s.cfg=cleanCfg(b.cfg,s.cfg);save();push(s.slug,{type:'update'});return send(res,200,{ok:1,cfg:cfg(s)})}
  if(p==='/api/goal/reset'){s.cfg=cleanCfg({},s.cfg);s.cfg.goalStart=Date.now();save();push(s.slug,{type:'update'});return send(res,200,{ok:1})}
  if(p==='/api/rotate'){
    if(b.which==='overlay'){s.okey=rnd(8);(clients[s.slug]||new Set()).forEach(r=>r.end());clients[s.slug]=new Set()}
    else if(b.which==='notify')s.nkey=rnd(10);else return send(res,400,{error:'which'});
    save();return send(res,200,{ok:1,okey:s.okey,nkey:s.nkey})}
  if(p==='/api/password'){
    if(hash(str(b.old,100),s.salt)!==s.pw)return send(res,403,{error:'Неверный текущий пароль'});
    if(str(b.new,100).length<6)return send(res,400,{error:'Новый пароль минимум 6 символов'});
    s.salt=rnd(8);s.pw=hash(str(b.new,100),s.salt);s.token=rnd(16);save();return send(res,200,{ok:1,token:s.token})}
  res.writeHead(404);res.end()
}).listen(PORT,()=>console.log('http://localhost:'+PORT));
