(function(){
'use strict';
var ICONS={cyclone:1,chart:1,building:1,mic:1,ballot:1,cricket:1,gavel:1,scales:1,coin:1,phone:1,check:1,alert:1,laptop:1,camera:1,book:1,bin:1,cross:1,doc:1,trees:1,plane:1,bus:1,bolt:1,shield:1,drop:1,heart:1,flag:1};
var DRE=/^\d{4}-\d{2}-\d{2}$/;
var NS='http://www.w3.org/2000/svg';
var $=function(id){return document.getElementById(id)};
var MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
var state={dates:[],latest:null,cur:null,data:null,vy:0,vm:0,mode:'both'};
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
function validate(d,date){
  if(!d||typeof d!=='object')return null;
  var out={date:date,in:[],ka:[]};
  ['in','ka'].forEach(function(k){
    var a=Array.isArray(d[k])?d[k].slice(0,10):[];
    a.forEach(function(x){
      if(!x||typeof x!=='object')return;
      var ic=ICONS[x.ic]?x.ic:'doc';var tn=/^t[1-5]$/.test(x.tn)?x.tn:'t1';
      out[k].push({h:str(x.h,200),t:str(x.t,1200),kh:str(x.kh,300),k:str(x.k,1800),s:str(x.s,80),w:str(x.w,400),p:x.p===1?1:0,d:str(x.d,2500),kd:str(x.kd,3500),ds:cleanSrcs(x.ds),kw:cleanKw(x.kw),u:/^https:\/\//.test(x.u||'')?str(x.u,500):'',ic:ic,tn:tn});
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
  if(cached){mem[date]=cached;try{localStorage.setItem(key,JSON.stringify({u:Date.now(),d:cached}))}catch(e){}net.then(function(d){if(d&&state.cur===date&&JSON.stringify(d)!==JSON.stringify(cached)&&!playing){state.data=d;fillList('list-in',d.in,'in');fillList('list-ka',d.ka,'ka')}}).catch(function(){});return Promise.resolve(cached)}
  return net;
}
function prefetch(date){
  var i=state.dates.indexOf(date);
  [i-1,i+1].forEach(function(j){if(j>=0&&j<state.dates.length&&!mem[state.dates[j]])loadDay(state.dates[j]).catch(function(){})});
}

/* ---------- render ---------- */
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
  var a=el('a','src','Original report');
  a.href=it.u||('https://news.google.com/search?q='+encodeURIComponent(it.h)+'&hl=en-IN&gl=IN&ceid=IN:en');
  a.target='_blank';a.rel='noopener noreferrer';row.appendChild(a);
  if(it.p){li.classList.add('hot');b.appendChild(el('span','badge','Important'))}
  var sum=el('div','sum');sum.appendChild(en);sum.appendChild(kn);
  var tabs=el('div','tabs');tabs.setAttribute('role','tablist');
  var t1=el('button',null,'Summary');t1.type='button';t1.setAttribute('role','tab');t1.setAttribute('aria-selected','true');t1.dataset.tab='sum';
  var t2=el('button',null,'More details');t2.type='button';t2.setAttribute('role','tab');t2.setAttribute('aria-selected','false');t2.dataset.tab='more';
  tabs.appendChild(t1);tabs.appendChild(t2);
  var more=el('div','more');more.setAttribute('role','tabpanel');
  if(it.d||it.kd){
    if(it.d){var me=el('div','en');me.appendChild(el('p',null,it.d));more.appendChild(me)}
    if(it.kd){var mk=el('div','kn');mk.lang='kn';mk.appendChild(el('p',null,it.kd));more.appendChild(mk)}
  }else more.appendChild(el('p','why','More details have not been gathered for this story yet. Use the link below to see what other outlets are reporting.'));
  if(it.ds.length){
    var al=el('p','srcline');al.appendChild(document.createTextNode('Also reported by: '));
    it.ds.forEach(function(s,k){if(k)al.appendChild(document.createTextNode(' · '));var x=el('a',null,s.n);x.href=s.u;x.target='_blank';x.rel='noopener noreferrer';al.appendChild(x)});
    more.appendChild(al);
  }
  var fm=el('p','srcline');var fa=el('a',null,'Find more reports on this story');
  fa.href='https://news.google.com/search?q='+encodeURIComponent(it.h)+'&hl=en-IN&gl=IN&ceid=IN:en';fa.target='_blank';fa.rel='noopener noreferrer';fm.appendChild(fa);more.appendChild(fm);
  b.appendChild(tabs);b.appendChild(sum);b.appendChild(more);b.appendChild(row);if(it.s)b.appendChild(sourceLine(it));
  li.appendChild(tile);li.appendChild(b);return li;
}
function fillList(id,arr,sec){
  var ol=$(id);ol.textContent='';
  arr.forEach(function(it,i){ol.appendChild(card(sec,it,i))});
}
function showSkeleton(){
  ['list-in','list-ka'].forEach(function(id){var ol=$(id);ol.textContent='';for(var i=0;i<3;i++){var li=el('li','skeleton');ol.appendChild(li)}});
}
function showEmpty(date){
  ['list-in','list-ka'].forEach(function(id,k){
    var ol=$(id);ol.textContent='';
    if(k===1)return;
    var li=el('li','empty');
    li.appendChild(el('p',null,'No briefing was created for '+fmt(date)+'.'));
    li.appendChild(el('p',null,'Briefings are written only on days you open the app. To create one for today, ask Claude: "Brief me today".'));
    var near=nearest(date);
    if(near){var b=el('button','chip','Go to '+fmt(near));b.type='button';b.addEventListener('click',function(){go(near)});li.appendChild(b)}
    ol.appendChild(li);
  });
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
    state.data=d;fillList('list-in',d.in,'in');fillList('list-ka',d.ka,'ka');prefetch(date);focusCard();
  }).catch(function(){
    if(my!==token)return;
    ['list-in','list-ka'].forEach(function(id){$(id).textContent=''});
    logEvent('load','day '+date+' failed');
    var li=el('li','empty','Could not load this day. Check your connection and try again.');$('list-in').appendChild(li);
  });
}
function focusCard(){
  if(!state.focus)return;var c=$('a-'+state.focus);state.focus=null;
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
function setupReminder(){
  if(!(APP&&APP.getReminder&&APP.setReminder))return;
  $('remind').hidden=false;
  var cur=String(APP.getReminder()).split('|');
  $('rem-on').checked=cur[0]==='1';
  $('rem-time').value=pad(+cur[1]||7)+':'+pad(+cur[2]||0);
  function save(){
    var t=($('rem-time').value||'07:00').split(':');
    APP.setReminder($('rem-on').checked,+t[0],+t[1]);
    if($('rem-on').checked&&!(APP.notifAllowed&&!APP.notifAllowed()))toast('Reminder set for '+$('rem-time').value+' every day');
    else if(!$('rem-on').checked)toast('Reminder off');
  }
  $('rem-on').addEventListener('change',save);$('rem-time').addEventListener('change',save);
  window.__remind=function(ev){
    if(ev==='denied'){$('rem-on').checked=false;toast('Notifications are blocked. Turn them on in Android Settings, Apps, Daily News Briefing, Notifications.')}
    else if(ev==='ok')toast('Reminder set for '+$('rem-time').value+' every day');
  };
}
function init(){
  purge();
  $('sheet-x').addEventListener('click',closeSheet);$('sheet-bg').addEventListener('click',closeSheet);
  $('reportbtn').addEventListener('click',function(){openReport('')});
  setTimeout(checkCrash,1200);
  if(APP){$('getapp').hidden=true;checkVoices(0);setupReminder();document.addEventListener('visibilitychange',function(){if(!document.hidden){try{APP.refreshVoices&&APP.refreshVoices()}catch(e){}setTimeout(function(){checkVoices(0)},1500)}});try{var av=APP.appVersion&&APP.appVersion();if(av){$('appver').textContent='App version '+av+'. The app checks for updates when it opens.';$('appver').hidden=false}}catch(e){}}
  $('shareapp').addEventListener('click',function(){shareText('Daily News Briefing: top 10 India and Karnataka stories in English and Kannada, with a voice. Android app:',APK)});
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
      var sec=pa.dataset.play,arr=state.data?state.data[sec]:[],nodes=$('list-'+sec).children,jobs=[];
      arr.forEach(function(it,i){jobs=jobs.concat(jobsFor(it,nodes[i],state.mode!=='kn',state.mode!=='en'))});
      start(jobs);return;
    }
    var kb=e.target.closest('.kwb');
    if(kb){openKeyword(kb.closest('.card'),+kb.dataset.k);return}
    var tb=e.target.closest('.tabs button');
    if(tb){
      var cc=tb.closest('.card');cc.dataset.tab=tb.dataset.tab;
      cc.querySelectorAll('.tabs button').forEach(function(x){x.setAttribute('aria-selected',String(x===tb))});
      return;
    }
    var b=e.target.closest('.row button');if(!b)return;
    var c=b.closest('.card'),it=state.data[c.dataset.sec][+c.dataset.i];
    if(b.dataset.act==='share'){shareText(it.h,LIVE+'#'+state.cur+'/'+c.dataset.sec+'-'+c.dataset.i);return}
    start(jobsFor(it,c,b.dataset.act==='en',b.dataset.act==='kn'));
  });
  var sx=null;
  document.addEventListener('touchstart',function(e){sx=e.touches.length===1?e.touches[0].clientX:null},{passive:true});
  document.addEventListener('touchend',function(e){
    if(sx==null)return;var dx=e.changedTouches[0].clientX-sx;sx=null;
    if(Math.abs(dx)>90){step(dx<0?1:-1)}
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
  });
}
init();
})();
