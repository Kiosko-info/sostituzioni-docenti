// --- CONFIGURAZIONE ---
// INSERISCI QUI IL TUO NUOVO URL APPS SCRIPT
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxa-dWWpQVxE437Z0ECjvjYZqec57rG38jCP6UGDVz4NDmxLEnFL76F-If0-lCKDxefRw/exec"; 

let ultimoContenuto = "";
let elencoNews = [], elencoCircolari = [];
let meteoP1 = "", meteoP2 = "", indiceNews = 0, indiceCirc = 0, modoMeteoAttivo = false;

function attivaFullScreen() { if(document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); }

function aggiornaDataOra() {
    const now = new Date();
    const dataStr = now.toLocaleDateString('it-IT', {weekday:'short', day:'2-digit', month:'short'}).toUpperCase();
    const oraStr = now.toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});
    document.getElementById('dataOra').innerHTML = `${dataStr} | ${oraStr}`;
}

async function ricaricaDati() {
    const dot = document.getElementById('statusDot');
    dot.classList.add('dot-active');
    try {
        const dataOggi = new Date().toISOString().split('T')[0]; 
        const response = await fetch(`${SCRIPT_URL}?action=getSubstitutions&date=${dataOggi}`);
        const dati = await response.json();
        
        if (!dati || dati.length === 0) {
            document.getElementById('scroller-content').innerHTML = "<div style='text-align:center; padding:100px; font-size:2rem; font-weight:700; opacity:0.5;'>📭 NESSUNA SOSTITUZIONE PER OGGI</div>";
            document.getElementById('giornoSostituzioni').innerText = "NESSUNA VARIAZIONE";
            return;
        }

        const dataBella = new Date().toLocaleDateString('it-IT', {weekday:'long', day:'numeric', month:'long'}).toUpperCase();
        document.getElementById('giornoSostituzioni').innerText = `SITUAZIONE DEL ${dataBella}`;

        const contenutoStringa = JSON.stringify(dati);
        if (contenutoStringa !== ultimoContenuto) {
            ultimoContenuto = contenutoStringa;
            costruisciTabella(dati);
        }
    } catch (e) { 
        console.error("Errore caricamento:", e); 
        document.getElementById('giornoSostituzioni').innerText = "ERRORE CONNESSIONE";
    }
    finally { setTimeout(() => { dot.classList.remove('dot-active'); }, 1500); }
}

// --- RENDERING TABELLA A 5 COLONNE ---
function costruisciTabella(dati) {
    const scroller = document.getElementById('scroller-content');
    dati.sort((a, b) => a.ora - b.ora);

    let rowsHtml = "";
    dati.forEach(riga => {
        // Creazione Etichetta per la 5° colonna
        let tagHtml = "";
        
        if (riga.compresenza === "SI") {
            tagHtml = `<span class="tag tag-compresenza">COMPRESENZA</span>`;
        } else if (riga.doc_assente === "VIGILANZA RELIGIONE") {
            tagHtml = `<span class="tag tag-vigilanza">VIGILANZA</span>`;
        } else {
            // Se vuoi mettere qualcos'altro in caso di sostituzione normale, fallo qui
            // Altrimenti lasciamo vuoto o mettiamo un trattino
            tagHtml = ""; 
        }

        rowsHtml += `
            <div class="table-row row">
                <div class="data-ora">${riga.ora}°</div>
                <div class="data-classe">${String(riga.classe).toUpperCase()}</div>
                <div class="data-aula">${String(riga.aula).toUpperCase()}</div>
                <div class="data-sostituto">${String(riga.sostituto).toUpperCase()}</div>
                <div class="data-info">${tagHtml}</div>
            </div>`;
    });

    const separator = `<div class="table-row" style="height:120px; display:flex; align-items:center; justify-content:center; color:var(--apple-blue); font-weight:800; opacity:0.4; grid-column: 1 / -1; border-bottom:2px dashed var(--apple-blue);">--- RICOMINCIA ELENCO ---</div>`;
    scroller.innerHTML = rowsHtml + separator + rowsHtml + separator;
    
    const durata = (dati.length * 4) < 20 ? 20 : (dati.length * 5);
    scroller.style.animation = `infiniteScroll ${durata}s linear infinite`;
}

// --- FUNZIONI METEO/NEWS INVARIATE ---
function getMeteoIcon(code) { const icone = { 0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️", 45: "🌫️", 48: "🌫️", 51: "🌦️", 61: "🌧️", 63: "🌧️", 71: "🌨️", 80: "🌦️", 95: "⛈️" }; return icone[code] || "☀️"; }
async function aggiornaMeteo() {
    try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=41.9028&longitude=12.4964&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`);
        const data = await r.json();
        document.getElementById('meteoIcon').innerHTML = getMeteoIcon(data.current_weather.weathercode);
        document.getElementById('temp').innerText = Math.round(data.current_weather.temperature) + "°C";
        const giorniSett = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
        let prev = [];
        for(let i=0; i<7; i++) {
            const d = new Date(data.daily.time[i]);
            prev.push({ g: giorniSett[d.getDay()].toUpperCase(), dt: `${d.getDate()}/${d.getMonth()+1}`, ico: getMeteoIcon(data.daily.weathercode[i]), ma: Math.round(data.daily.temperature_2m_max[i]), mi: Math.round(data.daily.temperature_2m_min[i]) });
        }
        const renderG = (g) => `<div class="meteo-giorno"><div class="m-header"><span class="m-giorno-testo">${g.g}</span><span class="m-data-testo">${g.dt}</span></div><div class="m-icon">${g.ico}</div><div class="m-temps"><span class="temp-max">${g.ma}°</span><span class="temp-min">${g.mi}°</span></div></div>`;
        meteoP1 = `<div class="meteo-settimana">${prev.slice(0, 4).map(g => renderG(g)).join('')}</div>`;
        meteoP2 = `<div class="meteo-settimana">${prev.slice(4, 7).map(g => renderG(g)).join('')}</div>`;
    } catch(e) {}
}
async function caricaNewsRss() {
    const proxy = "https://corsproxy.io/?";
    const feeds = [{n:'Ansa', u:'https://www.ansa.it/sito/ansait_rss.xml'}];
    elencoNews = [];
    for(let f of feeds) {
        try {
            const r = await fetch(proxy + encodeURIComponent(f.u));
            const xml = new DOMParser().parseFromString(await r.text(), "text/xml");
            xml.querySelectorAll("item").forEach((it, i) => { if(i < 5) elencoNews.push({f: f.n, t: it.querySelector("title").textContent.toUpperCase()}); });
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
            labelN.innerHTML = `🌍 News <span style="font-size:0.7rem; color:var(--apple-blue); border:1px solid var(--apple-blue); padding:2px 8px; border-radius:6px; margin-left:10px; font-weight:800;">${n.f.toUpperCase()}</span>`;
            aN.innerHTML = `<span>${n.t}</span>`;
            aN.classList.add('show');
            indiceNews = (indiceNews + 1) % elencoNews.length;
        }, 1000);
    }
}
async function caricaFeed() { elencoCircolari = []; }
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
            modoMeteoAttivo = "p1"; ruotaCircolariMeteo();
        }
    }, 1000);
}

aggiornaDataOra(); ricaricaDati(); caricaNewsRss(); aggiornaMeteo();
setInterval(aggiornaDataOra, 1000);
setInterval(ricaricaDati, 60000);
setInterval(ruotaNews, 8000);
setInterval(aggiornaMeteo, 1800000);
setTimeout(ruotaCircolariMeteo, 5000);