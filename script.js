// --- CONFIGURAZIONE ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxa-dWWpQVxE437Z0ECjvjYZqec57rG38jCP6UGDVz4NDmxLEnFL76F-If0-lCKDxefRw/exec"; 
const PIN_SEGRETO = "1234"; 

// Variabili di stato per la rotazione (Indispensabili!)
let elencoNews = [];
let meteoP1 = "", meteoP2 = "";
let indiceNews = 0;
let modoMeteoAttivo = "p1"; 

function init() {
    checkLogin();
    aggiornaDataOra();
    ricaricaDati(); 

    // Attiva News e Meteo solo su Monitor
    if (window.innerWidth > 768) {
        caricaNewsRss(); 
        aggiornaMeteo();
        
        // Timer rotazione News (8 secondi)
        setInterval(ruotaNews, 8000);
        // Timer rotazione Meteo nel footer (10 secondi)
        setInterval(ruotaCircolariMeteo, 10000);
        
        setInterval(aggiornaMeteo, 1800000); // Meteo si aggiorna ogni 30 min
    }

    setInterval(aggiornaDataOra, 1000);
    setInterval(ricaricaDati, 60000);
}

// --- LOGICA NEWS RSS ---
async function caricaNewsRss() {
    const proxy = "https://corsproxy.io/?";
    const feed = 'https://www.ansa.it/sito/ansait_rss.xml';
    try {
        const r = await fetch(proxy + encodeURIComponent(feed));
        const xml = new DOMParser().parseFromString(await r.text(), "text/xml");
        elencoNews = [];
        xml.querySelectorAll("item").forEach((it, i) => { 
            if(i < 10) elencoNews.push({t: it.querySelector("title").textContent.toUpperCase()}); 
        });
        ruotaNews(); // Mostra la prima news subito
    } catch(e) { console.error("Errore News:", e); }
}

function ruotaNews() {
    const aN = document.getElementById('fadeNews');
    if(elencoNews.length > 0 && aN) {
        aN.classList.remove('show');
        setTimeout(() => {
            aN.innerHTML = `<span>${elencoNews[indiceNews].t}</span>`;
            aN.classList.add('show');
            indiceNews = (indiceNews + 1) % elencoNews.length;
        }, 1000);
    }
}

// --- LOGICA METEO ---
async function aggiornaMeteo() {
    try {
        // Coordinate per Buccari (Cagliari/Sardegna) - Se serve Roma metti lat=41.73&long=12.27
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=39.22&longitude=9.12&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`);
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
        
        ruotaCircolariMeteo(); // Avvia subito il primo frame
    } catch(e) {}
}

function ruotaCircolariMeteo() {
    const aC = document.getElementById('fadeCircolari');
    const labelC = document.getElementById('labelCircolari');
    if (!aC || !meteoP1) return;

    aC.classList.remove('show');
    setTimeout(() => {
        if (modoMeteoAttivo === "p1") {
            labelC.innerText = "🌤️ PREVISIONI (1/2)";
            aC.innerHTML = meteoP1;
            modoMeteoAttivo = "p2";
        } else {
            labelC.innerText = "🌤️ PREVISIONI (2/2)";
            aC.innerHTML = meteoP2;
            modoMeteoAttivo = "p1";
        }
        aC.classList.add('show');
    }, 1000);
}

function getMeteoIcon(code) {
    const icone = { 0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️", 45: "🌫️", 48: "🌫️", 51: "🌦️", 61: "🌧️", 63: "🌧️", 71: "🌨️", 80: "🌦️", 95: "⛈️" };
    return icone[code] || "☀️";
}

// --- RESTO DEL CODICE (Sostituzioni & PIN) ---

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
        alert("PIN Errato!");
    }
}

async function ricaricaDati() {
    const dot = document.getElementById('statusDot');
    if(dot) dot.classList.add('dot-active');
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getSubstitutions&date=${new Date().toISOString().split('T')[0]}`);
        const dati = await response.json();
        costruisciTabella(dati);
    } catch (e) { console.error(e); }
    finally { if(dot) setTimeout(() => dot.classList.remove('dot-active'), 1500); }
}

function costruisciTabella(dati) {
    const scroller = document.getElementById('scroller-content');
    dati.sort((a, b) => a.ora - b.ora);
    let html = dati.map(riga => `
        <div class="table-row">
            <div class="data-ora">${riga.ora}°</div>
            <div class="data-classe">${String(riga.classe).toUpperCase()}</div>
            <div class="data-aula">${String(riga.aula).toUpperCase()}</div>
            <div class="data-sostituto">${String(riga.sostituto).toUpperCase()}</div>
            <div class="data-info">${riga.compresenza === "SI" ? '<span class="tag tag-compresenza">COMPRESENZA</span>' : ''}</div>
        </div>`).join('');

    if (window.innerWidth <= 768) {
        scroller.innerHTML = html;
        scroller.style.animation = "none";
    } else {
        const sep = `<div class="table-row" style="height:120px; justify-content:center; opacity:0.4; grid-column:1/-1;">--- FINE ELENCO ---</div>`;
        scroller.innerHTML = html + sep + html + sep;
        scroller.style.animation = `infiniteScroll ${Math.max(20, dati.length * 5)}s linear infinite`;
    }
}

function aggiornaDataOra() {
    const now = new Date();
    document.getElementById('dataOra').innerHTML = now.toLocaleDateString('it-IT', {weekday:'short', day:'2-digit', month:'short'}).toUpperCase() + " | " + now.toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});
}
function attivaFullScreen() { if(document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); }

window.onload = init;
