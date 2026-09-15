// --- CONFIGURAZIONE ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxa-dWWpQVxE437Z0ECjvjYZqec57rG38jCP6UGDVz4NDmxLEnFL76F-If0-lCKDxefRw/exec"; 
const PIN_SEGRETO = "1234"; 

// --- VARIABILI GLOBALI ---
let elencoNews = [];
let meteoP1 = "", meteoP2 = "";
let indiceNews = 0;
let modoMeteoAttivo = "p1"; 

// Feed RSS Circolari
const LINK_CIRCOLARI = "https://www.buccarimarconi.edu.it/circolare/feed/";
let elencoCircolari = [];
let indiceCircolare = 0;

// --- GESTORE TIMEOUT RETE PER EVITARE BLOCCHI SU MOBILE ---
async function fetchConTimeout(url, ms = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (e) {
        clearTimeout(id);
        throw e;
    }
}

function init() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(err => console.error("SW Errore:", err));
    }

    aggiornaDataOra();

    // SU MOBILE: Mostra subito l'interfaccia e carica i dati solo se autenticato
    if (window.innerWidth <= 768) {
        if (sessionStorage.getItem("monitor_logged") === "true") {
            ricaricaDati();
        } else {
            document.getElementById('overlay-login').style.display = "flex";
        }
    } else {
        // SU MONITOR PC: Avvio standard
        ricaricaDati();
        caricaNewsRss(); 
        caricaCircolari();
        aggiornaMeteo();
        
        setInterval(ruotaNews, 8000);             
        setTimeout(ruotaCircolariMeteo, 5000);    
        setInterval(aggiornaMeteo, 1800000); // Meteo ogni 30 min      
        setInterval(caricaCircolari, 3600000); // Circolari ogni ora
    }

    // Aggiornamenti comuni
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
        const r = await fetchConTimeout(`https://api.open-meteo.com/v1/forecast?latitude=39.2238&longitude=9.1217&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`, 5000);
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

// --- CIRCOLARI & ROTAZIONE METEO ---
async function caricaCircolari() {
    try {
        const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(LINK_CIRCOLARI)}`;
        const r = await fetchConTimeout(url, 5000);
        const data = await r.json();
        
        elencoCircolari = [];
        if(data.status === 'ok') {
            data.items.slice(0, 5).forEach(it => {
                elencoCircolari.push(it.title.toUpperCase().trim());
            });
        }
    } catch(e) { 
        console.error("Errore Circolari:", e); 
        elencoCircolari = ["VEDI SITO WEB PER CIRCOLARI RECENTI"];
    }
}

function ruotaCircolariMeteo() {
    const aC = document.getElementById('fadeCircolari');
    const labelC = document.getElementById('labelCircolari');
    if (!aC) return;

    aC.classList.remove('show');
    setTimeout(() => {
        if (modoMeteoAttivo === "p1") {
            labelC.innerText = "🌤️ METEO (1/2)";
            labelC.style.background = "#0ea5e9";
            aC.innerHTML = meteoP1 || "CARICAMENTO...";
            aC.classList.add('show');
            setTimeout(() => { modoMeteoAttivo = "p2"; ruotaCircolariMeteo(); }, 10000);
        } else if (modoMeteoAttivo === "p2") {
            labelC.innerText = "🌤️ METEO (2/2)";
            labelC.style.background = "#0ea5e9";
            aC.innerHTML = meteoP2 || "CARICAMENTO...";
            aC.classList.add('show');
            setTimeout(() => { modoMeteoAttivo = "circolari"; ruotaCircolariMeteo(); }, 10000);
        } else {
            labelC.innerText = "📢 CIRCOLARI";
            labelC.style.background = "#6366f1";
            
            const testo = elencoCircolari.length > 0 ? elencoCircolari[indiceCircolare] : "CARICAMENTO...";
            aC.innerHTML = `<span style="font-weight:700;">${testo}</span>`;
            aC.classList.add('show');
            
            indiceCircolare = (indiceCircolare + 1) % (elencoCircolari.length || 1);
            
            if (indiceCircolare === 0) {
                setTimeout(() => { modoMeteoAttivo = "p1"; ruotaCircolariMeteo(); }, 10000);
            } else {
                setTimeout(ruotaCircolariMeteo, 10000);
            }
        }
    }, 1000);
}

// --- NEWS LOGIC ---
async function caricaNewsRss() {
    const feeds = [
        {n:'Ansa', u:'https://www.ansa.it/sito/ansait_rss.xml'},
        {n:'Sole 24 Ore', u:'https://www.ilsole24ore.com/rss/italia.xml'}
    ];
    
    elencoNews = [];
    for(let f of feeds) {
        try {
            const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(f.u)}`;
            const r = await fetchConTimeout(url, 5000);
            const data = await r.json();
            
            if(data.status === 'ok') {
                data.items.slice(0, 8).forEach(it => {
                    elencoNews.push({f: f.n, t: it.title.toUpperCase().trim()});
                });
            }
        } catch(e) { console.error("Errore News:", f.n, e); }
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

// --- GESTIONE DATI & TABELLA ---
async function ricaricaDati() {
    const dot = document.getElementById('statusDot');
    if(dot) dot.classList.add('dot-active');
    try {
        const oggi = new Date();
        const isoData = oggi.getFullYear() + '-' + String(oggi.getMonth() + 1).padStart(2, '0') + '-' + String(oggi.getDate()).padStart(2, '0');
        const url = `${SCRIPT_URL}?action=getSubstitutions&date=${isoData}`;
        
        // Timeout massimo di 8 secondi per sbloccare la rete se Google tentenna
        const response = await fetchConTimeout(url, 8000);
        const dati = await response.json();
        
        const dataBella = oggi.toLocaleDateString('it-IT', {weekday:'long', day:'numeric', month:'long'}).toUpperCase();
        document.getElementById('giornoSostituzioni').innerText = `SITUAZIONE DEL ${dataBella}`;

        costruisciTabella(dati);
    } catch (e) { 
        console.error("Errore caricamento dati:", e); 
        const scroller = document.getElementById('scroller-content');
        if (scroller && !scroller.innerHTML.trim()) {
            scroller.innerHTML = '<div style="padding:20px; text-align:center; color:#ff4d4d; font-weight:bold;">Connessione lenta o assente. Riprova più tardi.</div>';
        }
    }
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
        // Scarica i dati SOLO dopo l'inserimento corretto del PIN
        ricaricaDati();
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
