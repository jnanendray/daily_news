(function(){
'use strict';
var ICONS={cyclone:1,chart:1,building:1,mic:1,ballot:1,cricket:1,gavel:1,scales:1,coin:1,phone:1,check:1,alert:1,laptop:1,camera:1,book:1,bin:1,cross:1,doc:1,trees:1,plane:1,bus:1,bolt:1,shield:1,drop:1,heart:1,flag:1};
var DRE=/^\d{4}-\d{2}-\d{2}$/;
var NS='http://www.w3.org/2000/svg';
var $=function(id){return document.getElementById(id)};
var MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
var state={dates:[],latest:null,cur:null,data:null,vy:0,vm:0,mode:'both',cat:'top',sub:''};
var SECS=['in','ka','wd'];
var SECN={in:'India',ka:'Karnataka',wd:'World'};
var CATN={school:'School students',college:'College students',civil:'Civil services',tech:'Technology',gov:'Government schemes',farm:'Farmers',sci:'Science',med:'Medical'};
var GROUPS={students:['school','college','civil'],general:['tech','gov','farm','sci','med']};
var MAIN=[['top','Top','star'],['students','Students','book'],['general','General','people'],['sport','Sports','trophy'],['world','Foreign affairs','globe'],['digest','Summary','list'],['weather','Weather','cloudsun'],['calendar','Calendar','cal']];
var SUBIC={school:'pencil',college:'cap',civil:'building',tech:'laptop',gov:'doc',farm:'trees',sci:'flask',med:'cross'};
var ACTIONS={weather:1,calendar:1};
var CODES={school:1,college:1,civil:1,tech:1,gov:1,farm:1,sci:1,med:1,sport:1,world:1};
var moreMem={};
var mem={};
var EMB=window.__EMBED||null;
var APP=window.NewsApp||null;
var LIVE='https://jnanendray.github.io/daily_news/';
var APK='https://github.com/jnanendray/daily_news/releases/download/apk-latest/DailyNewsBriefing.apk';
var TTL=24*3600*1000;
var HRE=/^(\d{4}-\d{2}-\d{2})(?:\/(in|ka)-([0-9]))?$/;

var LOGK='dnb:log';
function logEvent(kind,msg){
  try{var a=JSON.parse(localStorage.getItem(LOGK)||'[]');a.push({t:new Date().toISOString(),k:kind,m:String(msg==null?'':msg).slice(0,200)});if(a.length>30)a=a.slice(-30);localStorage.setItem(LOGK,JSON.stringify(a))}catch(e){}
}
window.addEventListener('error',function(e){logEvent('js',(e.message||'error')+' @'+String(e.filename||'').split('/').pop()+':'+e.lineno)});
window.addEventListener('unhandledrejection',function(e){logEvent('promise',e.reason&&e.reason.message?e.reason.message:e.reason)});
function pad(n){return n<10?'0'+n:''+n}
function todayStr(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function parse(s){var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2])}
function fmt(s){return parse(s).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
function fmtKn(s){try{return parse(s).toLocaleDateString('kn-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}catch(e){return ''}}
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
function str(v,max){return (typeof v==='string')?v.slice(0,max):''}

/* ---------- data ---------- */
function cleanSrcs(a){
  var o=[];if(!Array.isArray(a))return o;
  a.slice(0,8).forEach(function(s){if(s&&typeof s==='object'&&typeof s.n==='string'&&/^https:\/\//.test(s.u||''))o.push({n:str(s.n,60),u:str(s.u,500)})});
  return o;
}
function cleanKw(a){
  var o=[];if(!Array.isArray(a))return o;
  a.slice(0,3).forEach(function(k){if(k&&typeof k.w==='string'&&typeof k.m==='string'&&k.w&&k.m)o.push({w:str(k.w,60),m:str(k.m,400),kw:str(k.kw,60),km:str(k.km,400)})});
  return o;
}
function cleanCats(a){
  var o=[];if(!Array.isArray(a))return o;
  a.slice(0,4).forEach(function(c){if(typeof c==='string'&&CODES[c]&&o.indexOf(c)<0)o.push(c)});
  return o;
}
function cleanMore(j){
  var o={};if(!j||typeof j!=='object')return o;
  Object.keys(j).slice(0,120).forEach(function(k){
    var e=j[k];if(!/^(in|ka|wd)-\d{1,2}$/.test(k)||!e||typeof e!=='object')return;
    o[k]={d:str(e.d,2500),kd:str(e.kd,3500),ds:cleanSrcs(e.ds)};
  });
  return o;
}
function validate(d,date){
  if(!d||typeof d!=='object')return null;
  var out={date:date,in:[],ka:[],wd:[]};
  SECS.forEach(function(k){
    var a=Array.isArray(d[k])?d[k].slice(0,40):[];
    a.forEach(function(x){
      if(!x||typeof x!=='object')return;
      var ic=ICONS[x.ic]?x.ic:'doc';var tn=/^t[1-5]$/.test(x.tn)?x.tn:'t1';
      out[k].push({h:str(x.h,200),t:str(x.t,1200),kh:str(x.kh,300),k:str(x.k,1800),s:str(x.s,80),w:str(x.w,400),p:x.p===1?1:0,x:x.x===1?1:0,c:cleanCats(x.c),d:str(x.d,2500),kd:str(x.kd,3500),ds:cleanSrcs(x.ds),kw:cleanKw(x.kw),u:/^https:\/\//.test(x.u||'')?str(x.u,500):'',ic:ic,tn:tn});
    });
  });
  return out;
}
function getJSON(url){
  return fetch(url,{cache:'no-cache',credentials:'omit',referrerPolicy:'no-referrer'}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()});
}
function loadIndex(){
  if(EMB)return Promise.resolve(EMB.index);
  return getJSON('data/index.json').then(function(j){try{localStorage.setItem('dnb:index',JSON.stringify(j))}catch(e){}return j})
   .catch(function(){try{var c=localStorage.getItem('dnb:index');if(c)return JSON.parse(c)}catch(e){}throw new Error('offline')});
}
function purge(){
  try{
    var now=Date.now(),rm=[];
    for(var i=0;i<localStorage.length;i++){
      var k=localStorage.key(i);if(!k||k.indexOf('dnb:d:')!==0)continue;
      var v=null;try{v=JSON.parse(localStorage.getItem(k))}catch(e){}
      if(!v||typeof v.u!=='number'||now-v.u>TTL)rm.push(k);
    }
    rm.forEach(function(k){localStorage.removeItem(k)});
  }catch(e){}
}
function loadDay(date){
  if(mem[date])return Promise.resolve(mem[date]);
  if(EMB){var d=validate(EMB.days[date],date);if(d)mem[date]=d;return Promise.resolve(d)}
  var key='dnb:d:'+date,cached=null;
  try{var c=JSON.parse(localStorage.getItem(key)||'null');if(c&&Date.now()-c.u<=TTL)cached=validate(c.d,date)}catch(e){}
  var net=getJSON('data/'+date+'.json').then(function(j){var d=validate(j,date);if(d){mem[date]=d;try{localStorage.setItem(key,JSON.stringify({u:Date.now(),d:d}))}catch(e){}}return d});
  if(cached){mem[date]=cached;try{localStorage.setItem(key,JSON.stringify({u:Date.now(),d:cached}))}catch(e){}net.then(function(d){if(d&&state.cur===date&&JSON.stringify(d)!==JSON.stringify(cached)&&!playing){state.data=d;renderAll()}}).catch(function(){});return Promise.resolve(cached)}
  return net;
}
function prefetch(date){
  var i=state.dates.indexOf(date);
  [i-1,i+1].forEach(function(j){if(j>=0&&j<state.dates.length&&!mem[state.dates[j]])loadDay(state.dates[j]).catch(function(){})});
}

function loadMore(date){
  if(moreMem[date])return Promise.resolve(moreMem[date]);
  if(EMB){var m=cleanMore(EMB.more&&EMB.more[date]);moreMem[date]=m;return Promise.resolve(m)}
  var key='dnb:d:more-'+date,cached=null;
  try{var c=JSON.parse(localStorage.getItem(key)||'null');if(c&&Date.now()-c.u<=TTL)cached=cleanMore(c.d)}catch(e){}
  if(cached){moreMem[date]=cached;return Promise.resolve(cached)}
  return getJSON('data/more/'+date+'.json').then(function(j){
    var m=cleanMore(j);moreMem[date]=m;try{localStorage.setItem(key,JSON.stringify({u:Date.now(),d:m}))}catch(e){}return m;
  },function(err){
    if(String(err&&err.message)==='404'){moreMem[date]={};return moreMem[date]}
    logEvent('more','details for '+date+' failed');throw err;
  });
}

/* ---------- render ---------- */
function iconc(name){
  var s=document.createElementNS(NS,'svg');s.setAttribute('aria-hidden','true');s.setAttribute('class','ci');
  var u=document.createElementNS(NS,'use');u.setAttribute('href','#ic-'+name);s.appendChild(u);return s;
}
function icon(name){
  var s=document.createElementNS(NS,'svg');s.setAttribute('aria-hidden','true');
  var u=document.createElementNS(NS,'use');u.setAttribute('href','#ic-'+name);s.appendChild(u);return s;
}
var SITES={'ndtv':'https://www.ndtv.com','india today':'https://www.indiatoday.in','news18':'https://www.news18.com','abp news':'https://news.abplive.com','zee news':'https://zeenews.india.com','dd news':'https://ddnews.gov.in','the hindu':'https://www.thehindu.com','indian express':'https://indianexpress.com','hindustan times':'https://www.hindustantimes.com','times of india':'https://timesofindia.indiatimes.com','business standard':'https://www.business-standard.com','mint':'https://www.livemint.com','economic times':'https://economictimes.indiatimes.com','india tv news':'https://www.indiatvnews.com','india tv':'https://www.indiatvnews.com','moneycontrol':'https://www.moneycontrol.com','theprint':'https://theprint.in','espn india':'https://www.espn.in','prajavani':'https://www.prajavani.net','vijay karnataka':'https://vijaykarnataka.com','udayavani':'https://www.udayavani.com','kannada prabha':'https://www.kannadaprabha.com','vijayavani':'https://www.vijayavani.net','samyukta karnataka':'https://samyuktakarnataka.com','tv9 kannada':'https://tv9kannada.com','asianet suvarna news':'https://kannada.asianetnews.com','suvarna news':'https://kannada.asianetnews.com','public tv':'https://publictv.in','zee kannada':'https://zeenews.india.com/kannada','deccan herald':'https://www.deccanherald.com','the news minute':'https://www.thenewsminute.com','bangalore mirror':'https://bangaloremirror.indiatimes.com'};
function siteUrl(name){var k=name.toLowerCase().replace(/^the\s+/,'').trim();return SITES[k]||SITES['the '+k]||SITES[name.toLowerCase().trim()]||''}
function sourceLine(it){
  var p=el('p','srcline');p.appendChild(document.createTextNode('Source: '));
  var names=it.s.split(/\s*(?:,|&|\band\b)\s*/).filter(Boolean);
  names.forEach(function(n,i){
    if(i)p.appendChild(document.createTextNode(' · '));
    var u=(i===0&&it.u)?it.u:siteUrl(n);
    if(u){var a=el('a',null,n);a.href=u;a.target='_blank';a.rel='noopener noreferrer';p.appendChild(a)}
    else p.appendChild(document.createTextNode(n));
  });
  return p;
}
function kwPara(text,kws,field){
  var p=el('p',null);var hits=[];
  kws.forEach(function(k,idx){
    var t=k[field];if(!t)return;
    var pos=text.toLowerCase().indexOf(t.toLowerCase());
    if(pos<0)return;
    for(var q=0;q<hits.length;q++){if(pos<hits[q].e&&pos+t.length>hits[q].s)return}
    hits.push({s:pos,e:pos+t.length,idx:idx});
  });
  hits.sort(function(a,b){return a.s-b.s});
  var at=0;
  hits.forEach(function(h){
    if(h.s>at)p.appendChild(document.createTextNode(text.slice(at,h.s)));
    var b=el('button','kwb',text.slice(h.s,h.e));b.type='button';b.dataset.k=h.idx;
    b.setAttribute('aria-label','Meaning of '+text.slice(h.s,h.e));p.appendChild(b);at=h.e;
  });
  if(at<text.length)p.appendChild(document.createTextNode(text.slice(at)));
  return p;
}
function card(sec,it,i){
  var li=el('li','card fade');li.dataset.sec=sec;li.dataset.i=i;li.id='a-'+sec+'-'+i;
  var tile=el('div','tile '+it.tn);tile.appendChild(icon(it.ic));
  var b=el('div','body');
  var en=el('div','en');en.appendChild(el('h3',null,it.h));en.appendChild(kwPara(it.t,it.kw,'w'));
  if(it.w&&it.w.length>14)en.appendChild(el('p','why','Why it matters: '+it.w));
  var kn=el('div','kn');kn.lang='kn';kn.appendChild(el('h4',null,it.kh));kn.appendChild(kwPara(it.k,it.kw,'kw'));
  var row=el('div','row');
  var be=el('button','b-en','Listen');be.type='button';be.dataset.act='en';
  var bk=el('button','b-kn','ಕೇಳಿ');bk.type='button';bk.dataset.act='kn';bk.lang='kn';
  var bs=el('button','b-share','Share');bs.type='button';bs.dataset.act='share';
  var sp=el('span','spk');sp.setAttribute('aria-hidden','true');sp.appendChild(icon('speaker'));
  var eq=el('span','eq');for(var q=0;q<4;q++)eq.appendChild(document.createElement('i'));sp.appendChild(eq);
  row.appendChild(sp);row.appendChild(be);row.appendChild(bk);row.appendChild(bs);
  if(it.u){var a=el('a','src','Original report');a.href=it.u;a.target='_blank';a.rel='noopener noreferrer';row.appendChild(a)}
  if(it.p){li.classList.add('hot');b.appendChild(el('span','badge','Important'))}
  var sum=el('div','sum');sum.appendChild(en);sum.appendChild(kn);
  var tabs=el('div','tabs');tabs.setAttribute('role','tablist');
  var t1=el('button',null,'Summary');t1.type='button';t1.setAttribute('role','tab');t1.setAttribute('aria-selected','true');t1.dataset.tab='sum';
  var t2=el('button',null,'More details');t2.type='button';t2.setAttribute('role','tab');t2.setAttribute('aria-selected','false');t2.dataset.tab='more';
  tabs.appendChild(t1);tabs.appendChild(t2);
  var more=el('div','more');more.setAttribute('role','tabpanel');
  b.appendChild(tabs);b.appendChild(sum);b.appendChild(more);b.appendChild(row);if(it.s)b.appendChild(sourceLine(it));
  li.appendChild(tile);li.appendChild(b);return li;
}
function matches(it,sec){
  var c=state.cat,sub=state.sub;
  if(c==='all')return true;
  if(c==='top')return !it.x;
  if(c==='students'||c==='general'){
    var g=GROUPS[c];
    if(sub)return it.c.indexOf(sub)>=0;
    return it.c.some(function(x){return g.indexOf(x)>=0});
  }
  if(c==='sport')return it.c.indexOf('sport')>=0;
  if(c==='world')return sec==='wd'||it.c.indexOf('world')>=0;
  return true;
}
function fillList(sec){
  var ol=$('list-'+sec),arr=state.data?state.data[sec]:[],n=0;ol.textContent='';
  arr.forEach(function(it,i){if(matches(it,sec)){ol.appendChild(card(sec,it,i));n++}});
  $('sec-'+sec).hidden=!n;
  var cnt=$('cnt-'+sec);if(cnt)cnt.textContent=n+(n===1?' story':' stories');
  return n;
}
function renderAll(){
  var dg=state.cat==='digest';
  $('main').hidden=dg;$('digest').hidden=!dg;
  drawCats();
  if(!state.data){return}
  if(dg){drawDigest();return}
  var total=0;SECS.forEach(function(s){total+=fillList(s)});
  $('catempty').hidden=total>0;
}
function drawCats(){
  var bar=$('cats');bar.textContent='';
  MAIN.forEach(function(m){
    var b=el('button',null);b.type='button';b.dataset.cat=m[0];b.appendChild(iconc(m[2]));b.appendChild(document.createTextNode(m[1]));if(!ACTIONS[m[0]])b.setAttribute('aria-pressed',String(state.cat===m[0]));bar.appendChild(b);
  });
  var sb=$('subcats');sb.textContent='';
  var g=GROUPS[state.cat];sb.hidden=!g;
  if(g){
    var all=el('button',null);all.appendChild(iconc('list'));all.appendChild(document.createTextNode('All'));all.type='button';all.dataset.sub='';all.setAttribute('aria-pressed',String(!state.sub));sb.appendChild(all);
    g.forEach(function(c){var b=el('button',null);b.appendChild(iconc(SUBIC[c]));b.appendChild(document.createTextNode(CATN[c]));b.type='button';b.dataset.sub=c;b.setAttribute('aria-pressed',String(state.sub===c));sb.appendChild(b)});
  }
}
function firstSentence(t){var m=/^.{20,}?[.!?।](\s|$)/.exec(t);return m?m[0].trim():t}
function drawDigest(){
  var root=$('digest-body');root.textContent='';var any=false;
  SECS.forEach(function(sec){
    var arr=state.data[sec];if(!arr.length)return;any=true;
    root.appendChild(el('h3',sec==='ka'?'ka':null,SECN[sec]));
    var ul=el('ul','dg');
    arr.forEach(function(it,i){
      var li=el('li');var bt=el('button',null);bt.type='button';bt.dataset.sec=sec;bt.dataset.i=i;
      var h=state.mode==='kn'&&it.kh?it.kh:it.h,t=state.mode==='kn'&&it.k?firstSentence(it.k):firstSentence(it.t);
      var strong=el('strong',null,h);if(state.mode==='kn'&&it.kh)strong.lang='kn';
      if(it.p){var bd=el('span','badge','Important');bt.appendChild(bd);bt.appendChild(document.createTextNode(' '))}
      bt.appendChild(strong);var sp=el('span',null,t);if(state.mode==='kn'&&it.k)sp.lang='kn';bt.appendChild(sp);
      li.appendChild(bt);ul.appendChild(li);
    });
    root.appendChild(ul);
  });
  if(!any)root.appendChild(el('p','empty','No stories for this day.'));
}
function fillMore(c){
  var it=state.data[c.dataset.sec][+c.dataset.i],more=c.querySelector('.more');
  if(c.dataset.mstate==='done'||c.dataset.mstate==='load')return;
  c.dataset.mstate='load';more.textContent='';
  var sp=el('div','loading');sp.setAttribute('role','status');sp.appendChild(el('span','spinner'));sp.appendChild(el('span',null,'Gathering more details'));
  more.appendChild(sp);
  var key=c.dataset.sec+'-'+c.dataset.i,date=state.cur;
  var inline=it.d||it.kd||it.ds.length;
  (inline?Promise.resolve({}):loadMore(date)).then(function(m){
    if(date!==state.cur||!c.isConnected)return;
    var e=m[key];if(e){it.d=it.d||e.d;it.kd=it.kd||e.kd;if(!it.ds.length)it.ds=e.ds}
    drawMore(c,it,more);c.dataset.mstate='done';
  }).catch(function(){
    if(date!==state.cur||!c.isConnected)return;
    more.textContent='';c.dataset.mstate='';
    more.appendChild(el('p','why','Could not load more details. Check your connection.'));
    var r=el('button','retry','Try again');r.type='button';r.addEventListener('click',function(){fillMore(c)});more.appendChild(r);
  });
}
function drawMore(c,it,more){
  more.textContent='';
  if(it.d||it.kd){
    if(it.d){var me=el('div','en');me.appendChild(el('p',null,it.d));more.appendChild(me)}
    if(it.kd){var mk=el('div','kn');mk.lang='kn';mk.appendChild(el('p',null,it.kd));more.appendChild(mk)}
  }else more.appendChild(el('p','why','No extra reports have been gathered for this story yet. See the source line below for the original outlet.'));
  if(it.ds.length){
    var al=el('p','srcline');al.appendChild(document.createTextNode('Also reported by: '));
    it.ds.forEach(function(s,k){if(k)al.appendChild(document.createTextNode(' · '));var x=el('a',null,s.n);x.href=s.u;x.target='_blank';x.rel='noopener noreferrer';al.appendChild(x)});
    more.appendChild(al);
  }
}
function showSkeleton(){
  SECS.forEach(function(sec){var ol=$('list-'+sec);ol.textContent='';$('sec-'+sec).hidden=sec==='wd';if(sec!=='wd')for(var i=0;i<3;i++)ol.appendChild(el('li','skeleton'))});
  $('catempty').hidden=true;$('main').hidden=false;$('digest').hidden=true;
}
function showEmpty(date){
  SECS.forEach(function(sec){$('list-'+sec).textContent='';$('sec-'+sec).hidden=sec!=='in'});
  var ol=$('list-in'),li=el('li','empty');
  li.appendChild(el('p',null,'No briefing was created for '+fmt(date)+'.'));
  var near=nearest(date);
  if(near){var b=el('button','chip','Go to '+fmt(near));b.type='button';b.addEventListener('click',function(){go(near)});li.appendChild(b)}
  ol.appendChild(li);
}
function nearest(date){
  if(!state.dates.length)return null;
  var t=parse(date).getTime(),best=null,bd=1e18;
  state.dates.forEach(function(d){var x=Math.abs(parse(d).getTime()-t);if(x<bd){bd=x;best=d}});
  return best;
}
function paint(){
  var d=state.cur;
  $('dateline').textContent=fmt(d);
  $('dateline-kn').textContent=fmtKn(d);
  $('datelabel').textContent=parse(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
  var i=state.dates.indexOf(d);
  $('prev').disabled=!(i>=0&&i<state.dates.length-1)&&!(i<0&&state.dates.length);
  $('next').disabled=!(i>0);
  document.title='Daily News Briefing, '+d;
}

/* ---------- navigation ---------- */
var token=0;
function go(date,noHash,focus){
  if(!DRE.test(date))return;
  stopSpeech();
  var my=++token;
  state.cur=date;state.vy=parse(date).getFullYear();state.vm=parse(date).getMonth();
  paint();showSkeleton();closeCal();
  if(!noHash){try{history.replaceState(null,'','#'+date)}catch(e){location.hash=date}}
  state.focus=focus||null;
  if(state.dates.indexOf(date)<0){showEmpty(date);return}
  loadDay(date).then(function(d){
    if(my!==token)return;
    if(!d){showEmpty(date);return}
    state.data=d;renderAll();prefetch(date);focusCard();
  }).catch(function(){
    if(my!==token)return;
    SECS.forEach(function(sec){$('list-'+sec).textContent=''});
    logEvent('load','day '+date+' failed');
    var li=el('li','empty','Could not load this day. Check your connection and try again.');$('list-in').appendChild(li);
  });
}
function focusCard(){
  if(!state.focus)return;var c=$('a-'+state.focus);
  if(!c&&state.data){state.cat='all';state.sub='';renderAll();c=$('a-'+state.focus)}
  state.focus=null;
  if(c){c.classList.add('target');try{c.scrollIntoView({block:'center'})}catch(e){}setTimeout(function(){c.classList.remove('target')},3500)}
}
function toast(msg){var t=$('toast');t.textContent=msg;t.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(function(){t.hidden=true},2600)}
function shareText(title,url){
  var txt=title?title+'\n'+url:url;
  if(APP&&APP.share){try{APP.share(txt);return}catch(e){}}
  if(navigator.share){navigator.share({title:title||'Daily News Briefing',text:title||'',url:url}).catch(function(){});return}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(function(){toast('Link copied')},function(){toast(url)});return}
  toast(url);
}
function parseHash(){var m=HRE.exec(location.hash.slice(1));return m?{d:m[1],f:m[2]?m[2]+'-'+m[3]:null}:null}
function step(n){
  var i=state.dates.indexOf(state.cur);
  if(i<0){return}
  var j=i-n; /* dates sorted newest first; n=-1 is previous day (older) */
  if(j>=0&&j<state.dates.length)go(state.dates[j]);
}

/* ---------- calendar ---------- */
function openCal(){ $('cal').hidden=false;$('datebtn').setAttribute('aria-expanded','true');drawCal() }
function closeCal(){ $('cal').hidden=true;$('datebtn').setAttribute('aria-expanded','false') }
function drawCal(){
  var y=state.vy,m=state.vm,g=$('cal-grid');g.textContent='';
  $('cal-title').textContent=MON[m]+' '+y;
  var first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate(),t=todayStr();
  for(var i=0;i<first;i++)g.appendChild(el('span'));
  for(var d=1;d<=days;d++){
    var ds=y+'-'+pad(m+1)+'-'+pad(d),b=el('button',null,String(d));b.type='button';b.dataset.d=ds;
    if(state.dates.indexOf(ds)>=0)b.className='has';else b.setAttribute('aria-disabled','true');
    if(ds===state.cur)b.classList.add('sel');
    if(ds===t)b.classList.add('today');
    b.setAttribute('aria-label',fmt(ds)+(b.classList.contains('has')?', briefing available':', no briefing'));
    g.appendChild(b);
  }
}

/* ---------- speech ---------- */
var voices=[],queue=[],playing=false,cancelled=false;
function loadVoices(){voices=(window.speechSynthesis&&speechSynthesis.getVoices())||[]}
function pick(lang){
  var pre=lang==='kn'?['kn-IN','kn']:['en-IN','en-GB','en-US','en'];
  var best=null,bs=-1;
  voices.forEach(function(v){
    var l=(v.lang||'').replace('_','-'),s=-1;
    for(var i=0;i<pre.length;i++){if(l.toLowerCase()===pre[i].toLowerCase()||l.toLowerCase().indexOf(pre[i].toLowerCase()+'-')===0){s=10-i;break}}
    if(s<0)return;
    var n=(v.name||'').toLowerCase();
    if(/neural|natural|online|google|premium|enhanced/.test(n))s+=5;
    if(!v.localService)s+=1;
    if(s>bs){bs=s;best=v}
  });
  return best;
}
function chunks(text){
  var parts=text.replace(/\s+/g,' ').match(/[^.!?।]+[.!?।]*/g)||[text],out=[],cur='';
  parts.forEach(function(p){if((cur+p).length>180&&cur){out.push(cur.trim());cur=p}else cur+=p});
  if(cur.trim())out.push(cur.trim());return out;
}
function note(msg,steps,install,google){
  var n=$('voicenote');n.textContent='';
  if(!msg){n.hidden=true;return}
  n.appendChild(el('p',null,msg));
  if(steps&&steps.length){var ol=document.createElement('ol');steps.forEach(function(t){ol.appendChild(el('li',null,t))});n.appendChild(ol)}
  if(install&&APP&&APP.installVoices){var b=el('button',null,'Install voice');b.type='button';b.addEventListener('click',function(){APP.installVoices()});n.appendChild(b)}
  if(google&&APP&&APP.installGoogle){var g=el('button',null,'Get Google voice');g.type='button';g.addEventListener('click',function(){APP.installGoogle()});n.appendChild(g)}
  n.hidden=false;
}
function knHelp(){
  if(APP)note('Kannada voice is not installed on this phone.',['Tap Install voice below.','Choose Kannada (India) and tap the download button.','Come back to this app. This message goes away when the voice is ready.'],true);
  else note('No Kannada voice was found on this device.',['Open your device Settings and search for "Text-to-speech".','Choose Google as the engine and add the Kannada (India) voice.','Reload this page. The Kannada text is still shown meanwhile.']);
}
var pend={},uid=0;
window.__tts=function(ev,id){var f=pend[id];delete pend[id];if(f)f(ev)};
function speakChunk(text,lang,rate,voice,done){
  if(APP&&APP.speak){var id='u'+(++uid);pend[id]=done;APP.speak(text,lang,rate,id);return}
  var u=new SpeechSynthesisUtterance(text);
  if(voice){u.voice=voice;u.lang=voice.lang}else u.lang=lang==='kn'?'kn-IN':'en-IN';
  u.rate=rate;u.pitch=1;u.onend=function(){done('done')};u.onerror=function(){done('error')};
  speechSynthesis.speak(u);
}
function stopSpeech(){
  cancelled=true;queue=[];playing=false;
  try{if(APP&&APP.stop)APP.stop();pend={};if(window.speechSynthesis)speechSynthesis.cancel()}catch(e){}
  var p=document.querySelector('.card.playing');if(p)p.classList.remove('playing');
  $('speaking').hidden=true;
}
function runQueue(){
  if(!queue.length){playing=false;var p=document.querySelector('.card.playing');if(p)p.classList.remove('playing');$('speaking').hidden=true;return}
  var job=queue.shift();
  var p0=document.querySelector('.card.playing');if(p0)p0.classList.remove('playing');
  $('speaking').hidden=false;$('speaking-t').textContent=job.lang==='kn'?'ಓದುತ್ತಿದೆ':'Speaking';
  if(job.node){job.node.classList.add('playing');try{job.node.scrollIntoView({block:'center',behavior:'smooth'})}catch(e){}}
  var v=APP?null:pick(job.lang);
  if(!APP&&job.lang==='kn'&&!v){knHelp();runQueue();return}
  if(v)note('');
  var parts=chunks(job.text);
  (function next(){
    if(cancelled)return;
    if(!parts.length){runQueue();return}
    speakChunk(parts.shift(),job.lang,parseFloat($('rate').value)||0.92,v,function(ev){
      if(cancelled)return;
      if(ev==='error')logEvent('tts','speech error '+job.lang);
      if(ev==='novoice'){logEvent('voice','no '+job.lang+' voice');if(job.lang==='kn')knHelp();else note('No English voice was found.',['Open Settings, search for Text-to-speech, and choose an English voice.']);runQueue();return}
      next();
    });
  })();
}
function start(jobs){
  if(!APP&&!window.speechSynthesis){note('This browser cannot speak. Try Chrome or the Android app.');return}
  stopSpeech();cancelled=false;queue=jobs;playing=true;
  setTimeout(runQueue,120);
}
function jobsFor(item,node,wantEn,wantKn){
  var j=[];
  var more=node&&node.dataset&&node.dataset.tab==='more'&&(item.d||item.kd);
  if(wantEn)j.push({lang:'en',text:more?(item.d||item.t):item.h+'. '+item.t,node:node});
  if(wantKn&&(item.kh||item.k))j.push({lang:'kn',text:more?(item.kd||item.k):item.kh+'. '+item.k,node:node});
  return j;
}

/* ---------- events ---------- */
function setMode(m){
  state.mode=m;document.body.dataset.mode=m;
  [['l-en','en'],['l-kn','kn'],['l-both','both']].forEach(function(p){$(p[0]).setAttribute('aria-pressed',String(p[1]===m))});
  try{localStorage.setItem('dnb:mode',m)}catch(e){}
  if(state.data&&state.cat==='digest')drawDigest();
}
var lastFocus=null;
function openSheet(build){
  var body=$('sheet-body');body.textContent='';build(body);
  lastFocus=document.activeElement;$('sheet').hidden=false;
  var card=document.querySelector('.sheet-card');if(card)card.scrollTop=0;
  setTimeout(function(){try{$('sheet-x').focus()}catch(e){}},30);
}
function closeSheet(){$('sheet').hidden=true;try{if(lastFocus)lastFocus.focus()}catch(e){}}
function openOuter(url){
  if(!/^https:\/\//.test(url))return;
  if(APP&&APP.openExternal){APP.openExternal(url);return}
  window.open(url,'_blank','noopener,noreferrer');
}
function relatedStories(term,skipKey){
  var dates=state.dates.slice(0,6),t=term.toLowerCase(),out=[];
  return Promise.all(dates.map(function(d){return loadDay(d).catch(function(){return null})})).then(function(days){
    days.forEach(function(day,di){
      if(!day)return;
      ['in','ka'].forEach(function(sec){day[sec].forEach(function(s,i){
        var key=dates[di]+'/'+sec+'-'+i;
        if(key===skipKey)return;
        if((s.h+' '+s.t).toLowerCase().indexOf(t)>=0)out.push({d:dates[di],sec:sec,i:i,h:s.h});
      })});
    });
    return out.slice(0,4);
  });
}
function openKeyword(card,idx){
  var it=state.data[card.dataset.sec][+card.dataset.i],k=it.kw[idx];if(!k)return;
  var skip=state.cur+'/'+card.dataset.sec+'-'+card.dataset.i;
  openSheet(function(b){
    var h=el('h3',null,k.w);h.id='sheet-title';b.appendChild(h);
    b.appendChild(el('p',null,k.m));
    if(k.km){var kp=el('p','kn',k.km);kp.lang='kn';b.appendChild(kp)}
    b.appendChild(el('h4',null,'Related recent news'));
    var ul=el('ul');ul.id='kw-rel';ul.appendChild(el('li',null,'Looking through saved briefings...'));b.appendChild(ul);
    var acts=el('div','acts');
    var deep=el('button','primary','Deep search in browser');deep.type='button';
    deep.addEventListener('click',function(){openOuter('https://www.google.com/search?q='+encodeURIComponent(k.w+' news India'))});
    var cl=el('button',null,'Close');cl.type='button';cl.addEventListener('click',closeSheet);
    acts.appendChild(deep);acts.appendChild(cl);b.appendChild(acts);
    relatedStories(k.w,skip).then(function(list){
      var u=$('kw-rel');if(!u)return;u.textContent='';
      if(!list.length){u.appendChild(el('li',null,'No other saved story mentions this yet. Use Deep search for more.'));return}
      list.forEach(function(r){
        var li=el('li');var bt=el('button',null,r.h);bt.type='button';
        var sm=el('small',null,fmt(r.d));bt.appendChild(sm);
        bt.addEventListener('click',function(){closeSheet();go(r.d,false,r.sec+'-'+r.i)});
        li.appendChild(bt);u.appendChild(li);
      });
    });
  });
}
function diagText(extra){
  var lines=['App: '+(APP&&APP.appVersion?('Android app '+APP.appVersion()):'web page'),'Device: '+(APP&&APP.deviceInfo?APP.deviceInfo():(navigator.userAgent||'').slice(0,110)),'Day: '+(state.cur||'-')+', mode: '+state.mode];
  try{var lg=JSON.parse(localStorage.getItem(LOGK)||'[]').slice(-12);if(lg.length){lines.push('Recent log:');lg.forEach(function(e){lines.push(e.t.slice(5,19)+' '+e.k+' '+e.m)})}}catch(e){}
  if(extra)lines.push('Last crash: '+extra);
  return lines.join('\n');
}
function openReport(crash){
  openSheet(function(b){
    var h=el('h3',null,crash?'The app closed unexpectedly':'Report a problem or request');h.id='sheet-title';b.appendChild(h);
    b.appendChild(el('p',null,crash?'Sorry about that. You can send a report so it can be fixed. Nothing is sent unless you choose.':'Tell us what went wrong, or what you would like the app to do. Nothing is sent unless you choose below.'));
    var ta=document.createElement('textarea');ta.maxLength=600;ta.setAttribute('aria-label','What happened or what do you need');ta.placeholder='What happened, or what would you like?';b.appendChild(ta);
    var lb=el('label');var cb=document.createElement('input');cb.type='checkbox';cb.checked=true;lb.appendChild(cb);lb.appendChild(document.createTextNode(' Include the technical log (no personal details)'));b.appendChild(lb);
    var pre=el('pre',null,diagText(crash||''));b.appendChild(pre);
    cb.addEventListener('change',function(){pre.hidden=!cb.checked});
    function body(){return (ta.value.trim()||'(no message)')+(cb.checked?'\n\n'+diagText(crash||''):'')}
    var acts=el('div','acts');
    var sh=el('button','primary','Share report');sh.type='button';sh.addEventListener('click',function(){shareText('Daily News Briefing report',body().slice(0,1500))});
    var gh=el('button',null,'Open on GitHub');gh.type='button';gh.addEventListener('click',function(){
      var u='https://github.com/jnanendray/daily_news/issues/new?title='+encodeURIComponent((crash?'Crash report':'Feedback')+' - Daily News Briefing')+'&body='+encodeURIComponent(body().slice(0,1500));
      if(APP){location.href=u}else window.open(u,'_blank','noopener,noreferrer');
    });
    var cl=el('button',null,'Close');cl.type='button';cl.addEventListener('click',closeSheet);
    acts.appendChild(sh);acts.appendChild(gh);acts.appendChild(cl);b.appendChild(acts);
  });
}
function watchUpdate(n){
  if(!(APP&&APP.updateStatus))return;
  var st=String(APP.updateStatus()).split('|');
  if(st[0]==='checking'||st[0]==='idle'){if(n<20)setTimeout(function(){watchUpdate(n+1)},1000);return}
  if(st[0]==='uptodate')toast('App is up to date');
  else if(st[0]==='failed'){logEvent('update','check failed');toast('Could not check for updates. Check your connection.')}
}
function updateRow(parent){
  var row=el('div','set-row');var msg=el('span',null,'');var b=el('button',null,'Check for updates');b.type='button';
  function show(){
    var st=String(APP.updateStatus()).split('|'),t=+st[2]?new Date(+st[2]).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}):'';
    msg.textContent=st[0]==='checking'?'Checking...':st[0]==='uptodate'?'Up to date ('+APP.appVersion()+'), checked '+t:st[0]==='available'?'A newer version is available'+(st[1]?' ('+st[1]+')':''):st[0]==='failed'?'Could not check. Check your connection.':'Not checked yet';
  }
  b.addEventListener('click',function(){APP.checkUpdate();msg.textContent='Checking...';var n=0;(function poll(){n++;var s=String(APP.updateStatus()).split('|')[0];if(s==='checking'&&n<25){setTimeout(poll,800);return}show()})()});
  show();row.appendChild(msg);row.appendChild(b);parent.appendChild(row);
}
function checkCrash(){
  try{var c=APP&&APP.lastCrash&&APP.lastCrash();if(c){APP.clearCrash&&APP.clearCrash();logEvent('crash',c.slice(0,160));openReport(c.slice(0,300))}}catch(e){}
}
function checkVoices(n){
  if(!APP||!APP.voiceStatus)return;
  var st=APP.voiceStatus('kn');
  if((st==='wait'||(APP.engine&&APP.engine()==='wait'))&&n<8){setTimeout(function(){checkVoices(n+1)},500);return}
  if(APP.engine&&APP.engine()==='other'){note('The clearest voice comes from Google Speech Services, which is not installed. The phone\'s default voice is used for now.',['Tap Get Google voice below.','Tap Install in the Play Store and wait for it to finish.','Come back to this app. Any Kannada voice step will show here.'],false,true);return}
  if(st==='missing'){knHelp();return}
  note('');
}
var remRef=null;
function remindControls(parent){
  var cur=String(APP.getReminder()).split('|');
  var wrap=el('div','set-row');
  var lb=el('label',null);var on=document.createElement('input');on.type='checkbox';on.checked=cur[0]==='1';lb.appendChild(on);lb.appendChild(document.createTextNode(' Daily reminder'));
  var tm=document.createElement('input');tm.type='time';tm.setAttribute('aria-label','Reminder time');tm.value=pad(+cur[1]||7)+':'+pad(+cur[2]||0);
  wrap.appendChild(lb);wrap.appendChild(tm);parent.appendChild(wrap);
  remRef=on;
  function save(){
    var t=(tm.value||'07:00').split(':');
    APP.setReminder(on.checked,+t[0],+t[1]);
    if(on.checked&&!(APP.notifAllowed&&!APP.notifAllowed()))toast('Reminder set for '+tm.value+' every day');
    else if(!on.checked)toast('Reminder off');
  }
  on.addEventListener('change',save);tm.addEventListener('change',save);
}
window.__remind=function(ev){
  if(ev==='denied'){if(remRef)remRef.checked=false;toast('Notifications are blocked. Turn them on in Android Settings, Apps, Daily News Briefing, Notifications.')}
  else if(ev==='ok')toast('Reminder is on');
};

/* ---------- look and feel ---------- */
var THEMES=[['auto','Auto (system)'],['light','Light'],['dark','Dark'],['sepia','Eye comfort']];
function lsGet(k,d){try{var v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}}
function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function applyTheme(t){
  var r=document.documentElement;
  if(t==='light'||t==='dark'||t==='sepia')r.setAttribute('data-theme',t);else{r.removeAttribute('data-theme');t='auto'}
  lsSet('dnb:theme2',t);
  var m=document.querySelector('meta[name=theme-color]');if(m)m.setAttribute('content',t==='sepia'?'#F3EAD3':'#0C2142');
}
var FS=[0.85,0.92,1,1.1,1.2,1.35,1.5,1.7];
function applyFs(i){
  i=Math.max(0,Math.min(FS.length-1,i));state.fs=i;
  document.documentElement.style.setProperty('--fs',String(FS[i]));lsSet('dnb:fs',String(i));
}
function openSettings(){
  openSheet(function(b){
    var h=el('h3',null,'Settings');h.id='sheet-title';b.appendChild(h);
    b.appendChild(el('h4',null,'Text size'));
    var r=el('div','set-row');
    var mn=el('button',null,'A−');mn.type='button';mn.setAttribute('aria-label','Smaller text');
    var pc=el('strong',null,Math.round(FS[state.fs]*100)+'%');
    var mx=el('button',null,'A+');mx.type='button';mx.setAttribute('aria-label','Larger text');
    var rs=el('button',null,'Reset');rs.type='button';
    function upd(){pc.textContent=Math.round(FS[state.fs]*100)+'%'}
    mn.addEventListener('click',function(){applyFs(state.fs-1);upd()});mx.addEventListener('click',function(){applyFs(state.fs+1);upd()});rs.addEventListener('click',function(){applyFs(2);upd()});
    r.appendChild(mn);r.appendChild(pc);r.appendChild(mx);r.appendChild(rs);b.appendChild(r);
    b.appendChild(el('p','why','You can also pinch the screen to zoom in and out.'));
    b.appendChild(el('h4',null,'Colours and theme'));
    var tr=el('div','set-row wrapr');var cur=lsGet('dnb:theme2','sepia');
    THEMES.forEach(function(t){
      var x=el('button',null,t[1]);x.type='button';x.setAttribute('aria-pressed',String(cur===t[0]));
      x.addEventListener('click',function(){applyTheme(t[0]);tr.querySelectorAll('button').forEach(function(y){y.setAttribute('aria-pressed','false')});x.setAttribute('aria-pressed','true')});
      tr.appendChild(x);
    });
    b.appendChild(tr);
    b.appendChild(el('p','why','Auto uses your phone’s own text and background colours. Eye comfort is a warm, low-glare theme for night reading.'));
    if(APP&&APP.getReminder&&APP.setReminder){b.appendChild(el('h4',null,'Reminder'));remindControls(b)}
    if(APP&&APP.updateStatus){b.appendChild(el('h4',null,'App updates'));updateRow(b)}
    b.appendChild(el('h4',null,'More'));
    var acts=el('div','acts');
    if(!APP){var ga=el('a','btn','Get Android app');ga.href=APK;ga.rel='noopener noreferrer';acts.appendChild(ga)}
    var rp=el('button',null,'Report a problem');rp.type='button';rp.addEventListener('click',function(){closeSheet();openReport('')});
    var cl=el('button','primary','Done');cl.type='button';cl.addEventListener('click',closeSheet);
    acts.appendChild(rp);acts.appendChild(cl);b.appendChild(acts);
  });
}

/* ---------- weather (one pop-up window; location asked once) ---------- */
var LOCK='dnb:loc',WXK='dnb:d:wx';
var WMO=function(c){
  if(c===0)return['Clear sky','sun'];if(c===1)return['Mainly clear','sun'];if(c===2)return['Partly cloudy','cloudsun'];if(c===3)return['Overcast','cloud'];
  if(c===45||c===48)return['Fog','fog'];if(c>=51&&c<=57)return['Drizzle','rain'];if(c>=61&&c<=67)return['Rain','rain'];if(c>=71&&c<=77)return['Snow','cloud'];
  if(c>=80&&c<=82)return['Rain showers','rain'];if(c===85||c===86)return['Snow showers','cloud'];if(c>=95)return['Thunderstorm','storm'];return['Cloudy','cloud'];
};
var COMP=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
function isNum(v){return typeof v==='number'&&isFinite(v)}
function getLoc(){try{var o=JSON.parse(localStorage.getItem(LOCK)||'null');if(o&&isNum(o.la)&&isNum(o.lo)&&Math.abs(o.la)<=90&&Math.abs(o.lo)<=180)return o}catch(e){}return null}
function saveLoc(la,lo,name){lsSet(LOCK,JSON.stringify({la:Math.round(la*100)/100,lo:Math.round(lo*100)/100,n:str(name||'',60)}))}
function hour12(iso){var h=+iso.slice(11,13);return (h%12||12)+(h<12?' AM':' PM')}
function wxParse(j){
  if(!j||typeof j!=='object'||!j.current||!j.hourly||!j.daily)return null;
  var c=j.current,h=j.hourly,d=j.daily;
  if(!isNum(c.temperature_2m)||!Array.isArray(h.time)||!Array.isArray(d.time))return null;
  var idx=h.time.indexOf(String(c.time||'').slice(0,13)+':00');if(idx<0)idx=0;
  function at(a,i){return Array.isArray(a)&&isNum(a[i])?a[i]:null}
  var hours=[];for(var i=idx;i<Math.min(h.time.length,idx+48);i++)hours.push({t:String(h.time[i]),tp:at(h.temperature_2m,i),p:at(h.precipitation_probability,i),c:at(h.weather_code,i)});
  var days=[];for(var k=0;k<Math.min(d.time.length,5);k++)days.push({d:String(d.time[k]),lo:at(d.temperature_2m_min,k),hi:at(d.temperature_2m_max,k),p:at(d.precipitation_probability_max,k),c:at(d.weather_code,k),mm:at(d.precipitation_sum,k)});
  return {t:c.temperature_2m,fl:isNum(c.apparent_temperature)?c.apparent_temperature:null,rh:isNum(c.relative_humidity_2m)?c.relative_humidity_2m:null,ws:isNum(c.wind_speed_10m)?c.wind_speed_10m:null,wd:isNum(c.wind_direction_10m)?c.wind_direction_10m:null,mm:isNum(c.precipitation)?c.precipitation:null,cl:isNum(c.cloud_cover)?c.cloud_cover:null,code:isNum(c.weather_code)?c.weather_code:null,hours:hours,days:days,p:hours.length?hours[0].p:null};
}
function fetchJSON(url,ms){
  var ac=window.AbortController?new AbortController():null,tm=ac?setTimeout(function(){ac.abort()},ms||12000):null;
  return fetch(url,{credentials:'omit',referrerPolicy:'no-referrer',signal:ac?ac.signal:undefined}).then(function(r){if(tm)clearTimeout(tm);if(!r.ok)throw new Error(r.status);return r.json()});
}
function loadWeather(loc,force){
  try{var c=JSON.parse(localStorage.getItem(WXK)||'null');if(!force&&c&&Date.now()-c.u<15*60000&&c.la===loc.la&&c.lo===loc.lo){var p=wxParse(c.raw);if(p)return Promise.resolve(p)}}catch(e){}
  var url='https://api.open-meteo.com/v1/forecast?latitude='+loc.la.toFixed(2)+'&longitude='+loc.lo.toFixed(2)+'&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum&timezone=auto&forecast_days=5&wind_speed_unit=kmh';
  return fetchJSON(url).then(function(j){var p=wxParse(j);if(!p)throw new Error('shape');try{localStorage.setItem(WXK,JSON.stringify({u:Date.now(),la:loc.la,lo:loc.lo,raw:j}))}catch(e){}return p});
}
function askLocation(done){
  var fin=false;function once(st,la,lo){if(fin)return;fin=true;window.__loc=null;done(st,la,lo)}
  if(APP&&APP.requestLocation){window.__loc=function(st,la,lo){once(st,+la,+lo)};try{APP.requestLocation()}catch(e){once('fail',0,0)};return}
  if(!navigator.geolocation){once('fail',0,0);return}
  navigator.geolocation.getCurrentPosition(function(p){once('ok',p.coords.latitude,p.coords.longitude)},function(e){once(e&&e.code===1?'denied':'fail',0,0)},{enableHighAccuracy:false,timeout:15000,maximumAge:3600000});
}
function wxStat(label,val,extra){var d=el('div');d.appendChild(el('small',null,label));var s=el('strong',null,val);if(extra)s.appendChild(extra);d.appendChild(s);return d}
function renderWeather(b,loc,w){
  b.textContent='';
  var h=el('h3',null,'Weather');h.id='sheet-title';b.appendChild(h);
  var pl=el('p','why',loc.n?loc.n:'Your area ('+loc.la.toFixed(2)+', '+loc.lo.toFixed(2)+')');pl.insertBefore(iconc('pin'),pl.firstChild);b.appendChild(pl);
  var cd=WMO(w.code),now=el('div','wx-now');
  var sv=document.createElementNS(NS,'svg');sv.setAttribute('aria-hidden','true');var u=document.createElementNS(NS,'use');u.setAttribute('href','#ic-'+cd[1]);sv.appendChild(u);now.appendChild(sv);
  var tx=el('div');var tp=el('div','wx-temp',Math.round(w.t)+'');tp.appendChild(el('small','','°C'));tx.appendChild(tp);tx.appendChild(el('div','wx-cond',cd[0]+(w.cl!=null?', cloud cover '+Math.round(w.cl)+'%':'')));now.appendChild(tx);b.appendChild(now);
  var g=el('div','wx-grid');
  if(w.fl!=null)g.appendChild(wxStat('Feels like',Math.round(w.fl)+'°C'));
  if(w.rh!=null)g.appendChild(wxStat('Humidity',Math.round(w.rh)+'%'));
  if(w.ws!=null){var ar=null;if(w.wd!=null){ar=document.createElementNS(NS,'svg');ar.setAttribute('class','dir');ar.setAttribute('aria-hidden','true');ar.style.transform='rotate('+Math.round(w.wd+180)+'deg)';var au=document.createElementNS(NS,'use');au.setAttribute('href','#ic-arrow');ar.appendChild(au)}
    g.appendChild(wxStat('Wind',Math.round(w.ws)+' km/h '+(w.wd!=null?COMP[Math.round(w.wd/22.5)%16]:''),ar))}
  if(w.p!=null)g.appendChild(wxStat('Rain chance (now)',Math.round(w.p)+'%'));
  if(w.mm!=null)g.appendChild(wxStat('Rainfall now',w.mm.toFixed(1)+' mm'));
  if(w.days[0]&&w.days[0].mm!=null)g.appendChild(wxStat('Rain today',w.days[0].mm.toFixed(1)+' mm'));
  b.appendChild(g);
  var nx=null;for(var i=0;i<w.hours.length;i++){if(w.hours[i].p!=null&&w.hours[i].p>=50){nx=w.hours[i];break}}
  var out='No significant rain is expected in the next 48 hours.';
  if(nx){var dd=parse(nx.t.slice(0,10));out='Rain is likely around '+hour12(nx.t)+' on '+dd.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})+' ('+Math.round(nx.p)+'% chance).'}
  b.appendChild(el('div','wx-out',out));
  b.appendChild(el('h4',null,'Next 12 hours'));
  var hr=el('div','wx-hours');
  w.hours.slice(0,12).forEach(function(x){var d=el('div');d.appendChild(el('span',null,hour12(x.t)));var s=document.createElementNS(NS,'svg');s.setAttribute('aria-hidden','true');var uu=document.createElementNS(NS,'use');uu.setAttribute('href','#ic-'+WMO(x.c)[1]);s.appendChild(uu);d.appendChild(s);d.appendChild(el('b',null,x.tp!=null?Math.round(x.tp)+'°':'-'));d.appendChild(el('span',null,x.p!=null?Math.round(x.p)+'% rain':''));hr.appendChild(d)});
  b.appendChild(hr);
  b.appendChild(el('h4',null,'Next days'));
  var ul=el('ul','wx-days');
  w.days.forEach(function(x){var li=el('li');var s=document.createElementNS(NS,'svg');s.setAttribute('aria-hidden','true');var uu=document.createElementNS(NS,'use');uu.setAttribute('href','#ic-'+WMO(x.c)[1]);s.appendChild(uu);li.appendChild(s);
    li.appendChild(el('span',null,parse(x.d).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})+' · '+WMO(x.c)[0]));
    li.appendChild(el('span',null,(x.lo!=null?Math.round(x.lo):'-')+'° / '+(x.hi!=null?Math.round(x.hi):'-')+'°'));
    li.appendChild(el('span',null,x.p!=null?Math.round(x.p)+'%':''));ul.appendChild(li)});
  b.appendChild(ul);
  var acts=el('div','acts');
  var rf=el('button','primary','Refresh');rf.type='button';rf.addEventListener('click',function(){wxFlow(b,true)});
  var ch=el('button',null,'Change location');ch.type='button';ch.addEventListener('click',function(){try{localStorage.removeItem(LOCK);localStorage.removeItem(WXK)}catch(e){}wxFlow(b,false)});
  var cl=el('button',null,'Close');cl.type='button';cl.addEventListener('click',closeSheet);
  acts.appendChild(rf);acts.appendChild(ch);acts.appendChild(cl);b.appendChild(acts);
  var at=el('p','attr','Weather data by ');var a=el('a',null,'Open-Meteo.com');a.href='https://open-meteo.com/';a.target='_blank';a.rel='noopener noreferrer';at.appendChild(a);at.appendChild(document.createTextNode(' (CC BY 4.0). Forecasts can be wrong; do not rely on them for safety decisions.'));b.appendChild(at);
}
function wxLoading(b,msg){b.textContent='';var h=el('h3',null,'Weather');h.id='sheet-title';b.appendChild(h);var sp=el('div','loading');sp.setAttribute('role','status');sp.appendChild(el('span','spinner'));sp.appendChild(el('span',null,msg));b.appendChild(sp)}
function wxProblem(b,msg,loc){
  b.textContent='';var h=el('h3',null,'Weather');h.id='sheet-title';b.appendChild(h);b.appendChild(el('p',null,msg));
  var acts=el('div','acts');
  if(loc){var r=el('button','primary','Try again');r.type='button';r.addEventListener('click',function(){wxFlow(b,true)});acts.appendChild(r)}
  var cl=el('button',null,'Close');cl.type='button';cl.addEventListener('click',closeSheet);acts.appendChild(cl);b.appendChild(acts);
}
function wxChoose(b,note){
  b.textContent='';var h=el('h3',null,'Weather for your area');h.id='sheet-title';b.appendChild(h);
  b.appendChild(el('p',null,'The app needs your approximate location once. It is saved only on this device and is sent only to the weather service (Open-Meteo) to get the forecast.'));
  if(note)b.appendChild(el('p','why',note));
  var acts=el('div','acts');
  var use=el('button','primary','Use my location');use.type='button';
  use.addEventListener('click',function(){
    wxLoading(b,'Finding your area');
    askLocation(function(st,la,lo){
      if(st==='ok'&&isNum(la)&&isNum(lo)&&Math.abs(la)<=90&&Math.abs(lo)<=180){saveLoc(la,lo,'');wxFlow(b,false)}
      else wxChoose(b,st==='denied'?'Location permission was not given. You can search for a place instead.':'Could not get your location. Turn on location, or search for a place instead.');
    });
  });
  acts.appendChild(use);b.appendChild(acts);
  b.appendChild(el('h4',null,'Or search for a place'));
  var inp=document.createElement('input');inp.type='search';inp.maxLength=60;inp.placeholder='City or town, for example Gadag';inp.setAttribute('aria-label','Search for a place');b.appendChild(inp);
  var res=el('ul');res.style.marginTop='8px';b.appendChild(res);
  var go_=el('button',null,'Search');go_.type='button';go_.style.marginTop='8px';b.appendChild(go_);
  function search(){
    var q=inp.value.trim();if(q.length<2)return;res.textContent='';res.appendChild(el('li',null,'Searching...'));
    fetchJSON('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(q)+'&count=6&language=en&format=json').then(function(j){
      res.textContent='';var a=(j&&Array.isArray(j.results))?j.results.slice(0,6):[];
      if(!a.length){res.appendChild(el('li',null,'No place found.'));return}
      a.forEach(function(r){
        if(!isNum(r.latitude)||!isNum(r.longitude)||typeof r.name!=='string')return;
        var li=el('li');var bt=el('button',null,r.name);bt.type='button';bt.appendChild(el('small',null,[r.admin1,r.country].filter(function(x){return typeof x==='string'}).join(', ')));
        bt.addEventListener('click',function(){saveLoc(r.latitude,r.longitude,r.name+(typeof r.admin1==='string'?', '+r.admin1:''));wxFlow(b,false)});
        li.appendChild(bt);res.appendChild(li);
      });
    }).catch(function(){res.textContent='';res.appendChild(el('li',null,'Could not search. Check your connection.'))});
  }
  go_.addEventListener('click',search);inp.addEventListener('keydown',function(e){if(e.key==='Enter')search()});
  var cl=el('button',null,'Close');cl.type='button';cl.style.marginTop='8px';cl.addEventListener('click',closeSheet);b.appendChild(cl);
}
function wxFlow(b,force){
  var loc=getLoc();
  if(!loc){wxChoose(b,'');return}
  wxLoading(b,'Getting the forecast');
  loadWeather(loc,force).then(function(w){if(!$('sheet').hidden)renderWeather(b,loc,w)}).catch(function(){logEvent('weather','forecast failed');if(!$('sheet').hidden)wxProblem(b,'Could not get the forecast. Check your connection and try again.',loc)});
}
function openWeather(){openSheet(function(b){wxFlow(b,false)})}

/* ---------- calendar (only when tapped; content comes from data/calendar.json) ---------- */
function openCalendar(){
  openSheet(function(b){
    var h=el('h3',null,'Kannada calendar');h.id='sheet-title';b.appendChild(h);
    var t=todayStr();b.appendChild(el('p',null,fmt(t)));var k=el('p','kn',fmtKn(t));k.lang='kn';b.appendChild(k);
    var box=el('div');b.appendChild(box);
    var sp=el('div','loading');sp.setAttribute('role','status');sp.appendChild(el('span','spinner'));sp.appendChild(el('span',null,'Loading calendar'));box.appendChild(sp);
    var cl=el('button',null,'Close');cl.type='button';cl.style.marginTop='10px';cl.addEventListener('click',closeSheet);b.appendChild(cl);
    var p=EMB?Promise.resolve(EMB.calendar||null):getJSON('data/calendar.json').catch(function(e){if(String(e&&e.message)==='404')return null;throw e});
    p.then(function(j){
      box.textContent='';
      var ev=(j&&Array.isArray(j.events))?j.events.filter(function(x){return x&&DRE.test(x.d||'')&&typeof x.t==='string'&&x.d>=t}).sort(function(a,b){return a.d<b.d?-1:1}).slice(0,15):[];
      if(!ev.length){box.appendChild(el('p','why','The festival and event calendar from Sabhadi Mutt, Gadag has not been added yet. It will appear here once the mutt’s calendar is available to the app.'));return}
      var ul=el('ul','wx-days');
      ev.forEach(function(x){var li=el('li');li.appendChild(el('span',null,parse(x.d).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})));var s=el('span',null,x.t);li.appendChild(s);if(typeof x.k==='string'&&x.k){var kk=el('span','kn',x.k);kk.lang='kn';li.appendChild(kk)}ul.appendChild(li)});
      box.appendChild(ul);
      var src=j.source&&typeof j.source.n==='string'?j.source:null;
      if(src){var at=el('p','attr','Source: ');if(/^https:\/\//.test(src.u||'')){var a=el('a',null,src.n);a.href=src.u;a.target='_blank';a.rel='noopener noreferrer';at.appendChild(a)}else at.appendChild(document.createTextNode(src.n));box.appendChild(at)}
    }).catch(function(){box.textContent='';box.appendChild(el('p','why','Could not load the calendar. Check your connection.'))});
  });
}

/* ---------- refresh ---------- */
var refreshing=false,lastRefresh=Date.now();
function refresh(manual){
  if(refreshing||!state.cur)return;
  if(playing&&!manual)return;
  refreshing=true;var btn=$('refresh');btn.classList.add('spinning');btn.disabled=true;
  var cur=state.cur,before=JSON.stringify(state.data);
  function done(msg){refreshing=false;btn.classList.remove('spinning');btn.disabled=false;lastRefresh=Date.now();if(manual&&msg)toast(msg)}
  if(EMB){setTimeout(function(){done('Up to date')},400);return}
  delete mem[cur];delete moreMem[cur];
  try{localStorage.removeItem('dnb:d:'+cur);localStorage.removeItem('dnb:d:more-'+cur)}catch(e){}
  getJSON('data/index.json').then(function(j){
    try{localStorage.setItem('dnb:index',JSON.stringify(j))}catch(e){}
    var ds=(Array.isArray(j.dates)?j.dates:[]).filter(function(d){return typeof d==='string'&&DRE.test(d)});ds.sort().reverse();
    var oldLatest=state.latest;state.dates=ds;state.latest=DRE.test(j.latest||'')?j.latest:(ds[0]||state.latest);
    if(cur===oldLatest&&state.latest!==oldLatest){done('Newer briefing found');go(state.latest);return}
    return loadDay(cur).then(function(d){
      if(cur!==state.cur)return done();
      if(!d){done('Nothing new');return}
      state.data=d;paint();renderAll();
      done(JSON.stringify(d)!==before?'Updated with the latest stories':'Already up to date');
    });
  }).catch(function(){logEvent('refresh','failed');done('Could not refresh. Check your connection.');if(state.data===null||mem[cur]===undefined){loadDay(cur).catch(function(){})}});
}
function setupPull(){
  var y0=null,x0=0,dy=0,ind=$('pull');
  document.addEventListener('touchstart',function(e){
    if(e.touches.length===1&&(window.scrollY||document.documentElement.scrollTop)<=0&&$('sheet').hidden){y0=e.touches[0].clientY;x0=e.touches[0].clientX;dy=0}else y0=null;
  },{passive:true});
  document.addEventListener('touchmove',function(e){
    if(y0==null||e.touches.length!==1)return;
    dy=e.touches[0].clientY-y0;var dx=Math.abs(e.touches[0].clientX-x0);
    if(dy>12&&dy>dx){ind.hidden=false;ind.style.transform='translate(-50%,'+Math.min(dy/2,64)+'px)';ind.classList.toggle('ready',dy>90);ind.querySelector('span').textContent=dy>90?'Release to refresh':'Pull down to refresh'}
    else{ind.hidden=true}
  },{passive:true});
  document.addEventListener('touchend',function(){
    if(y0==null)return;var go_=dy>90;y0=null;ind.hidden=true;ind.classList.remove('ready');
    if(go_)refresh(true);dy=0;
  },{passive:true});
}
function init(){
  purge();
  $('sheet-x').addEventListener('click',closeSheet);$('sheet-bg').addEventListener('click',closeSheet);
  $('reportbtn').addEventListener('click',function(){openReport('')});
  applyTheme(lsGet('dnb:theme2','sepia'));applyFs(parseInt(lsGet('dnb:fs','2'),10)||2);
  var sr=lsGet('dnb:rate','1');if([].some.call($('rate').options,function(o){return o.value===sr}))$('rate').value=sr;
  $('rate').addEventListener('change',function(){lsSet('dnb:rate',$('rate').value)});
  var sc=lsGet('dnb:cat','top'),ss=lsGet('dnb:sub','');if(sc==='top'||sc==='students'||sc==='general'||sc==='sport'||sc==='world'||sc==='digest'){state.cat=sc;state.sub=CATN[ss]?ss:''}
  $('settings').addEventListener('click',openSettings);
  $('refresh').addEventListener('click',function(){refresh(true)});
  setupPull();
  $('cats').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;if(b.dataset.cat==='weather'){openWeather();return}if(b.dataset.cat==='calendar'){openCalendar();return}state.cat=b.dataset.cat;state.sub='';lsSet('dnb:cat',state.cat);lsSet('dnb:sub','');stopSpeech();renderAll();window.scrollTo(0,0)});
  $('subcats').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;state.sub=b.dataset.sub;lsSet('dnb:sub',state.sub);stopSpeech();renderAll()});
  $('digest').addEventListener('click',function(e){var b=e.target.closest('button[data-sec]');if(!b)return;state.cat='top';state.sub='';lsSet('dnb:cat','top');lsSet('dnb:sub','');state.focus=b.dataset.sec+'-'+b.dataset.i;renderAll();focusCard()});
  document.addEventListener('visibilitychange',function(){if(!document.hidden&&Date.now()-lastRefresh>30*60000)refresh(false)});
  setTimeout(checkCrash,1200);
  if(APP){checkVoices(0);document.addEventListener('visibilitychange',function(){if(!document.hidden){try{APP.refreshVoices&&APP.refreshVoices()}catch(e){}setTimeout(function(){checkVoices(0)},1500)}});watchUpdate(0);try{var av=APP.appVersion&&APP.appVersion();if(av){$('appver').textContent='App version '+av+'. The app checks for updates when it opens.';$('appver').hidden=false}}catch(e){}}
  $('shareapp').addEventListener('click',function(){shareText('Daily News Briefing: India, Karnataka and world stories in English and Kannada, with a voice. Android app:',APK)});
  try{var m=localStorage.getItem('dnb:mode');if(m==='en'||m==='kn'||m==='both')setMode(m)}catch(e){}
  if(window.speechSynthesis){loadVoices();speechSynthesis.onvoiceschanged=loadVoices}
  $('l-en').addEventListener('click',function(){setMode('en')});
  $('l-kn').addEventListener('click',function(){setMode('kn')});
  $('l-both').addEventListener('click',function(){setMode('both')});
  $('prev').addEventListener('click',function(){step(-1)});
  $('next').addEventListener('click',function(){step(1)});
  $('latest').addEventListener('click',function(){if(state.latest)go(state.latest)});
  $('stop').addEventListener('click',stopSpeech);
  $('datebtn').addEventListener('click',function(){$('cal').hidden?openCal():closeCal()});
  $('cal-prev').addEventListener('click',function(){state.vm--;if(state.vm<0){state.vm=11;state.vy--}drawCal()});
  $('cal-next').addEventListener('click',function(){state.vm++;if(state.vm>11){state.vm=0;state.vy++}drawCal()});
  $('cal-grid').addEventListener('click',function(e){var b=e.target.closest('button');if(b&&b.classList.contains('has'))go(b.dataset.d)});
  document.addEventListener('click',function(e){if(!$('cal').hidden&&!e.target.closest('#daybar'))closeCal()});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){if(!$('sheet').hidden){closeSheet();return}closeCal();$('datebtn').focus()}});
  $('main').addEventListener('click',function(e){
    var pa=e.target.closest('[data-play]');
    if(pa){
      var sec=pa.dataset.play,nodes=$('list-'+sec).children,jobs=[];
      [].forEach.call(nodes,function(nd){var it=state.data[nd.dataset.sec][+nd.dataset.i];jobs=jobs.concat(jobsFor(it,nd,state.mode!=='kn',state.mode!=='en'))});
      start(jobs);return;
    }
    var kb=e.target.closest('.kwb');
    if(kb){openKeyword(kb.closest('.card'),+kb.dataset.k);return}
    var tb=e.target.closest('.tabs button');
    if(tb){
      var cc=tb.closest('.card');cc.dataset.tab=tb.dataset.tab;
      cc.querySelectorAll('.tabs button').forEach(function(x){x.setAttribute('aria-selected',String(x===tb))});
      if(tb.dataset.tab==='more')fillMore(cc);
      return;
    }
    var b=e.target.closest('.row button');if(!b)return;
    var c=b.closest('.card'),it=state.data[c.dataset.sec][+c.dataset.i];
    if(b.dataset.act==='share'){shareText(it.h,LIVE+'#'+state.cur+'/'+c.dataset.sec+'-'+c.dataset.i);return}
    start(jobsFor(it,c,b.dataset.act==='en',b.dataset.act==='kn'));
  });
  var sx=null,sy=0;
  document.addEventListener('touchstart',function(e){if(e.touches.length===1){sx=e.touches[0].clientX;sy=e.touches[0].clientY}else sx=null},{passive:true});
  document.addEventListener('touchend',function(e){
    if(sx==null)return;var dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;sx=null;
    if(Math.abs(dx)>90&&Math.abs(dx)>Math.abs(dy)*2){step(dx<0?1:-1)}
  },{passive:true});
  window.addEventListener('hashchange',function(){var h=parseHash();if(h&&(h.d!==state.cur||h.f))go(h.d,true,h.f)});

  loadIndex().then(function(ix){
    var ds=(ix&&Array.isArray(ix.dates)?ix.dates:[]).filter(function(d){return typeof d==='string'&&DRE.test(d)});
    ds.sort().reverse();state.dates=ds;
    state.latest=(ix&&DRE.test(ix.latest||''))?ix.latest:(ds[0]||todayStr());
    var h=parseHash();
    if(h)go(h.d,true,h.f);else go(state.latest,true);
  }).catch(function(){
    logEvent('offline','briefing list failed');
    $('dateline').textContent='Offline';
    $('list-in').appendChild(el('li','empty','Could not load the briefing list. Check your connection.'));
    $('sec-in').hidden=false;
  });
}
init();
})();
