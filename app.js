const API_BASE = '/api';

const bongoChannels = [
  {id:'az1',name:'Azam Sports 1',img:'https://via.placeholder.com/300x180?text=Azam+Sports+1',url:'#'},
  {id:'az2',name:'Azam Sports 2',img:'https://via.placeholder.com/300x180?text=Azam+Sports+2',url:'#'},
  {id:'cloud',name:'Clouds Sports',img:'https://via.placeholder.com/300x180?text=Clouds+Sports',url:'#'}
];
const movies = [
  {id:'azm',name:'Azam Cinema',img:'https://via.placeholder.com/300x180?text=Azam+Cinema',url:'#'},
  {id:'wasafi',name:'Wasafi TV',img:'https://via.placeholder.com/300x180?text=Wasafi+TV',url:'#'}
];
const intl = [
  {id:'sps',name:'SuperSport',img:'https://via.placeholder.com/300x180?text=SuperSport',url:'#'},
  {id:'sky',name:'Sky Sports',img:'https://via.placeholder.com/300x180?text=Sky+Sports',url:'#'}
];

function el(q){return document.querySelector(q)}
function createCard(ch){
  const d = document.createElement('div'); d.className='card';
  d.innerHTML = `<img src="${ch.img}" alt="${ch.name}" />
  <div>${ch.name}</div>
  <button class="play-btn" onclick='startTrial("${ch.id}","${ch.name}")'>Play (Trial)</button>`;
  return d;
}

function render(){
  const bongoGrid = el('#bongoGrid'); bongoChannels.forEach(c=>bongoGrid.appendChild(createCard(c)));
  const moviesGrid = el('#moviesGrid'); movies.forEach(c=>moviesGrid.appendChild(createCard(c)));
  const intlGrid = el('#intlGrid'); intl.forEach(c=>intlGrid.appendChild(createCard(c)));
}

// trial: 3 dakika = 180 seconds
function startTrial(id,name){
  const minutes = 3; const seconds = minutes*60;
  const win = window.open('', '_blank', 'width=800,height=600');
  win.document.write(`<p>Playing ${name} — Trial ya ${minutes} dakika. Utaratibu utaanza sasa...</p><div id="t"></div>`);
  let t = seconds;
  const interval = setInterval(()=>{
    if(!win || win.closed){ clearInterval(interval); return; }
    win.document.getElementById('t').innerText = 'Time left: ' + Math.floor(t/60) + 'm ' + (t%60) + 's';
    if(t<=0){ clearInterval(interval); win.document.body.innerHTML = `<p>Trial imeisha. Tafadhali lipia kukamilisha muendelezo.</p><button onclick="location.href='/malipo.html'">Nenda kulipia</button>`; }
    t--;
  },1000);
}

window.onload = ()=>{
  render();
  const s = el('#searchInput'); if(s) s.addEventListener('input', e=>{ /* implement search */});
}