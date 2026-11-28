'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000,DB=process.env.DATA_FILE||path.join(__dirname,'data.json');
let db={streamers:{},donations:[]};
try{db=JSON.parse(fs.readFileSync(DB,'utf8'))}catch(e){}
db.streamers=db.streamers||{};db.donations=db.donations||[];db.payments=db.payments||[];db.chats=db.chats||{};db.contacts=db.contacts||[];db.settings=db.settings||{};db.plans=db.plans||{};db.news=db.news||[];
let tm;const save=()=>{clearTimeout(tm);tm=setTimeout(()=>fs.writeFile(DB,JSON.stringify(db),()=>{}),200)};
const rnd=n=>crypto.randomBytes(n).toString('hex');
const hash=(p,s)=>crypto.scryptSync(p,s,32).toString('hex');
const str=(v,n)=>String(v==null?'':v).trim().slice(0,n);
const clamp=(v,a,b,d)=>{v=Number(v);return isFinite(v)?Math.min(b,Math.max(a,Math.round(v))):d};
const CURS=['₸','₽','$','€','₴','сом'],LANGS=['ru','en','kk'];
const FONTS=['Rubik','Montserrat','Manrope','Russo One','Comfortaa'],SOUNDS=['chime','bell','coin','none'],POS=['bottom','center','top'];
const DEF={c1:'#ff4d5e',c2:'#ff8a3d',font:'Rubik',sound:'chime',vol:70,pos:'bottom',dur:8,min:0,tts:false,ttsMin:0,bad:'',block:'',goalOn:false,goalTitle:'',goalTarget:0,goalStart:0,cur:'₸',lang:'ru',pub:true,theme:'classic',topCover:'hero',tickCover:'classic',topTitleD:'',topTitleM:'',topTitleA:'',musicOn:false,musicMin:0,ttsVoice:'',ttsRate:100,ttsPitch:100,ttsVol:100,ttsWho:'all',ttsMax:150};
const THEMES=[
 ['classic','Классика','free','Rubik','#ff4d5e','#ff8a3d'],['minimal','Минимал','free','Rubik','#ffffff','#9aa0ff'],['glass','Стекло','free','Rubik','#7aa2ff','#c084fc'],['mint','Мята','free','Rubik','#34d399','#22d3ee'],
 ['neon','Неон','pro','Russo One','#00f0ff','#ff2bd6'],['sunset','Закат','pro','Oswald','#ff5e9c','#ffb347'],['gold','Золото','pro','Playfair Display','#f6d365','#b8841f'],['pixel','Пиксель 8-бит','pro','Press Start 2P','#ffcd75','#ef7d57'],['cyber','Киберпанк','pro','Unbounded','#fcee0a','#ff2a6d'],
 ['fire','Огонь','max','Russo One','#ff3d00','#ffc400'],['aurora','Аврора','max','Manrope','#22d3ee','#a78bfa'],['sakura','Сакура','max','Comfortaa','#ff8fb8','#ffd1e3'],['hologram','Голограмма','max','Unbounded','#7cf7ff','#9b8cff']
].map(a=>({id:a[0],name:a[1],tier:a[2],font:a[3],c1:a[4],c2:a[5]}));
const mkL=(arr)=>arr.map(a=>({id:a[0],name:a[1],tier:a[2]}));
const COVERS=mkL([['list','Список','free'],['hero','Обложка','free'],['podium','Подиум','pro'],['league','Лига','pro'],['city','Закат города','pro'],['ice','Лёд','pro'],['pixel','Пиксель','pro'],['retro','Ретро-ТВ','pro'],['neonbar','Неон-бар','pro'],['ultra','Ультра-фиолет','pro'],['emerald','Изумруд','pro'],['ruby','Рубин','pro'],['galaxy','Космос','max'],['crown','Корона','max'],['fire','Огонь','max'],['sakura','Сакура','max'],['aurora','Аврора','max'],['miami','Майами','max'],['goldlux','Золотой люкс','max'],['chrome','Хром','max']]);
const TICKS=mkL([['classic','Классика','free'],['minimal','Минимал','free'],['neon','Неон','pro'],['ultra','Ультра-фиолет','pro'],['ice','Лёд','pro'],['matrix','Матрица','pro'],['sunset','Закат','pro'],['fire','Огонь','max'],['gold','Золото','max'],['miami','Майами','max'],['aurora','Аврора','max']]);
const tierOk=(t,f)=>t.tier==='free'||(t.tier==='pro'&&!!f.design)||(t.tier==='max'&&!!f.design2);
const tickOk=(id,f)=>{const t=TICKS.find(x=>x.id===id);return !!t&&tierOk(t,f)};
const coverOk=(id,f)=>{const t=COVERS.find(x=>x.id===id)||COVERS[1];return t.tier==='free'||(t.tier==='pro'&&!!f.design)||(t.tier==='max'&&!!f.design2)};
const THEME=id=>THEMES.find(t=>t.id===id)||THEMES[0];
const themeOk=(id,f)=>{const t=THEME(id);return t.tier==='free'||(t.tier==='pro'&&!!f.design)||(t.tier==='max'&&!!f.design2)};
const YT=/(?:https?:\/\/)?(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:watch\?[^\s]*?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i;
const ytId=t=>{const m=String(t||'').match(YT);return m?m[1]:''};
const DEFPLANS={
 free:{name:'Free',price:0,f:{alerts:30,design:false,sounds:false,tts:false,goal:false,top:false,filters:false,history:20,brand:true,prio:false,star:false,design2:false,widgets:false,widgets2:false,music:false}},
 pro:{name:'Pro',price:2990,f:{alerts:1000,design:true,sounds:true,tts:true,goal:true,top:true,filters:true,history:300,brand:false,prio:false,star:false,design2:false,widgets:true,widgets2:false,music:true}},
 max:{name:'Max',price:6990,f:{alerts:-1,design:true,sounds:true,tts:true,goal:true,top:true,filters:true,history:3000,brand:false,prio:true,star:true,design2:true,widgets:true,widgets2:true,music:true}}};
const PIDS=['free','pro','max'],FBOOL=['design','design2','sounds','tts','goal','top','filters','brand','prio','star','widgets','widgets2','music'],FNUM=['alerts','history'];
const plans=()=>{const o={};PIDS.forEach(k=>{const d=DEFPLANS[k],c=(db.plans||{})[k]||{};o[k]={name:str(c.name,20)||d.name,price:k==='free'?0:(c.price==null?d.price:Math.max(0,Math.floor(+c.price)||0)),f:{...d.f,...(c.f||{})}}});return o};
const ADMINS=(process.env.ADMIN_SLUGS||'joha').toLowerCase().split(',').map(x=>x.trim()).filter(Boolean);
const isAdmin=s=>!!s&&ADMINS.includes(s.slug);
const planId=s=>{if(isAdmin(s))return 'max';return s.plan&&s.planUntil>Date.now()&&PIDS.includes(s.plan)?s.plan:'free'};
const planOf=s=>{const id=planId(s);return {id,...plans()[id]}};
const mkey=()=>new Date(Date.now()+5*3600000).toISOString().slice(0,7);
const usedOf=s=>{const m=mkey();if(!s.used||s.used.m!==m)s.used={m,n:0};return s.used};
const cfg=s=>{const c={...DEF,...(s.cfg||{})},f=planOf(s).f;
  if(!themeOk(c.theme,f))c.theme='classic';
  if(!coverOk(c.topCover,f))c.topCover='hero';
  if(!tickOk(c.tickCover,f))c.tickCover='classic';
  if(!f.music)c.musicOn=false;
  if(!f.sounds&&c.sound!=='none')c.sound='chime';
  if(!f.tts)c.tts=false;
  if(!f.goal)c.goalOn=false;
  if(!f.filters){c.min=0;c.ttsMin=0;c.bad='';c.block=''}
  c.brand=!!f.brand;return c};
function cleanCfg(i,o){const c={...DEF,...(o||{})};i=i||{};
  if(THEMES.some(t=>t.id===i.theme))c.theme=i.theme;if(COVERS.some(t=>t.id===i.topCover))c.topCover=i.topCover;if(TICKS.some(t=>t.id===i.tickCover))c.tickCover=i.tickCover;['topTitleD','topTitleM','topTitleA'].forEach(k=>{if(k in i)c[k]=str(i[k],24)});
  if('musicOn' in i)c.musicOn=!!i.musicOn;if('musicMin' in i)c.musicMin=clamp(i.musicMin,0,1e7,c.musicMin);
  if('ttsVoice' in i)c.ttsVoice=str(i.ttsVoice,100);if('ttsRate' in i)c.ttsRate=clamp(i.ttsRate,50,200,100);if('ttsPitch' in i)c.ttsPitch=clamp(i.ttsPitch,0,200,100);if('ttsVol' in i)c.ttsVol=clamp(i.ttsVol,0,100,100);if('ttsMax' in i)c.ttsMax=clamp(i.ttsMax,20,300,150);if(['all','msg','name'].includes(i.ttsWho))c.ttsWho=i.ttsWho;
  if(SOUNDS.includes(i.sound))c.sound=i.sound;if(POS.includes(i.pos))c.pos=i.pos;
  if('vol' in i)c.vol=clamp(i.vol,0,100,c.vol);if('dur' in i)c.dur=clamp(i.dur,3,30,c.dur);
  if('min' in i)c.min=clamp(i.min,0,1e7,c.min);if('ttsMin' in i)c.ttsMin=clamp(i.ttsMin,0,1e7,c.ttsMin);
  if(CURS.includes(i.cur))c.cur=i.cur;if(LANGS.includes(i.lang))c.lang=i.lang;if('pub' in i)c.pub=!!i.pub;
  if('tts' in i)c.tts=!!i.tts;if('goalOn' in i)c.goalOn=!!i.goalOn;
  if('bad' in i)c.bad=str(i.bad,500);if('block' in i)c.block=str(i.block,500);
  if('goalTitle' in i)c.goalTitle=str(i.goalTitle,60);if('goalTarget' in i)c.goalTarget=clamp(i.goalTarget,0,1e9,c.goalTarget);
  return c}
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const words=t=>String(t||'').split(/[,\n]/).map(x=>x.trim().toLowerCase()).filter(x=>x.length>1);
const clean=(t,c)=>{t=String(t||'');for(const w of words(c.bad))t=t.replace(new RegExp(esc(w),'gi'),m=>'*'.repeat(m.length));return t};
const isBlocked=(n,c)=>{n=String(n||'').toLowerCase();return words(c.block).some(w=>n.includes(w))};
const sty=c=>{const t=THEME(c.theme);return {theme:t.id,c1:t.c1,c2:t.c2,font:t.font,sound:c.sound,vol:c.vol,pos:c.pos,cur:c.cur,lang:c.lang,brand:!!c.brand,tc:c.topCover,tk:c.tickCover,tv:c.ttsVoice,tr:c.ttsRate,tp:c.ttsPitch,tl:c.ttsVol,tw:c.ttsWho,tm:c.ttsMax}};
const clients={},hits={};
const limited=(ip,max,tag)=>{const k=ip+'|'+(tag||'')+':'+Math.floor(Date.now()/60000);hits[k]=(hits[k]||0)+1;return hits[k]>max};
setInterval(()=>{const n=Math.floor(Date.now()/60000)-2;for(const k in hits)if(+k.split(':').pop()<n)delete hits[k]},120000);
const body=req=>new Promise(ok=>{let b='';req.on('data',c=>{b+=c;if(b.length>1e5)req.destroy()});req.on('end',()=>{try{ok(JSON.parse(b||'{}'))}catch(e){ok({})}})});
const send=(res,c,o)=>{res.writeHead(c,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(o))};
const auth=req=>{const t=req.headers['x-token'];return t&&Object.values(db.streamers).find(s=>s.token===t)};
const page=(res,f)=>fs.readFile(path.join(__dirname,f),(e,d)=>{if(e){res.writeHead(404);return res.end('404')}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Access-Control-Allow-Origin':'*'});res.end(d)});
const hesc=t=>String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const baseUrl=req=>(process.env.BASE_URL||('https://'+(req.headers['x-forwarded-host']||req.headers.host||'localhost'))).replace(/\/$/,'');
const pageT=(req,res,f,map)=>fs.readFile(path.join(__dirname,f),'utf8',(e,d)=>{if(e){res.writeHead(404);return res.end('404')}
  map=Object.assign({URL:baseUrl(req)},map||{});d=d.replace(/\{\{(\w+)\}\}/g,(m,k)=>k in map?hesc(map[k]):m);
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Access-Control-Allow-Origin':'*'});res.end(d)});
const push=(slug,d)=>(clients[slug]||new Set()).forEach(r=>r.write('data: '+JSON.stringify(d)+'\n\n'));
function mk(slug,name,amount,msg,status,src){
  const d={id:rnd(6),slug,name:str(name,40)||'Аноним',amount:Math.floor(+amount),msg:str(msg,200),status,ts:Date.now()};
  if(src)d.src=src;db.donations.push(d);if(db.donations.length>8000)db.donations.splice(0,800);save();return d}
function show(s,d,over){
  const c=cfg(s);over=over||{};
  if(s.banned||d.amount<c.min){push(s.slug,{type:'update'});return false}
  const pl=planOf(s),u=usedOf(s);
  if(pl.f.alerts>=0&&u.n>=pl.f.alerts){push(s.slug,{type:'update'});return false}
  u.n++;save();
  push(s.slug,{type:'alert',id:d.id,name:clean((s.nicks&&s.nicks[d.name])||d.name,c),amount:d.amount,msg:clean(d.msg,c),
    dur:over.dur?clamp(over.dur,3,30,c.dur):c.dur,tts:!!over.tts||(c.tts&&d.amount>=c.ttsMin&&!!d.msg),style:sty(c)});
  push(s.slug,{type:'update'});return true}
const own=s=>db.donations.filter(d=>d.slug===s.slug&&d.status==='confirmed'&&!d.rep);
const since=per=>{const H=5*3600000,n=Date.now()+H;if(per==='day')return Math.floor(n/86400000)*86400000-H;if(per==='month'){const d=new Date(n);return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1)-H}return 0};
function widget(s,q){
  q=q||{};const per=['day','month','all'].includes(q.p)?q.p:'all',cnt=clamp(q.n,3,20,10);
  const c=cfg(s),all=own(s),nm=d=>clean((s.nicks&&s.nicks[d.name])||d.name,c),agg=list=>{const m={};list.forEach(d=>{const n=nm(d),k=n.toLowerCase();m[k]=m[k]||{name:n,total:0};m[k].total+=d.amount});return Object.values(m).sort((a,b)=>b.total-a.total)};
  const sorted=agg(all.filter(d=>d.ts>=since(per))),top=sorted.slice(0,5),top2=agg(all);
  const cur=all.filter(d=>d.ts>=(c.goalStart||0)).reduce((a,d)=>a+d.amount,0);
  const f=planOf(s).f,rec=all.slice(-5).reverse().map(d=>({name:nm(d),amount:d.amount,msg:clean(d.msg,c)}));
  return {goal:{on:c.goalOn&&c.goalTarget>0,title:c.goalTitle,target:c.goalTarget,current:cur},top:top,need:top.length>=5?top[4].total+1:0,titles:{day:c.topTitleD,month:c.topTitleM,all:c.topTitleA},
    tick:f.widgets?sorted.slice(0,cnt):[],recent:rec,last:rec[0]||null,ticker:f.widgets?rec:[],leader:f.widgets2?(top2[0]||null):null,locks:{top:false,goal:!f.goal,ticker:!f.widgets,leader:!f.widgets2,music:!f.music},
    music:(f.music&&c.musicOn)?musicQ(s).slice(0,15):[],style:sty(c)}}
const musicQ=s=>{const c=cfg(s);return db.donations.filter(d=>d.slug===s.slug&&d.status==='confirmed'&&!d.rep&&!d.played&&d.amount>=(c.musicMin||0)&&ytId(d.msg)).sort((a,b)=>a.ts-b.ts).map(d=>({id:d.id,vid:ytId(d.msg),name:clean((s.nicks&&s.nicks[d.name])||d.name,c),amount:d.amount,ts:d.ts,msg:String(d.msg||'').replace(YT,'').trim().slice(0,80)}))};
function ranking(period){
  const since=period==='month'?Date.now()-30*86400000:0,agg={};
  db.donations.forEach(d=>{if(d.status!=='confirmed'||d.rep||d.ts<since)return;const a=agg[d.slug]=agg[d.slug]||{total:0,count:0};a.total+=d.amount;a.count++});
  return Object.keys(agg).map(k=>{const s=db.streamers[k];if(!s)return null;const c=cfg(s);if(!c.pub||s.banned)return null;
    return {slug:k,name:s.name,total:agg[k].total,count:agg[k].count,cur:c.cur,star:!!planOf(s).f.star}}).filter(Boolean);}
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
      const d=db.donations.filter(x=>x.slug===s.slug&&x.status==='pending'&&(!x.src||x.src==='site')&&x.amount===a&&x.ts>Date.now()-3600000).sort((x,y)=>x.ts-y.ts)[0];
      if(d){d.status='confirmed';if(d.name==='Аноним'&&name)d.name=name;show(s,d);result='matched'}
      else if(s.auto){show(s,mk(s.slug,name,a,cmt,'confirmed','notify'));result='auto'}
      else{mk(s.slug,name||'Kaspi',a,cmt||'из уведомления Kaspi','pending','notify');result='pending'}}}
  s.log.unshift({ts:Date.now(),raw,amount:a,name,result});s.log.length=Math.min(s.log.length,20);save();
  return [200,{ok:1,result}]}
const pubSet=()=>({kaspi:str(db.settings.kaspi,60),tg:str(db.settings.tg,80),wa:str(db.settings.wa,80),sc:str(db.settings.sc,300)});
const view=s=>{const pl=planOf(s),u=usedOf(s),ch=db.chats[s.slug];return {themes:THEMES,covers:COVERS,ticks:TICKS,slug:s.slug,name:s.name,kaspi:s.kaspi,okey:s.okey,nkey:s.nkey,auto:!!s.auto,cfg:cfg(s),stats:stats(s),log:(s.log||[]).slice(0,15),
  donations:db.donations.filter(d=>d.slug===s.slug).slice(-Math.min(150,pl.f.history>0?pl.f.history:150)).reverse(),
  plan:{id:pl.id,name:pl.name,f:pl.f,until:isAdmin(s)?0:(pl.id==='free'?0:s.planUntil),admin:isAdmin(s)},plans:plans(),usage:{n:u.n,limit:pl.f.alerts},
  payments:db.payments.filter(x=>x.slug===s.slug).slice(-5).reverse(),pay:pubSet(),unread:ch?ch.uu||0:0,banned:!!s.banned,
  online:(clients[s.slug]||new Set()).size,lastNotify:(s.log&&s.log[0])?s.log[0].ts:0,news:db.news.slice(-5).reverse(),
  ref:(()=>{const all=Object.values(db.streamers).filter(x=>x.ref===s.slug);return {invited:all.length,paid:all.filter(x=>x.refPaid).length}})()}};
// ===== FACEIT =====
const FK=process.env.FACEIT_API_KEY||'',FB=process.env.FACEIT_BASE||'https://open.faceit.com/data/v4',fcache={};
async function fq(p){const c=new AbortController(),t=setTimeout(()=>c.abort(),7000);try{const r=await fetch(FB+p,{headers:{Authorization:'Bearer '+FK},signal:c.signal});if(r.status===404)return null;if(!r.ok)throw new Error('FACEIT '+r.status);return await r.json()}finally{clearTimeout(t)}}
const fnum=v=>{const n=parseFloat(String(v).replace(',','.'));return isFinite(n)?n:0};
async function faceitData(s,force){
  const f=s.faceit;if(!f||!FK)return null;const ch=fcache[s.slug];if(!force&&ch&&Date.now()-ch.t<60000)return ch.d;
  const p=await fq('/players/'+encodeURIComponent(f.id));if(!p)throw new Error('Игрок не найден');
  const g=(p.games||{})[f.game]||{},elo=fnum(g.faceit_elo),lvl=fnum(g.skill_level);
  const [ses,rec]=await Promise.all([fq('/players/'+f.id+'/games/'+f.game+'/stats?limit=100&from='+f.since),fq('/players/'+f.id+'/games/'+f.game+'/stats?limit=5')]);
  const si=((ses&&ses.items)||[]).map(i=>i.stats||{}),ri=((rec&&rec.items)||[]).map(i=>i.stats||{});
  const w=si.filter(x=>String(x.Result)==='1').length,k=si.reduce((a,x)=>a+fnum(x.Kills),0),d=si.reduce((a,x)=>a+fnum(x.Deaths),0);
  const out={on:true,nick:p.nickname||f.nick,avatar:p.avatar||'',game:f.game,level:lvl,elo,delta:elo&&f.startElo?elo-f.startElo:0,wins:w,losses:si.length-w,kd:d?Math.round(k/d*100)/100:(k?k:0),form:ri.map(x=>String(x.Result)==='1'?1:0),since:f.since};
  fcache[s.slug]={t:Date.now(),d:out};return out}
const faceitOff=()=>({on:false,keyMissing:!FK});
http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://x'),p=u.pathname,ip=(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0];
  let m;
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, HEAD, OPTIONS','Access-Control-Allow-Headers':'*','Access-Control-Max-Age':'86400'});return res.end()}
  if(req.method==='HEAD')req.method='GET';
  if(req.method==='GET'){
    if(p==='/')return pageT(req,res,'landing.html');
    if(p==='/alert.css')return fs.readFile(path.join(__dirname,'alert.css'),(e,d)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':'text/css; charset=utf-8','Cache-Control':'no-cache','Access-Control-Allow-Origin':'*'});res.end(d)});
    if(p==='/alert.js')return fs.readFile(path.join(__dirname,'alert.js'),(e,d)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-cache','Access-Control-Allow-Origin':'*'});res.end(d)});
    if(p==='/panel')return page(res,'index.html');
    if(p==='/admin')return page(res,'admin.html');
    if(p==='/top')return pageT(req,res,'top.html');
    if(p==='/api/top'){const by=u.searchParams.get('by')==='count'?'count':'total',per=u.searchParams.get('period')==='month'?'month':'all';
      return send(res,200,{list:ranking(per).sort((a,b)=>b[by]-a[by]||b.count-a.count).slice(0,50)})}
    if(p==='/robots.txt'){res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'});return res.end('User-agent: *\nAllow: /\nDisallow: /panel\nDisallow: /admin\nDisallow: /api/\nDisallow: /o/\nDisallow: /w/\nDisallow: /overlay/\nDisallow: /alert\nSitemap: '+baseUrl(req)+'/sitemap.xml\n')}
    if(p==='/sitemap.xml'){const b=baseUrl(req),urls=['/','/top'].concat(Object.keys(db.streamers).filter(k=>cfg(db.streamers[k]).pub&&!db.streamers[k].banned).map(k=>'/s/'+k));
      res.writeHead(200,{'Content-Type':'application/xml; charset=utf-8'});return res.end('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.map(x=>'<url><loc>'+hesc(b+x)+'</loc></url>').join('')+'</urlset>')}
    if(m=p.match(/^\/s\/([a-z0-9_]+)$/)){const t=db.streamers[m[1]];
      if(!t)return pageT(req,res,'donate.html',{TITLE:'Донат стримеру',DESC:'Страница донатов',ROBOTS:'noindex',SLUG:m[1]});
      const c=cfg(t);return pageT(req,res,'donate.html',{TITLE:t.name+' — донат на стриме',DESC:'Поддержать стримера '+t.name+': перевод через Kaspi, ваше сообщение появится в прямом эфире TikTok LIVE.',ROBOTS:c.pub?'index,follow':'noindex',SLUG:m[1]})}
    if(/^\/overlay\/[a-z0-9_]+$/.test(p))return page(res,'overlay.html');
    if(/^\/o\/[a-z0-9_]+\/[a-f0-9]+(\/(alert|goal|top|top-day|top-month|last|ticker|ticker-day|ticker-month|leader|music|faceit))?$/.test(p))return page(res,'overlay.html');
    if(p==='/alert'){const k=u.searchParams.get('token')||u.searchParams.get('key')||'',w=u.searchParams.get('w');const t=Object.values(db.streamers).find(x=>x.okey&&x.okey===k);if(!t){res.writeHead(404);return res.end('404')}res.writeHead(302,{'Access-Control-Allow-Origin':'*',Location:'/o/'+t.slug+'/'+t.okey+(/^(goal|top)$/.test(w)?'/'+w:'')});return res.end()}
    if(m=p.match(/^\/w\/([a-f0-9]+)(?:\/(alert|goal|top|top-day|top-month|last|ticker|ticker-day|ticker-month|leader|music|faceit))?$/)){const t=Object.values(db.streamers).find(x=>x.okey===m[1]);if(!t){res.writeHead(404);return res.end('404')}res.writeHead(302,{'Access-Control-Allow-Origin':'*',Location:'/o/'+t.slug+'/'+t.okey+(m[2]?'/'+m[2]:'')});return res.end()}
    if(p==='/api/notify'){if(limited(ip,60,'n'))return send(res,429,{error:'limit'});const r=notify(Object.fromEntries(u.searchParams));return send(res,r[0],r[1])}
    if(m=p.match(/^\/api\/streamer\/([a-z0-9_]+)$/)){const s=db.streamers[m[1]];if(!s||s.banned)return send(res,404,{error:'Не найден'});const w=widget(s);return send(res,200,{name:s.name,kaspi:s.kaspi,goal:w.goal,top:w.top,style:w.style})}
    if(p==='/api/plans'){const P=plans();return send(res,200,{plans:Object.fromEntries(PIDS.map(k=>[k,{name:P[k].name,price:P[k].price,f:P[k].f}])),contact:{tg:pubSet().tg,wa:pubSet().wa}})}
    if(p==='/api/support'){const s=auth(req);if(!s)return send(res,401,{error:'auth'});const ch=db.chats[s.slug]||{msgs:[],ua:0,uu:0};ch.uu=0;save();return send(res,200,{msgs:ch.msgs.slice(-100),pay:pubSet()})}
    if(p.startsWith('/api/admin')){const s=auth(req);if(!isAdmin(s))return send(res,403,{error:'admin'});
      if(p==='/api/admin/chat'){const sl=str(u.searchParams.get('slug'),24),ch=db.chats[sl];if(!ch)return send(res,200,{msgs:[]});ch.ua=0;save();return send(res,200,{msgs:ch.msgs.slice(-200)})}
      if(p==='/api/admin'){const now=Date.now(),mk=mkey(),all=db.donations.filter(d=>d.status==='confirmed'&&!d.rep);
        const sl=Object.values(db.streamers).map(x=>{const mine=all.filter(d=>d.slug===x.slug);return {slug:x.slug,name:x.name,kaspi:x.kaspi,plan:planId(x),until:isAdmin(x)?0:(x.planUntil||0),banned:!!x.banned,donations:mine.length,total:mine.reduce((a,d)=>a+d.amount,0),last:mine.length?mine[mine.length-1].ts:0,used:(x.used&&x.used.m===mk)?x.used.n:0,admin:isAdmin(x)}}).sort((a,b)=>b.last-a.last);
        const appr=db.payments.filter(x=>x.status==='approved'),mstart=new Date(mk+'-01T00:00:00Z').getTime()-5*3600000;
        const chats=Object.keys(db.chats).map(k=>{const c=db.chats[k],l=c.msgs[c.msgs.length-1],x=db.streamers[k];return {slug:k,name:x?x.name:k,plan:x?planId(x):'free',unread:c.ua||0,last:l?l.t:'',ts:l?l.ts:0,from:l?l.f:''}}).sort((a,b)=>(b.unread>0)-(a.unread>0)||b.ts-a.ts);
        return send(res,200,{stats:{streamers:sl.length,paid:sl.filter(x=>x.plan!=='free'&&!x.admin).length,pending:db.payments.filter(x=>x.status==='pending').length,unread:chats.reduce((a,c)=>a+c.unread,0)+db.contacts.filter(c=>!c.done).length,donations:all.length,revenue:appr.reduce((a,x)=>a+x.amount,0),revenueMonth:appr.filter(x=>x.ts>=mstart).reduce((a,x)=>a+x.amount,0)},
          streamers:sl.slice(0,500),payments:db.payments.slice(-100).reverse(),chats,contacts:db.contacts.slice(-100).reverse(),settings:pubSet(),plans:plans(),admins:ADMINS,news:db.news.slice(-30).reverse()})}
      res.writeHead(404);return res.end()}
    if(p==='/api/donations'){const s=auth(req);if(!s)return send(res,401,{error:'auth'});const g=k=>u.searchParams.get(k)||'';
      const pl=planOf(s),from=+g('from')||0,to=+g('to')||Infinity,q=g('q').toLowerCase().trim(),src=g('src');
      let L=db.donations.filter(d=>d.slug===s.slug&&d.status==='confirmed'&&!d.rep);
      if(pl.f.history>0)L=L.slice(-pl.f.history);
      L=L.filter(d=>d.ts>=from&&d.ts<=to&&(!src||(d.src||'site')===src)).map(d=>({...d,orig:d.name,name:(s.nicks&&s.nicks[d.name])||d.name}));
      if(q)L=L.filter(d=>(d.name+' '+d.orig).toLowerCase().includes(q));
      const total=L.reduce((a,d)=>a+d.amount,0),mx=L.reduce((m,d)=>d.amount>(m?m.amount:0)?d:m,null);
      let items=L.slice().reverse();
      if(g('group')==='1'){const m={};items.forEach(d=>{const x=m[d.name]=m[d.name]||{id:d.id,name:d.name,orig:d.orig,amount:0,n:0,ts:d.ts,msg:'',grp:1};x.amount+=d.amount;x.n++;if(d.ts>x.ts)x.ts=d.ts});items=Object.values(m).sort((a,b)=>b.amount-a.amount)}
      return send(res,200,{items:items.slice(0,500),total,count:L.length,max:mx?{name:mx.name,amount:mx.amount}:null,nicks:s.nicks||{},limited:pl.f.history>0})}
    if(p==='/api/faceit'){const s=auth(req);if(!s)return send(res,401,{error:'auth'});if(!s.faceit)return send(res,200,faceitOff());try{return send(res,200,await faceitData(s,u.searchParams.get('f')==='1'))}catch(e){return send(res,200,{on:true,error:e.message,nick:s.faceit.nick})}}
    if(m=p.match(/^\/api\/fw\/([a-z0-9_]+)$/)){const s=db.streamers[m[1]];if(!s||u.searchParams.get('key')!==s.okey)return send(res,403,{error:'key'});const st=sty(cfg(s)),W=o=>send(res,200,Object.assign({style:st},o));if(!planOf(s).f.widgets)return W({on:false,locked:true});if(!s.faceit)return W(faceitOff());try{return W(await faceitData(s))}catch(e){return W({on:true,error:e.message})}}
    if(p==='/api/music'){const s=auth(req);if(!s)return send(res,401,{error:'auth'});const c=cfg(s);return send(res,200,{queue:musicQ(s),on:c.musicOn,min:c.musicMin,ok:!!planOf(s).f.music,played:db.donations.filter(d=>d.slug===s.slug&&d.played&&ytId(d.msg)).slice(-20).reverse().map(d=>({id:d.id,vid:ytId(d.msg),name:(s.nicks&&s.nicks[d.name])||d.name,amount:d.amount}))})}
    if(p==='/api/me'){const s=auth(req);if(!s)return send(res,401,{error:'auth'});if(!s.nkey){s.nkey=rnd(10);save()}return send(res,200,view(s))}
    if(m=p.match(/^\/api\/widget\/([a-z0-9_]+)$/)){const s=db.streamers[m[1]];if(!s||u.searchParams.get('key')!==s.okey)return send(res,403,{error:'key'});return send(res,200,widget(s,{p:u.searchParams.get('p'),n:u.searchParams.get('n')}))}
    if(m=p.match(/^\/api\/stream\/([a-z0-9_]+)$/)){
      const s=db.streamers[m[1]];if(!s||u.searchParams.get('key')!==s.okey)return send(res,403,{error:'key'});
      res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache',Connection:'keep-alive'});res.write(':ok\n\n');
      (clients[s.slug]=clients[s.slug]||new Set()).add(res);
      const k=setInterval(()=>res.write(':p\n\n'),25000);
      req.on('close',()=>{clearInterval(k);clients[s.slug].delete(res)});return}
    res.writeHead(404);return res.end('404')}
  if(req.method!=='POST'){res.writeHead(405);return res.end()}
  const b=await body(req);
  if(p==='/api/notify'){if(limited(ip,60,'n'))return send(res,429,{error:'limit'});const r=notify({key:u.searchParams.get('key'),...b});return send(res,r[0],r[1])}
  if(p==='/api/register'){
    if(limited(ip,5,'reg'))return send(res,429,{error:'Слишком часто'});
    const slug=str(b.slug,24).toLowerCase();
    if(!/^[a-z0-9_]{3,24}$/.test(slug))return send(res,400,{error:'Ник: 3–24 символа, латиница, цифры, _'});
    if(str(b.password,100).length<6)return send(res,400,{error:'Пароль минимум 6 символов'});
    if(db.streamers[slug])return send(res,409,{error:'Ник занят'});
    const salt=rnd(8),s={slug,name:str(b.name,40)||slug,kaspi:str(b.kaspi,60),salt,pw:hash(b.password,salt),token:rnd(16),okey:rnd(8),nkey:rnd(10),auto:false,log:[]};
    const rf=str(b.ref,24).toLowerCase();if(rf&&rf!==slug&&db.streamers[rf])s.ref=rf;
    db.streamers[slug]=s;save();return send(res,200,{token:s.token})}
  if(p==='/api/login'){
    if(limited(ip,10,'login'))return send(res,429,{error:'Слишком часто'});
    const s=db.streamers[str(b.slug,24).toLowerCase()];
    if(!s||hash(str(b.password,100),s.salt)!==s.pw)return send(res,401,{error:'Неверный ник или пароль'});
    return send(res,200,{token:s.token})}
  if(m=p.match(/^\/api\/donate\/([a-z0-9_]+)$/)){
    const s=db.streamers[m[1]];if(!s)return send(res,404,{error:'Не найден'});
    if(limited(ip,5,'don'))return send(res,429,{error:'Слишком часто, подождите минуту'});
    const a=Math.floor(+b.amount);if(!(a>=1&&a<=10000000))return send(res,400,{error:'Неверная сумма'});
    if(isBlocked(b.name,cfg(s)))return send(res,200,{ok:1});
    mk(s.slug,b.name,a,b.msg,'pending','site');return send(res,200,{ok:1})}
  if(p==='/api/mdone'){const t=db.streamers[str(b.slug,24)];if(!t||b.key!==t.okey)return send(res,403,{error:'key'});if(limited(ip,120,'md'))return send(res,429,{error:'limit'});const d=db.donations.find(x=>x.id===b.id&&x.slug===t.slug);if(d){d.played=true;save();push(t.slug,{type:'update'})}return send(res,200,{ok:1})}
  if(p==='/api/contact'){
    if(limited(ip,4,'contact'))return send(res,429,{error:'Слишком часто, подождите минуту'});
    const t=str(b.text,1000);if(t.length<3)return send(res,400,{error:'Напишите сообщение'});
    db.contacts.push({id:rnd(5),name:str(b.name,60),contact:str(b.contact,100),text:t,ts:Date.now(),done:false});if(db.contacts.length>1000)db.contacts.splice(0,100);save();return send(res,200,{ok:1})}
  const s=auth(req);if(!s)return send(res,401,{error:'auth'});
  if(p==='/api/support'){
    if(limited(ip,15,'sup'))return send(res,429,{error:'Слишком часто'});
    const t=str(b.text,1000);if(!t)return send(res,400,{error:'Пустое сообщение'});
    const ch=db.chats[s.slug]=db.chats[s.slug]||{msgs:[],ua:0,uu:0};ch.msgs.push({f:'u',t,ts:Date.now()});ch.ua=(ch.ua||0)+1;if(ch.msgs.length>300)ch.msgs.splice(0,50);save();return send(res,200,{ok:1})}
  if(p==='/api/plan/request'){
    const plan=str(b.plan,10),months=+b.months;if(!['pro','max'].includes(plan)||![1,3,12].includes(months))return send(res,400,{error:'Неверный тариф'});
    if(db.payments.some(x=>x.slug===s.slug&&x.status==='pending'))return send(res,409,{error:'Заявка уже отправлена — дождитесь подтверждения'});
    const disc={1:0,3:.1,12:.2}[months],amount=Math.round(plans()[plan].price*months*(1-disc));
    db.payments.push({id:rnd(5),slug:s.slug,plan,months,amount,status:'pending',ts:Date.now()});if(db.payments.length>2000)db.payments.splice(0,200);save();return send(res,200,{ok:1,amount})}
  if(p.startsWith('/api/admin/')){
    if(!isAdmin(s))return send(res,403,{error:'admin'});
    if(p==='/api/admin/pay'){const x=db.payments.find(y=>y.id===b.id);if(!x||x.status!=='pending')return send(res,404,{error:'Нет такой заявки'});
      if(b.action==='approve'){const t=db.streamers[x.slug];if(!t)return send(res,404,{error:'Нет стримера'});const base=(t.plan===x.plan&&t.planUntil>Date.now())?t.planUntil:Date.now();t.plan=x.plan;t.planUntil=base+x.months*30*86400000;x.status='approved';
        if(t.ref&&!t.refPaid){const r=db.streamers[t.ref];if(r&&!isAdmin(r)){const act=r.plan&&r.planUntil>Date.now(),b2=act?r.planUntil:Date.now();r.plan=act&&r.plan==='max'?'max':'pro';r.planUntil=b2+7*86400000}t.refPaid=true}}else x.status='rejected';
      x.ts2=Date.now();save();return send(res,200,{ok:1})}
    if(p==='/api/admin/grant'){const t=db.streamers[str(b.slug,24)];if(!t)return send(res,404,{error:'Нет стримера'});
      if(b.plan==='free'){t.plan='';t.planUntil=0}else if(['pro','max'].includes(b.plan)){const d=Math.max(1,Math.min(3650,Math.floor(+b.days)||30)),base=(t.plan===b.plan&&t.planUntil>Date.now())?t.planUntil:Date.now();t.plan=b.plan;t.planUntil=base+d*86400000}else return send(res,400,{error:'plan'});
      save();return send(res,200,{ok:1})}
    if(p==='/api/admin/ban'){const t=db.streamers[str(b.slug,24)];if(!t||isAdmin(t))return send(res,404,{error:'Нельзя'});t.banned=!!b.banned;save();push(t.slug,{type:'update'});return send(res,200,{ok:1})}
    if(p==='/api/admin/reply'){const sl=str(b.slug,24),t=str(b.text,1000);if(!t||!db.streamers[sl])return send(res,400,{error:'Пусто'});
      const ch=db.chats[sl]=db.chats[sl]||{msgs:[],ua:0,uu:0};ch.msgs.push({f:'a',t,ts:Date.now()});ch.uu=(ch.uu||0)+1;ch.ua=0;save();return send(res,200,{ok:1})}
    if(p==='/api/admin/contact'){const c=db.contacts.find(y=>y.id===b.id);if(!c)return send(res,404,{error:'Нет'});if(b.action==='delete')db.contacts.splice(db.contacts.indexOf(c),1);else c.done=!!b.done;save();return send(res,200,{ok:1})}
    if(p==='/api/admin/news'){if(b.del){const k=db.news.findIndex(y=>y.id===b.del);if(k>=0)db.news.splice(k,1)}else{const t=str(b.title,80),tx=str(b.text,600);if(!t)return send(res,400,{error:'Нужен заголовок'});db.news.push({id:rnd(4),title:t,text:tx,ts:Date.now()});if(db.news.length>100)db.news.splice(0,20)}save();return send(res,200,{ok:1})}
    if(p==='/api/admin/settings'){db.settings.kaspi=str(b.kaspi,60);db.settings.tg=str(b.tg,80);db.settings.wa=str(b.wa,80);{const u=str(b.sc,300).trim();db.settings.sc=/^https:\/\/(www\.)?icloud\.com\/shortcuts\/[A-Za-z0-9]+/.test(u)?u:''}save();return send(res,200,{ok:1})}
    if(p==='/api/admin/plans'){const inp=b.plans||{};PIDS.forEach(k=>{const c=inp[k];if(!c)return;const o=db.plans[k]=db.plans[k]||{};o.name=str(c.name,20)||DEFPLANS[k].name;if(k!=='free')o.price=Math.max(0,Math.floor(+c.price)||0);
        o.f=o.f||{};FBOOL.forEach(f=>{if(c.f&&f in c.f)o.f[f]=!!c.f[f]});FNUM.forEach(f=>{if(c.f&&f in c.f){const v=Math.floor(+c.f[f]);o.f[f]=Number.isFinite(v)?Math.max(-1,Math.min(1e6,v)):DEFPLANS[k].f[f]}})});
      save();return send(res,200,{ok:1,plans:plans()})}
    res.writeHead(404);return res.end()}
  if(p==='/api/confirm'){
    const d=db.donations.find(x=>x.id===b.id&&x.slug===s.slug);if(!d)return send(res,404,{error:'Нет такого'});
    if(b.action==='reject')d.status='rejected';else{d.status='confirmed';show(s,d,{tts:b.tts})}
    save();return send(res,200,{ok:1})}
  if(p==='/api/nick'){const n=str(b.name,40),k=str(b.nick,40);if(!n)return send(res,400,{error:'Укажите имя'});s.nicks=s.nicks||{};
    if(k)s.nicks[n]=k;else delete s.nicks[n];if(Object.keys(s.nicks).length>200)return send(res,400,{error:'Слишком много'});save();return send(res,200,{ok:1,nicks:s.nicks})}
  if(p==='/api/faceit'){if(!FK)return send(res,400,{error:'Интеграция FACEIT ещё не включена владельцем сайта'});if(!planOf(s).f.widgets)return send(res,403,{error:'Доступно на тарифе Pro'});if(limited(ip,10,'fc'))return send(res,429,{error:'Слишком часто, подождите минуту'});
    const nick=str(b.nick,40);if(!/^[A-Za-z0-9_.\-]{2,40}$/.test(nick))return send(res,400,{error:'Введите ник FACEIT латиницей'});
    let p0;try{p0=await fq('/players?nickname='+encodeURIComponent(nick))}catch(e){return send(res,502,{error:'FACEIT не отвечает, попробуйте позже'})}
    if(!p0||!p0.player_id)return send(res,404,{error:'Игрок с таким ником не найден на FACEIT'});
    const gm=p0.games||{},game=gm.cs2?'cs2':gm.csgo?'csgo':Object.keys(gm)[0];if(!game)return send(res,400,{error:'У игрока нет игр CS на FACEIT'});
    s.faceit={nick:p0.nickname,id:p0.player_id,game,startElo:fnum(gm[game].faceit_elo),since:Date.now()};delete fcache[s.slug];save();return send(res,200,{ok:1})}
  if(p==='/api/faceit/reset'){if(!s.faceit)return send(res,400,{error:'Сначала подключите ник'});try{const p0=await fq('/players/'+encodeURIComponent(s.faceit.id));const g=((p0&&p0.games)||{})[s.faceit.game]||{};s.faceit.startElo=fnum(g.faceit_elo)||s.faceit.startElo}catch(e){}s.faceit.since=Date.now();delete fcache[s.slug];save();return send(res,200,{ok:1})}
  if(p==='/api/faceit/off'){delete s.faceit;delete fcache[s.slug];save();return send(res,200,{ok:1})}
  if(p==='/api/music/done'){const d=db.donations.find(x=>x.id===b.id&&x.slug===s.slug);if(!d)return send(res,404,{error:'Нет такого'});d.played=!b.undo;save();push(s.slug,{type:'update'});return send(res,200,{ok:1})}
  if(p==='/api/manual'){
    const a=Math.floor(+b.amount);if(!(a>=1))return send(res,400,{error:'Неверная сумма'});
    show(s,mk(s.slug,b.name,a,b.msg,'confirmed','manual'),{tts:b.tts});return send(res,200,{ok:1})}
  if(p==='/api/replay'){const d=db.donations.find(x=>x.id===b.id&&x.slug===s.slug);if(!d)return send(res,404,{error:'Нет такого'});show(s,{...d,amount:Math.max(d.amount,cfg(s).min)},{tts:b.tts});return send(res,200,{ok:1})}
  if(p==='/api/delete'){const i=db.donations.findIndex(x=>x.id===b.id&&x.slug===s.slug);if(i<0)return send(res,404,{error:'Нет такого'});db.donations.splice(i,1);save();push(s.slug,{type:'update'});return send(res,200,{ok:1})}
  if(p==='/api/test'){const c=cfg(s);push(s.slug,{type:'alert',id:'t'+Date.now(),name:'Тестовый зритель',amount:1000,msg:'Привет, стример! Это проверка оформления.',dur:c.dur,tts:false,style:sty(c)});return send(res,200,{ok:1})}
  if(p==='/api/settings'){
    if('name' in b)s.name=str(b.name,40)||s.name;if('kaspi' in b)s.kaspi=str(b.kaspi,60);if('auto' in b)s.auto=!!b.auto;
    if(b.cfg){const f=planOf(s).f,old={...DEF,...(s.cfg||{})},n=cleanCfg(b.cfg,s.cfg);
      if(!tickOk(n.tickCover,f))n.tickCover=tickOk(old.tickCover,f)?old.tickCover:'classic';
      if(!coverOk(n.topCover,f))n.topCover=coverOk(old.topCover,f)?old.topCover:'hero';
      if(!themeOk(n.theme,f))n.theme=themeOk(old.theme,f)?old.theme:'classic';
      if(!f.music)['musicOn','musicMin'].forEach(k=>n[k]=old[k]);
      if(!f.sounds&&n.sound!=='none')n.sound='chime';
      if(!f.tts)['tts','ttsVoice','ttsRate','ttsPitch','ttsVol','ttsWho','ttsMax'].forEach(k=>n[k]=old[k]);
      if(!f.goal)['goalOn','goalTitle','goalTarget'].forEach(k=>n[k]=old[k]);
      if(!f.filters)['min','ttsMin','bad','block'].forEach(k=>n[k]=old[k]);
      s.cfg=n}save();push(s.slug,{type:'update'});return send(res,200,{ok:1,cfg:cfg(s)})}
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
