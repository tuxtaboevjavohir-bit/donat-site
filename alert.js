/* Обложки «Топ стрима»: общий рендер для оверлея и панели */
(function(){
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var T={ru:{t:'ТОП СТРИМА',l:'ЛИДЕР',n:'ещё {n} — до ТОП-5',e:'Пока пусто'},en:{t:'TOP OF STREAM',l:'LEADER',n:'{n} more to enter TOP-5',e:'Nothing yet'},kk:{t:'СТРИМ ТОПЫ',l:'КӨШБАСШЫ',n:'ТОП-5 үшін тағы {n}',e:'Әзірге бос'}};
function stars(n,t){var h='';for(var i=1;i<=t;i++)h+=i<=n?'★':'☆';return h}
function money(n,c){return Number(n).toLocaleString('ru-RU')+' '+c}
window.TopCover={render:function(cover,top,need,cur,lang){
 var L=T[lang]||T.ru;top=top||[];cur=cur||'₸';
 if(!top.length)return '<div class="w tp cv-'+cover+'"><div class="tph"><b>'+L.t+'</b></div><div class="tpf">'+L.e+'</div></div>';
 var max=top[0].total||1,st=function(d){return Math.max(1,Math.min(5,Math.round(d.total/max*5)))};
 var foot=need?'<div class="tpf">'+L.n.replace('{n}',money(need,cur))+'</div>':'';
 var head='<div class="tph"><b>'+L.t+'</b><i>★★★★★</i></div>',h='<div class="w tp cv-'+cover+'">'+head;
 if(cover==='podium'){
  var order=[1,0,2];h+='<div class="pod">';
  order.forEach(function(i){var d=top[i];if(!d)return;h+='<div class="pdc q'+(i+1)+'"><div class="pdn">'+esc(d.name)+'</div><div class="pds">'+money(d.total,cur)+'</div><div class="pdb"><span>'+(i+1)+'</span></div></div>'});
  h+='</div>';top.slice(3).forEach(function(d,k){h+=row(d,k+4,st(d),cur)});return h+foot+'</div>'}
 if(cover==='league'||cover==='list'){
  top.forEach(function(d,i){h+='<div class="tpi lg"><span class="tpb">'+(i+1)+'</span><div class="lm"><div class="tn2">'+esc(d.name)+'</div>'+(cover==='league'?'<div class="lb"><i style="width:'+Math.max(6,Math.round(d.total/max*100))+'%"></i></div>':'')+'</div><b>'+money(d.total,cur)+'</b></div>'});
  return h+foot+'</div>'}
 h+='<div class="tpl"><div class="tpr">'+L.l+' <span>'+stars(5,5)+'</span></div><div class="tpn">'+esc(top[0].name)+'</div><div class="tps">'+money(top[0].total,cur)+'</div></div>';
 top.slice(1).forEach(function(d,k){h+=row(d,k+2,st(d),cur)});
 return h+foot+'</div>';
 function row(d,n,s,cur){return '<div class="tpi"><span class="tpb">'+n+'</span><span class="tn2">'+esc(d.name)+'</span><span class="tst">'+stars(s,5)+'</span><b>'+money(d.total,cur)+'</b></div>'}
}}})();
