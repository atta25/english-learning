(function(){
  const b = document.getElementById("theme"), root = document.documentElement;
  const sync = () => { b.textContent = root.getAttribute("data-theme")==="dark" ? "☀️" : "🌙"; };
  b.addEventListener("click", () => {
    const next = root.getAttribute("data-theme")==="dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch(e) {}
    sync();
  });
  sync();
})();
const C = ["#2563eb","#dc2626","#059669","#d97706","#7c3aed","#db2777"];
const MASCOTS = ["🧑‍🏫","💁‍♀️","🧔","👩‍🎓","🧑‍💼","🙋‍♂️"];
const ART = window.ART || {};
const LVL_ORDER = ["A1","A2","B1","B2","C1","C2"];
const CAT_ORDER = [...new Set((window.MAPS || []).map(m=>m.cat))];
const ALL = (window.MAPS || []).map((m,i)=>({...m, o:i}))
  .sort((a,b)=> LVL_ORDER.indexOf(a.lvl)-LVL_ORDER.indexOf(b.lvl) || CAT_ORDER.indexOf(a.cat)-CAT_ORDER.indexOf(b.cat) || a.o-b.o)
  .map((m,i)=>({...m, id:i}));
const cats = [...new Set(ALL.map(m=>m.cat))];
let curCat = "All", query = "", curLvl = "";
const SHORT = {"Grammar: Tenses & Verbs":"Tenses","Grammar: Structures":"Structures","Phrasal Verbs, Idioms & Collocations":"Phrasal & Idioms","Vocabulary: Everyday Life":"Everyday","Vocabulary: Work, Study & Society":"Work & Study","Communication & British Culture":"Culture"};
const ESC = {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};
const esc = s => String(s).replace(/[&<>"']/g, c => ESC[c]);

// lang="en" for exercise prompts, except translation prompts that contain Spanish text
const enAttr = s => /[áéíóúñ¿¡]/.test(s) ? "" : ' lang="en"';
// Search: accent-insensitive, every word must match at the start of a word, results ranked by where it matches.
const norm = s => " " + String(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim() + " ";
const SEARCH = ALL.map(m => ({
  title: norm(m.t+" "+m.es),
  head: norm(m.boxes.map(b=>b.h+" "+b.es).join(" ")),
  cat: norm(m.cat),
  body: norm([m.d, ...m.boxes.flatMap(b=>[...b.i.flat(), ...b.ex]), ...m.qs.flatMap(x=>[x.q,x.a])].join(" "))
}));
const WEIGHTS = [["title",10],["cat",6],["head",5],["body",1]];
// Returns the relevance score of map m for the given words, or 0 if any word is missing.
function score(m, words){
  const f = SEARCH[m.id];
  let total = 0;
  for (const w of words) {
    const hit = WEIGHTS.find(([k]) => f[k].includes(" "+w));
    if (!hit) return 0;
    total += hit[1];
  }
  return total;
}

function renderTabs(){
  const t = document.getElementById("tabs");
  t.innerHTML = ["All",...cats].map(c=>`<button lang="en" class="${c===curCat?"on":""}" data-c="${esc(c)}">${c==="All"?"📚 All":esc(SHORT[c]||c)} <small>(${c==="All"?ALL.length:ALL.filter(m=>m.cat===c).length})</small></button>`).join("");
  t.querySelectorAll("button").forEach(b=>b.onclick=()=>{curCat=b.dataset.c; render();});
}

function renderSeg(){
  const s = document.getElementById("seg");
  s.innerHTML = ["","A1","A2","B1","B2","C1","C2"].map(l=>`<button data-l="${l}" class="${curLvl===l?"on":""}">${l||"Todos"}</button>`).join("");
  s.querySelectorAll("button").forEach(b=>b.onclick=()=>{curLvl=b.dataset.l; render();});
}

// positions for 2 or 3 stickers inside the picture blob: [left, top, size, rotation]
const SLOTS = {
  1:[[22,16,52,-6]],
  2:[[4,30,50,-8],[44,2,44,8]],
  3:[[2,36,40,-8],[46,34,40,7],[22,2,46,-3]]
};
function pic(emojis){
  const s = SLOTS[Math.min(emojis.length,3)];
  return `<div class="pic">${emojis.slice(0,3).map((e,k)=>`<span class="stk" style="left:${s[k][0]}px;top:${s[k][1]}px;font-size:${s[k][2]}px;transform:rotate(${s[k][3]}deg)">${e}</span>`).join("")}</div>`;
}

function mapHTML(m){
  const art = ART[m.t] || {};
  const mascot = art.mascot || MASCOTS[m.id % MASCOTS.length];
  const scene = art.scene || [m.icon];
  const box = (b,j)=>`<div class="box${j===0?" open":""}" id="b${m.id}_${j}" style="--c:${C[j%6]}">
    <div class="hd"><div class="num">${j+1}</div><div><h3 lang="en">${esc(b.h)}</h3></div></div>
    <div class="bd">${pic((art.boxes && art.boxes[j]) || [b.e])}
      <ul>${b.i.map(([a,c])=>`<li><b lang="en">${esc(a)}</b><i>${esc(c)}</i></li>`).join("")}</ul></div>
    <div class="speak"><div class="bubble"><b lang="en">${esc(b.ex[0])}</b><span>${esc(b.ex[1])}</span></div><span class="stk mascot">${mascot}</span></div></div>`;
  const star = (x,y,e)=>`<span class="star" style="left:${x};top:${y}">${e}</span>`;
  return `<section class="page" id="m${m.id}" data-id="${m.id}">
    <div class="rings"></div><div class="tape l"></div><div class="tape r"></div>
    ${star("2%","46%","✨")}${star("97%","52%","⭐")}${star("48%","98%","✨")}
    <div class="topbar"><div class="tag" lang="en">#${m.id+1} · ${esc(m.cat)} · ${esc(m.type)}</div><div class="level lv-${esc(m.lvl)}">${esc(m.lvl)}</div></div>
    <svg class="arrows"></svg>
    <div class="grid">
      <div class="col">${m.boxes.slice(0,3).map((b,j)=>box(b,j)).join("")}</div>
      <div class="mid">
        <div class="cloudwrap" id="c${m.id}"><svg class="cl"></svg>
          <div class="cloudin">
            <div class="scene">${scene.map((e,k)=>`<span class="stk" style="font-size:${k%2?40:50}px;transform:rotate(${(k-2)*5}deg)">${e}</span>`).join("")}</div>
            <h1 lang="en">${esc(m.t)}</h1><h2>${esc(m.es)}</h2><p>${esc(m.d)}</p>
          </div>
        </div>
        <div class="exercise"><h4 lang="en">✏️ Your turn</h4><span class="stk think">🤔</span>
          ${m.qs.map((x,n)=>`<div class="q"${enAttr(x.q)}>${n+1}. ${esc(x.q)}</div><details><summary>Ver respuesta</summary><div class="ans">✅ ${esc(x.a)}</div></details>`).join("")}</div>
      </div>
      <div class="col">${m.boxes.slice(3).map((b,j)=>box(b,j+3)).join("")}</div>
    </div></section>`;
}

let cur = [], shown = 0;
const STEP = 6;
function paint(){
  document.getElementById("maps").innerHTML = cur.slice(0,shown).map(mapHTML).join("") +
    (shown < cur.length ? `<div style="text-align:center;margin:10px"><button id="more" class="tabs-btn">⬇️ Cargar más (${shown}/${cur.length})</button></div>` : "");
  const more = document.getElementById("more");
  if (more) more.onclick = () => { shown = Math.min(cur.length, shown+STEP); paint(); };
  requestAnimationFrame(()=>draw());
}
function render(){
  const words = norm(query).trim().split(" ").filter(Boolean);
  const fl = curLvl;
  let list = ALL.filter(m => (curCat==="All"||m.cat===curCat) && (!fl||m.lvl===fl));
  if (words.length) {
    const scores = new Map(list.map(m => [m.id, score(m, words)]));
    list = list.filter(m => scores.get(m.id) > 0).sort((a,b) => scores.get(b.id)-scores.get(a.id) || a.id-b.id);
  }
  renderTabs();
  renderSeg();
  document.getElementById("count").textContent = `${list.length} mapas`;
  const ch = document.getElementById("chips");
  ch.innerHTML = list.map((m,k)=>`<a href="#m${m.id}" data-k="${k}" lang="en">${esc(m.icon)} ${m.id+1}. ${esc(m.t)}</a>`).join("");
  ch.querySelectorAll("a").forEach(a=>a.onclick=e=>{
    e.preventDefault(); const k=+a.dataset.k;
    if (k >= shown) { shown = Math.min(cur.length, k+1); paint(); }
    requestAnimationFrame(()=>document.getElementById("m"+list[k].id).scrollIntoView({behavior:"smooth"}));
  });
  cur = list; shown = Math.min(STEP, list.length); paint();
}

// scalloped cloud outline around a superellipse
function cloudPath(w,h){
  const cx=w/2, cy=h/2, rx=w/2+6, ry=h/2+4, n=3.4;
  const pt=t=>{const c=Math.cos(t),s=Math.sin(t);return [cx+rx*Math.sign(c)*Math.pow(Math.abs(c),2/n), cy+ry*Math.sign(s)*Math.pow(Math.abs(s),2/n)];};
  const per=4*(rx+ry)*0.9, N=Math.max(14,Math.round(per/58));
  let d="", prev=pt(0);
  d+=`M${prev[0].toFixed(1)},${prev[1].toFixed(1)}`;
  for(let k=1;k<=N;k++){
    const p=pt(2*Math.PI*k/N), ch=Math.hypot(p[0]-prev[0],p[1]-prev[1]);
    d+=` A${(ch*0.62).toFixed(1)},${(ch*0.62).toFixed(1)} 0 0 1 ${p[0].toFixed(1)},${p[1].toFixed(1)}`;
    prev=p;
  }
  return d+"Z";
}

// Redraws cloud outlines and arrows. Pass one .page to redraw only that map.
function draw(only){
  const NS="http://www.w3.org/2000/svg";
  const mobile = matchMedia("(max-width:1000px)").matches; // arrows are hidden by CSS here
  const pages = only ? [only] : [...document.querySelectorAll(".page")];
  // read phase: measure everything first to avoid forced layouts between writes
  const data = pages.map(page=>{
    const id=+page.dataset.id, cr=document.getElementById("c"+id).getBoundingClientRect();
    if (mobile) return {page,id,cr};
    const P=page.getBoundingClientRect();
    const boxes=[0,1,2,3,4,5].map(j=>document.getElementById(`b${id}_${j}`).getBoundingClientRect());
    return {page,id,cr,P,boxes};
  });
  // write phase
  data.forEach(({page,id,cr,P,boxes})=>{
    const cs=page.querySelector("svg.cl");
    cs.setAttribute("viewBox",`0 0 ${cr.width} ${cr.height}`);
    cs.innerHTML=`<path d="${cloudPath(cr.width,cr.height)}" fill="#fff" stroke="#1e3a8a" stroke-width="3.5"/><path d="${cloudPath(cr.width-14,cr.height-14)}" transform="translate(7,7)" fill="none" stroke="#93c5fd" stroke-width="2" stroke-dasharray="2 7" stroke-linecap="round"/>`;
    if (mobile) return;
    const svg=page.querySelector("svg.arrows");
    svg.innerHTML=`<defs>${C.map((c,j)=>`<marker id="ar${id}_${j}" markerWidth="10" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L10,4.5 L0,9 z" fill="${c}"/></marker>`).join("")}</defs>`;
    for(let j=0;j<6;j++){
      const r=boxes[j], left=j<3, k=j%3-1;
      const x1=(left?cr.left+8:cr.right-8)-P.left, y1=cr.top+cr.height/2+k*cr.height*0.28-P.top;
      const x2=(left?r.right:r.left)-P.left+(left?4:-4), y2=r.top+r.height*0.28-P.top;
      // end with a straight horizontal stub so the dotted line meets the middle of the arrowhead base
      const stub=Math.min(30,Math.abs(x1-x2)/2), xe=left?x2+stub:x2-stub, mx=(x1+xe)/2;
      const p=document.createElementNS(NS,"path");
      p.setAttribute("d",`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${xe},${y2} L${x2},${y2}`);
      p.setAttribute("fill","none"); p.setAttribute("stroke",C[j]); p.setAttribute("stroke-width","3");
      p.setAttribute("stroke-linecap","round"); p.setAttribute("stroke-dasharray","1 7"); p.setAttribute("marker-end",`url(#ar${id}_${j})`);
      svg.appendChild(p);
    }
  });
}

let searchTimer=0;
document.getElementById("q").addEventListener("input",e=>{
  const v=e.target.value.trim();
  clearTimeout(searchTimer);
  searchTimer=setTimeout(()=>{ query=v; render(); },150);
});
let resizeRaf=0;
window.addEventListener("resize",()=>{ cancelAnimationFrame(resizeRaf); resizeRaf=requestAnimationFrame(()=>draw()); });
const upBtn = document.getElementById("up");
window.addEventListener("scroll",()=>upBtn.classList.toggle("show", window.scrollY > 400),{passive:true});
upBtn.addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
document.getElementById("maps").addEventListener("click",e=>{
  const hd = e.target.closest(".box .hd");
  if (hd && window.matchMedia("(max-width:1000px)").matches) hd.parentElement.classList.toggle("open");
});
document.addEventListener("toggle",e=>{ const m=e.target.closest(".page"); if (m) draw(m); },true);
render();
