/* Обложки «ТОП 5»: общий рендер для оверлея и панели */
(function(){
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var MRU=['ЯНВАРЯ','ФЕВРАЛЯ','МАРТА','АПРЕЛЯ','МАЯ','ИЮНЯ','ИЮЛЯ','АВГУСТА','СЕНТЯБРЯ','ОКТЯБРЯ','НОЯБРЯ','ДЕКАБРЯ'];
var MRU1=['ЯНВАРЬ','ФЕВРАЛЬ','МАРТ','АПРЕЛЬ','МАЙ','ИЮНЬ','ИЮЛЬ','АВГУСТ','СЕНТЯБРЬ','ОКТЯБРЬ','НОЯБРЬ','ДЕКАБРЬ'];
var MEN=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
var T={ru:{d:'ТОП ДНЯ',a:'ТОП СТРИМА',l:'ЛИДЕР',n:'ещё {n} — до ТОП-5',e:'Пока пусто'},en:{d:'TOP OF THE DAY',a:'TOP OF STREAM',l:'LEADER',n:'{n} more to enter TOP-5',e:'Nothing yet'},kk:{d:'КҮН ТОБЫ',a:'СТРИМ ТОПЫ',l:'КӨШБАСШЫ',n:'ТОП-5 үшін тағы {n}',e:'Әзірге бос'}};
function stars(n,t){var h='';for(var i=1;i<=t;i++)h+=i<=n?'★':'☆';return h}
function money(n,c){return Number(n).toLocaleString('ru-RU')+' '+c}
var LG={list:0,league:1,neonbar:1,pixel:0},POD={podium:1,sakura:1};
function title(per,lang,custom){if(custom)return custom;var L=T[lang]||T.ru,m=new Date(Date.now()+5*3600000).getUTCMonth();
 if(per==='day')return L.d;if(per==='month')return lang==='en'?'TOP '+MEN[m]:lang==='kk'?'АЙ ТОБЫ':'ТОП '+MRU[m];return L.a}
window.TopCover={title:title,render:function(cover,top,need,cur,lang,ttl){
 var L=T[lang]||T.ru;top=top||[];cur=cur||'₸';ttl=ttl||L.a;
 var cls='w tp cv-'+cover;
 if(!top.length)return '<div class="'+cls+'"><div class="tph"><b>'+esc(ttl)+'</b></div><div class="tpf">'+L.e+'</div></div>';
 var max=top[0].total||1,st=function(d){return Math.max(1,Math.min(5,Math.round(d.total/max*5)))};
 var foot=need?'<div class="tpf">'+L.n.replace('{n}',money(need,cur))+'</div>':'';
 var h='<div class="'+cls+'"><div class="tph"><b>'+esc(ttl)+'</b><i>★★★★★</i></div>';
 function row(d,n,s){return '<div class="tpi"><span class="tpb">'+n+'</span><span class="tn2">'+esc(d.name)+'</span><span class="tst">'+stars(s,5)+'</span><b>'+money(d.total,cur)+'</b></div>'}
 if(POD[cover]){var order=[1,0,2];h+='<div class="pod">';
  order.forEach(function(i){var d=top[i];if(!d)return;h+='<div class="pdc q'+(i+1)+'"><div class="pdn">'+esc(d.name)+'</div><div class="pds">'+money(d.total,cur)+'</div><div class="pdb"><span>'+(i+1)+'</span></div></div>'});
  h+='</div>';top.slice(3).forEach(function(d,k){h+=row(d,k+4,st(d))});return h+foot+'</div>'}
 if(cover in LG){top.forEach(function(d,i){h+='<div class="tpi lg"><span class="tpb">'+(i+1)+'</span><div class="lm"><div class="tn2">'+esc(d.name)+'</div>'+(LG[cover]?'<div class="lb"><i style="width:'+Math.max(6,Math.round(d.total/max*100))+'%"></i></div>':'')+'</div><b>'+money(d.total,cur)+'</b></div>'});return h+foot+'</div>'}
 h+='<div class="tpl"><div class="tpr">'+L.l+' <span>'+stars(5,5)+'</span></div><div class="tpn">'+esc(top[0].name)+'</div><div class="tps">'+money(top[0].total,cur)+'</div></div>';
 top.slice(1).forEach(function(d,k){h+=row(d,k+2,st(d))});
 return h+foot+'</div>'}}})();
