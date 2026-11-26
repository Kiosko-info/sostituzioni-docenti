// --- CONFIGURAZIONE ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxa-dWWpQVxE437Z0ECjvjYZqec57rG38jCP6UGDVz4NDmxLEnFL76F-If0-lCKDxefRw/exec"; 
const PIN_SEGRETO = "1234"; 

let elencoNews = [];
let meteoP1 = "", meteoP2 = "";
let indiceNews = 0;
let modoMeteoAttivo = "p1"; 

function isDispositivoMobile() {
    return window.innerWidth <= 900 || ('ontouchstart' in window && window.innerWidth < 1100);
}

function init() {
    checkLogin();
    aggiornaDataOra();
    ricaricaDati(); 

    // Meteo, News e Circolari vengono caricati SOLO su monitor desktop
    if (!isDispositivoMobile()) {
        caricaNewsRss(); 
        aggiornaMeteo();
        
        setInterval(ruotaNews, 8000);
        setTimeout(ruotaCircolariMeteo, 5000);
        setInterval(aggiornaMeteo, 1800000);
    }

    setInterval(aggiornaDataOra, 1000);
    setInterval(ricaricaDati, 60000);
}

// --- NEWS LOGIC ---
async function caricaNewsRss() {
    const proxy = "https://corsproxy.io/?";
    const feeds = [{n:'Ansa', u:'https://www.ansa.it/sito/ansait_rss.xml'}];
    elencoNews = [];
    for(let f of feeds) {
        try {
            const r = await fetch(proxy + encodeURIComponent(f.u));
            const xml = new DOMParser().parseFromString(await r.text(), "text/xml");
            xml.querySelectorAll("item").forEach((it, i) => { 
                if(i < 8) elencoNews.push({f: f.n, t: it.querySelector("title").textContent.toUpperCase()}); 
            });
        } catch(e) {}
    }
}

function ruotaNews() {
    const aN = document.getElementById('fadeNews');
    const labelN = document.getElementById('labelNews');
    if(elencoNews.length && aN) {
        aN.classList.remove('show');
        setTimeout(() => {
            const n = elencoNews[indiceNews];
            if(labelN) labelN.innerHTML = `🌍 News <span style="font-size:0.7rem; color:var(--accent); border:1px solid var(--accent); padding:2px 8px; border-radius:6px; margin-left:10px; font-weight:800;">${n.f.toUpperCase()}</span>`;
            aN.innerHTML = `<span>${n.t}</span>`;
            aN.classList.add('show');
            indiceNews = (indiceNews + 1) % elencoNews.length;
        }, 1000);
    }
}

