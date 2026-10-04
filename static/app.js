const $ = (id) => document.getElementById(id);

function tickClock(){
  const d = new Date();
  $('clock').textContent = d.toLocaleTimeString([], {hour12:false});
}
setInterval(tickClock, 1000); tickClock();

const bars = $('bars');
for(let i=0;i<34;i++){
  const b=document.createElement('div'); b.className='bar'; b.style.height=(12+Math.random()*88)+'%'; bars.appendChild(b);
}
setInterval(()=>{
  [...bars.children].forEach(b=>b.style.height=(8+Math.random()*92)+'%');
},700);

let globe;

function initGlobe(){
  globe = Globe()(document.getElementById('globe'))
    .backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(true)
    .atmosphereColor('#3DE0FC')
    .atmosphereAltitude(.18)
    .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
    .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
    .pointsData([])
    .pointLat('lat').pointLng('lng').pointColor(()=>'#E977F5').pointAltitude(.035).pointRadius(.38)
    .arcsData([]).arcStartLat('startLat').arcStartLng('startLng').arcEndLat('endLat').arcEndLng('endLng')
    .arcColor(()=>'#3DE0FC').arcAltitudeAutoScale(.55).arcStroke(.8).arcDashLength(.38).arcDashGap(1.4).arcDashAnimateTime(1800);

  const controls = globe.controls(); controls.autoRotate=true; controls.autoRotateSpeed=.28; controls.enableDamping=true;
  const el = document.getElementById('globe');
  const resize=()=>globe.width(el.clientWidth).height(el.clientHeight);
  window.addEventListener('resize',resize); resize();
}
initGlobe();

function setText(id, value){ $(id).textContent = value ?? '—'; }

async function lookup(ip){
  if(!ip.trim()) return;
  const btn=$('lookupBtn'); btn.disabled=true; btn.querySelector('span').textContent='ANALYZING';
  $('signal').textContent='SCANNING'; $('pathStatus').textContent='TRACING'; $('intelStatus').textContent='QUERYING';
  $('globeHint').textContent='Resolving public network intelligence…';
  try{
    const r=await fetch('/api/lookup?ip='+encodeURIComponent(ip.trim()));
    const data=await r.json();
    if(!r.ok) throw new Error(data.error||'Lookup failed');
    render(data);
    await refreshHistory();
  }catch(e){
    $('globeHint').textContent=e.message;
    $('signal').textContent='ERROR'; $('intelStatus').textContent='FAILED';
  }finally{
    btn.disabled=false; btn.querySelector('span').textContent='ANALYZE';
  }
}

function render(d){
  setText('targetIp', d.ip); setText('hostname',d.hostname); setText('asn',d.asn); setText('org',d.org);
  setText('country',d.country); setText('region',d.region); setText('city',d.city); setText('timezone',d.timezone);
  setText('routable',d.global?'YES':'NO'); setText('lat',d.latitude ?? '—'); setText('lon',d.longitude ?? '—');
  setText('node', d.latitude!=null ? 'LOCKED' : 'LOCAL');
  $('typeBadge').textContent=d.type||'PUBLIC'; $('signal').textContent='ACQUIRED'; $('pathStatus').textContent='RESOLVED'; $('intelStatus').textContent='COMPLETE';
  $('globeHint').textContent=d.latitude!=null?'Target projection locked • approximate network geolocation':'Non-global address • projection skipped';

  if(d.latitude!=null && d.longitude!=null){
    const points=[{lat:d.latitude,lng:d.longitude}];
    const arcs=[{startLat:0,startLng:0,endLat:d.latitude,endLng:d.longitude}];
    globe.pointsData(points).arcsData(arcs);
    globe.pointOfView({lat:d.latitude,lng:d.longitude,altitude:1.8},1200);
  }else{
    globe.pointsData([]).arcsData([]);
  }
}

async function refreshHistory(){
  const r=await fetch('/api/history'); const rows=await r.json();
  $('lookupCount').textContent=rows.length;
  $('historyBody').innerHTML=rows.length ? rows.map(x=>`<tr><td>${escapeHtml(x.queried_at)}</td><td><code>${escapeHtml(x.ip)}</code></td><td>${escapeHtml((x.city||'—')+', '+(x.country||'—'))}</td><td>${escapeHtml(x.org||'—')}</td><td>${escapeHtml(x.asn||'—')}</td></tr>`).join('') : '<tr><td colspan="5" class="empty">No evidence records yet.</td></tr>';
}
function escapeHtml(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

$('lookupForm').addEventListener('submit',e=>{e.preventDefault();lookup($('ipInput').value)});
document.querySelectorAll('[data-ip]').forEach(b=>b.addEventListener('click',()=>{$('ipInput').value=b.dataset.ip;lookup(b.dataset.ip)}));

setTimeout(()=>lookup($('ipInput').value),500);
