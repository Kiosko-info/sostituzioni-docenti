// --- CONFIGURAZIONE ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxa-dWWpQVxE437Z0ECjvjYZqec57rG38jCP6UGDVz4NDmxLEnFL76F-If0-lCKDxefRw/exec"; 
const PIN_SEGRETO = "1234"; 

// VARIABILI GLOBALI
let elencoNews = [];
let meteoP1 = "", meteoP2 = "";
let indiceNews = 0;
let modoMeteoAttivo = "p1"; 

function init() {
    checkLogin();
    aggiornaDataOra();
    ricaricaDati(); 

    if (window.innerWidth > 768) {
        caricaNewsRss(); 
        aggiornaMeteo();
        
        setInterval(ruotaNews, 8000);             
        setTimeout(ruotaCircolariMeteo, 5000);    
        setInterval(aggiornaMeteo, 1800000);      
    }

    setInterval(aggiornaDataOra, 1000);
    setInterval(ricaricaDati, 60000);
}

// --- FUNZIONI METEO ---
function getMeteoIcon(code) { 
    const icone = { 0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️", 45: "🌫️", 48: "🌫️", 51: "🌦️", 61: "🌧️", 63: "🌧️", 71: "🌨️", 80: "🌦️", 95: "⛈️" }; 
    return icone[code] || "☀️"; 
}

async function aggiornaMeteo() {
    try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=39.2238&longitude=9.1217&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`);
        const data = await r.json();
        
        document.getElementById('meteoIcon').innerHTML = getMeteoIcon(data.current_weather.weathercode);
        document.getElementById('temp').innerText = Math.round(data.current_weather.temperature) + "°C";
        
        const giorniSett = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
        let prev = [];
        for(let i=0; i<7; i++) {
            const d = new Date(data.daily.time[i]);
            prev.push({ 
                g: giorniSett[d.getDay()].toUpperCase(), 
                dt: `${d.getDate()}/${d.getMonth()+1}`, 
                ico: getMeteoIcon(data.daily.weathercode[i]), 
                ma: Math.round(data.daily.temperature_2m_max[i]), 
                mi: Math.round(data.daily.temperature_2m_min[i]) 
            });
        }
        
        const renderG = (g) => `<div class="meteo-giorno"><div class="m-header"><span class="m-giorno-testo">${g.g}</span><span class="m-data-testo">${g.dt}</span></div><div class="m-icon">${g.ico}</div><div class="m-temps"><span class="temp-max">${g.ma}°</span><span class="temp-min">${g.mi}°</span></div></div>`;
        
        meteoP1 = `<div class="meteo-settimana">${prev.slice(0, 4).map(g => renderG(g)).join('')}</div>`;
        meteoP2 = `<div class="meteo-settimana">${prev.slice(4, 7).map(g => renderG(g)).join('')}</div>`;
    } catch(e) { console.error("Errore meteo:", e); }
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
        } catch(e) { console.error("Errore news:", e); }
    }
}

function ruotaNews() {
    const aN = document.getElementById('fadeNews');
    const labelN = document.getElementById('labelNews');
    if(elencoNews.length && aN) {
        aN.classList.remove('show');
        setTimeout(() => {
            const n = elencoNews[indiceNews];
            if (labelN) labelN.innerHTML = `🌍 News <span style="font-size:0.7rem; color:var(--accent); border:1px solid var(--accent); padding:2px 8px; border-radius:6px; margin-left:10px; font-weight:800;">${n.f.toUpperCase()}</span>`;
            aN.innerHTML = `<span>${n.t}</span>`;
            aN.classList.add('show');
            indiceNews = (indiceNews + 1) % elencoNews.length;
        }, 1000);
    }
}

function ruotaCircolariMeteo() {
    const aC = document.getElementById('fadeCircolari');
    const labelC = document.getElementById('labelCircolari');
    if (!aC) return;

    aC.classList.remove('show');
    setTimeout(() => {
        if (modoMeteoAttivo === "p1") {
            labelC.innerText = "🌤️ PREVISIONI (1/2)"; labelC.style.background = "#0ea5e9";
            aC.innerHTML = meteoP1 || "Caricamento..."; aC.classList.add('show');
            setTimeout(() => { modoMeteoAttivo = "p2"; ruotaCircolariMeteo(); }, 10000);
        } else if (modoMeteoAttivo === "p2") {
            labelC.innerText = "🌤️ PREVISIONI (2/2)"; labelC.style.background = "#0ea5e9";
            aC.innerHTML = meteoP2 || "Caricamento..."; aC.classList.add('show');
            setTimeout(() => { modoMeteoAttivo = false; ruotaCircolariMeteo(); }, 10000);
        } else {
            modoMeteoAttivo = "p1"; 
            ruotaCircolariMeteo();
        }
    }, 1000);
}

// --- GESTIONE DATI & TABELLA ---
async function ricaricaDati() {
    const dot = document.getElementById('statusDot');
    if(dot) dot.classList.add('dot-active');
    try {
        const oggi = new Date();
        const isoData = oggi.getFullYear() + '-' + String(oggi.getMonth() + 1).padStart(2, '0') + '-' + String(oggi.getDate()).padStart(2, '0');
        const url = `${SCRIPT_URL}?action=getSubstitutions&date=${isoData}`;
        
        const response = await fetch(url);
        const dati = await response.json();
        
        const dataBella = oggi.toLocaleDateString('it-IT', {weekday:'long', day:'numeric', month:'long'}).toUpperCase();
        document.getElementById('giornoSostituzioni').innerText = `SITUAZIONE DEL ${dataBella}`;

        costruisciTabella(dati);
    } catch (e) { console.error("Errore caricamento:", e); }
    finally { if(dot) setTimeout(() => dot.classList.remove('dot-active'), 1500); }
}

function costruisciTabella(dati) {
    const scroller = document.getElementById('scroller-content');
    if (!scroller) return;

    dati.sort((a, b) => a.ora - b.ora);
    
    let html = dati.map(riga => {
        const isCompresenza = riga.compresenza === "SI" || riga.compresenza === true;
        const isVigilanza = riga.docente_assente === "VIGILANZA RELIGIONE";

        return `
        <div class="table-row">
            <div class="data-ora">${riga.ora}°</div>
            <div class="data-classe">${String(riga.classe).toUpperCase()}</div>
            <div class="data-aula">${String(riga.aula).toUpperCase()}</div>
            <div class="data-sostituto">
                ${String(riga.sostituto).toUpperCase()}
                ${isCompresenza ? '<br><span class="tag tag-compresenza" style="font-size:0.65rem; padding:2px 6px; margin-top:4px; display:inline-block; background: #f59e0b; color: #000; border-radius: 4px; font-weight: 800;">COMPRESENZA</span>' : ''}
            </div>
            <div class="data-info">
                ${isVigilanza ? '<span class="tag tag-vigilanza">VIGILANZA</span>' : ''}
            </div>
        </div>`;
    }).join('');

    if (window.innerWidth <= 768) {
        scroller.innerHTML = html || '<div style="padding:20px; text-align:center;">Nessuna sostituzione per oggi</div>';
        scroller.style.animation = "none";
        scroller.style.position = "relative";
        scroller.style.top = "0";
    } else {
        const sep = `<div class="table-row row-separator">--- RICOMINCIA ELENCO ---</div>`;
        scroller.innerHTML = html + sep + html + sep;
        scroller.style.animation = `infiniteScroll ${Math.max(20, dati.length * 6)}s linear infinite`;
    }
}

// --- LOGIN E UTILITY ---
function checkLogin() {
    if (window.innerWidth > 768) return;
    if (sessionStorage.getItem("monitor_logged") !== "true") {
        document.getElementById('overlay-login').style.display = "flex";
    }
}

function verificaPin() {
    if (document.getElementById('inputPin').value === PIN_SEGRETO) {
        sessionStorage.setItem("monitor_logged", "true");
        document.getElementById('overlay-login').style.display = "none";
    } else {
        document.getElementById('msgErrore').style.display = "block";
    }
}

function aggiornaDataOra() {
    const now = new Date();
    document.getElementById('dataOra').innerHTML = now.toLocaleDateString('it-IT', {weekday:'short', day:'2-digit', month:'short'}).toUpperCase() + " | " + now.toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});
}

function attivaFullScreen() { 
    if(window.innerWidth > 768 && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen(); 
    }
}

window.onload = init;