// --- METEO LOGIC ---
function getMeteoIcon(code) { 
    const icone = { 0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️", 45: "🌫️", 48: "🌫️", 51: "🌦️", 61: "🌧️", 63: "🌧️", 71: "🌨️", 80: "🌦️", 95: "⛈️" }; 
    return icone[code] || "☀️"; 
}

async function aggiornaMeteo() {
    try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=39.22&longitude=9.12&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`);
        const data = await r.json();
        document.getElementById('meteoIcon').innerHTML = getMeteoIcon(data.current_weather.weathercode);
        document.getElementById('temp').innerText = Math.round(data.current_weather.temperature) + "°C";
        
        const giorniSett = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
        let prev = [];
        for(let i=0; i<7; i++) {
            const d = new Date(data.daily.time[i]);
            prev.push({ g: giorniSett[d.getDay()].toUpperCase(), dt: `${d.getDate()}/${d.getMonth()+1}`, ico: getMeteoIcon(data.daily.weathercode[i]), ma: Math.round(data.daily.temperature_2m_max[i]), mi: Math.round(data.daily.temperature_2m_min[i]) });
        }
        const renderG = (g) => `<div class="meteo-giorno"><div class="m-header"><span>${g.g}</span> <span>${g.dt}</span></div><div style="font-size:1.4rem">${g.ico}</div><div style="font-size:0.8rem; font-weight:900;">${g.ma}° <span style="color:var(--accent)">${g.mi}°</span></div></div>`;
        meteoP1 = `<div class="meteo-settimana">${prev.slice(0, 4).map(g => renderG(g)).join('')}</div>`;
        meteoP2 = `<div class="meteo-settimana">${prev.slice(4, 7).map(g => renderG(g)).join('')}</div>`;
    } catch(e) {}
}

function ruotaCircolariMeteo() {
    const aC = document.getElementById('fadeCircolari');
    const labelC = document.getElementById('labelCircolari');
    if (!aC) return;
    aC.classList.remove('show');
    setTimeout(() => {
        if (modoMeteoAttivo === "p1") {
            labelC.innerText = "🌤️ PREVISIONI (1/2)"; labelC.style.background = "#0ea5e9";
            aC.innerHTML = meteoP1 || "CARICAMENTO..."; aC.classList.add('show');
            setTimeout(() => { modoMeteoAttivo = "p2"; ruotaCircolariMeteo(); }, 10000);
        } else if (modoMeteoAttivo === "p2") {
            labelC.innerText = "🌤️ PREVISIONI (2/2)"; labelC.style.background = "#0ea5e9";
            aC.innerHTML = meteoP2 || "CARICAMENTO..."; aC.classList.add('show');
            setTimeout(() => { modoMeteoAttivo = "p1"; ruotaCircolariMeteo(); }, 10000);
        } else {
            modoMeteoAttivo = "p1"; ruotaCircolariMeteo();
        }
    }, 1000);
}

// --- SOSTITUZIONI & TABELLA ---
async function ricaricaDati() {
    const dot = document.getElementById('statusDot');
    if(dot) dot.classList.add('dot-active');
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getSubstitutions&date=${new Date().toISOString().split('T')[0]}`);
        const dati = await response.json();
        const dataBella = new Date().toLocaleDateString('it-IT', {weekday:'long', day:'numeric', month:'long'}).toUpperCase();
        document.getElementById('giornoSostituzioni').innerText = `SITUAZIONE DEL ${dataBella}`;
        costruisciTabella(dati);
    } catch (e) { console.error(e); }
    finally { if(dot) setTimeout(() => dot.classList.remove('dot-active'), 1500); }
}

function costruisciTabella(dati) {
    const scroller = document.getElementById('scroller-content');
    dati.sort((a, b) => a.ora - b.ora);
    
    let html = dati.map(riga => {
        const assente = String(riga.docente_assente || "").toUpperCase();
        const isVigilanza = assente === "VIGILANZA RELIGIONE";
        const isDisposizione = riga.compresenza === "SI";
        
        let badgeInfo = "";
        if (isDisposizione) {
            badgeInfo = '<span class="tag tag-compresenza">DISPOSIZIONE / COMPRESENZA</span>';
        } else if (isVigilanza) {
            badgeInfo = '<span class="tag tag-vigilanza">VIGILANZA</span>';
        }
        
        return `
        <div class="table-row">
            <div class="data-ora">${riga.ora}° ORA</div>
            <div class="data-classe">${String(riga.classe).toUpperCase()}</div>
            <div class="data-aula">${String(riga.aula).toUpperCase()}</div>
            <div class="data-assente">${isVigilanza ? "" : assente}</div>
            <div class="data-sostituto">${String(riga.sostituto || "").toUpperCase()}</div>
            <div class="data-info">${badgeInfo}</div>
        </div>`;
    }).join('');

    if (isDispositivoMobile()) {
        scroller.innerHTML = html;
        scroller.style.animation = "none";
    } else {
        const sep = `<div class="table-row row-separator">--- RICOMINCIA ELENCO ---</div>`;
        scroller.innerHTML = html + sep + html + sep;
        scroller.style.animation = `infiniteScroll ${Math.max(20, dati.length * 6)}s linear infinite`;
    }
}

// --- STANDARD ---
function checkLogin() {
    if (!isDispositivoMobile()) return;
    if (sessionStorage.getItem("monitor_logged") !== "true") document.getElementById('overlay-login').style.display = "flex";
}
function verificaPin() {
    if (document.getElementById('inputPin').value === PIN_SEGRETO) {
        sessionStorage.setItem("monitor_logged", "true");
        document.getElementById('overlay-login').style.display = "none";
    } else { document.getElementById('msgErrore').style.display = "block"; }
}
function aggiornaDataOra() {
    const now = new Date();
    document.getElementById('dataOra').innerHTML = now.toLocaleDateString('it-IT', {weekday:'short', day:'2-digit', month:'short'}).toUpperCase() + " | " + now.toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});
}
function attivaFullScreen() { 
    if(!isDispositivoMobile() && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {}); 
    }
}
window.onload = init;