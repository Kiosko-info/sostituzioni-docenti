// --- CONFIGURAZIONE ---
const SCRIPT_URL = "INSERISCI_QUI_IL_TUO_URL_APPS_SCRIPT"; 
const PIN_SEGRETO = "1234"; 

let ultimoContenuto = "";
let elencoNews = [], elencoCircolari = [];
let meteoP1 = "", meteoP2 = "", indiceNews = 0, indiceCirc = 0, modoMeteoAttivo = false;
let modoVisualizzazione = "oggi"; // "oggi" o "future"

function init() {
    checkLogin();
    aggiornaDataOra();
    
    // Carica preferenza docente
    const savedName = localStorage.getItem("docentePreferito");
    if (savedName) {
        document.getElementById('cercaDocente').value = savedName;
        document.getElementById('msgFiltro').style.display = "block";
        document.getElementById('nomeSalvato').innerText = savedName;
    }

    ricaricaDati(); 
    caricaNewsRss(); 
    aggiornaMeteo();

    setInterval(aggiornaDataOra, 1000);
    setInterval(ricaricaDati, 60000);
    setInterval(ruotaNews, 8000);
    setInterval(aggiornaMeteo, 1800000);
    setTimeout(ruotaCircolariMeteo, 5000);
}

// --- GESTIONE LOGIN ---
function checkLogin() {
    if (window.innerWidth > 768) return; 
    const isLogged = sessionStorage.getItem("monitor_logged");
    if (isLogged !== "true") {
        document.getElementById('overlay-login').style.display = "flex";
    }
}

function verificaPin() {
    const input = document.getElementById('inputPin').value;
    if (input === PIN_SEGRETO) {
        sessionStorage.setItem("monitor_logged", "true");
        document.getElementById('overlay-login').style.display = "none";
        filtraPerDocente(); 
    } else {
        document.getElementById('msgErrore').style.display = "block";
        document.getElementById('inputPin').value = "";
    }
}

// --- GESTIONE PREFERENZE ---
function salvaPreferenza() {
    const nome = document.getElementById('cercaDocente').value.trim();
    if (nome) {
        localStorage.setItem("docentePreferito", nome);
        alert(`Preferenza salvata per: ${nome}`);
        document.getElementById('msgFiltro').style.display = "block";
        document.getElementById('nomeSalvato').innerText = nome;
        filtraPerDocente();
    } else {
        localStorage.removeItem("docentePreferito");
        alert("Preferenza rimossa.");
        document.getElementById('msgFiltro').style.display = "none";
        filtraPerDocente();
    }
}

function filtraPerDocente() {
    if (window.innerWidth > 768) return; 

    const input = document.getElementById('cercaDocente').value.toUpperCase();
    const righe = document.querySelectorAll('.table-row.row'); 
    
    righe.forEach(riga => {
        const sostTxt = riga.querySelector('.data-sostituto').innerText.toUpperCase();
        if (input === "" || sostTxt.includes(input)) {
            riga.style.display = "flex"; 
        } else {
            riga.style.display = "none";
        }
    });
}

async function cambiaModo(modo) {
    modoVisualizzazione = modo;
    document.getElementById('btnOggi').classList.toggle('active', modo === 'oggi');
    document.getElementById('btnFuture').classList.toggle('active', modo === 'future');
    document.getElementById('scroller-content').innerHTML = "<div style='text-align:center; padding:20px;'>Caricamento dati...</div>";
    await ricaricaDati();
}

// --- DATI & INTERFACCIA ---
function attivaFullScreen() { if(document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); }

function aggiornaDataOra() {
    const now = new Date();
    document.getElementById('dataOra').innerHTML = now.toLocaleDateString('it-IT', {weekday:'short', day:'2-digit', month:'short'}).toUpperCase() + " | " + now.toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});
}

async function ricaricaDati() {
    const dot = document.getElementById('statusDot');
    if(dot) dot.classList.add('dot-active');

    try {
        let url = "";
        const dataOggi = new Date().toISOString().split('T')[0];
        
        if (modoVisualizzazione === "future") {
            url = `${SCRIPT_URL}?action=getSubstitutions&future=true`;
            document.getElementById('giornoSostituzioni').innerText = "SOSTITUZIONI PROGRAMMATE";
        } else {
            url = `${SCRIPT_URL}?action=getSubstitutions&date=${dataOggi}`;
            const dataBella = new Date().toLocaleDateString('it-IT', {weekday:'long', day:'numeric', month:'long'}).toUpperCase();
            document.getElementById('giornoSostituzioni').innerText = `SITUAZIONE DEL ${dataBella}`;
        }

        const response = await fetch(url);
        const dati = await response.json();

        if (!dati || dati.length === 0) {
            document.getElementById('scroller-content').innerHTML = "<div style='text-align:center; padding:50px; opacity:0.6;'>NESSUNA SOSTITUZIONE TROVATA</div>";
        } else {
            costruisciTabella(dati);
        }
        
        if (window.innerWidth <= 768) filtraPerDocente();

    } catch (e) {
        console.error("Errore:", e);
    } finally {
        if(dot) setTimeout(() => { dot.classList.remove('dot-active'); }, 1500);
    }
}

// --- FUNZIONE TOGGLE PER DATE FUTURE (FISARMONICA) ---
function toggleDate(dateId) {
    const group = document.getElementById(dateId);
    const header = document.getElementById("header-" + dateId);
    
    if (group.classList.contains("hidden")) {
        group.classList.remove("hidden");
        header.classList.remove("collapsed");
    } else {
        group.classList.add("hidden");
        header.classList.add("collapsed");
    }
}

function costruisciTabella(dati) {
    const scroller = document.getElementById('scroller-content');
    
    // Ordinamento
    dati.sort((a, b) => a.ora - b.ora);

    // SE SIAMO SU MOBILE, USIAMO LA LOGICA A GRUPPI (FISARMONICA)
    if (window.innerWidth <= 768 && modoVisualizzazione === "future") {
        scroller.style.animation = "none";
        
        // Raggruppa i dati per data
        const gruppi = {};
        dati.forEach(riga => {
            if (!gruppi[riga.data]) gruppi[riga.data] = [];
            gruppi[riga.data].push(riga);
        });

        let htmlMobile = "";
        // Per ogni data crea un gruppo
        for (const [data, righe] of Object.entries(gruppi)) {
            // Crea ID univoco (togliendo spazi e slash)
            const safeId = "group-" + data.replace(/[^a-zA-Z0-9]/g, "");
            
            // Intestazione Cliccabile
            htmlMobile += `<div id="header-${safeId}" class="date-divider" onclick="toggleDate('${safeId}')">📅 ${data}</div>`;
            
            // Contenitore Righe
            htmlMobile += `<div id="${safeId}" class="day-group">`;
            
            righe.forEach(riga => {
                let tagHtml = "";
                if (riga.compresenza === "SI") tagHtml = `<span class="tag tag-compresenza">COMPRESENZA</span>`;
                else if (riga.doc_assente === "VIGILANZA RELIGIONE") tagHtml = `<span class="tag tag-vigilanza">VIGILANZA</span>`;

                htmlMobile += `
                    <div class="table-row row">
                        <div class="data-ora">${riga.ora}°</div>
                        <div class="data-classe">${String(riga.classe).toUpperCase()}</div>
                        <div class="data-aula">${String(riga.aula).toUpperCase()}</div>
                        <div class="data-sostituto">${String(riga.sostituto).toUpperCase()}</div>
                        <div class="data-info">${tagHtml}</div>
                    </div>`;
            });
            
            htmlMobile += `</div>`; // Chiude gruppo
        }
        
        scroller.innerHTML = htmlMobile;
        return; // Esci, abbiamo finito per il mobile
    }

    // --- LOGICA STANDARD (PC / MOBILE OGGI) ---
    let html = "";
    dati.forEach(riga => {
        let tagHtml = "";
        if (riga.compresenza === "SI") tagHtml = `<span class="tag tag-compresenza">COMPRESENZA</span>`;
        else if (riga.doc_assente === "VIGILANZA RELIGIONE") tagHtml = `<span class="tag tag-vigilanza">VIGILANZA</span>`;

        html += `
            <div class="table-row row">
                <div class="data-ora">${riga.ora}°</div>
                <div class="data-classe">${String(riga.classe).toUpperCase()}</div>
                <div class="data-aula">${String(riga.aula).toUpperCase()}</div>
                <div class="data-sostituto">${String(riga.sostituto).toUpperCase()}</div>
                <div class="data-info">${tagHtml}</div>
            </div>`;
    });

    if (window.innerWidth <= 768) {
        scroller.innerHTML = html;
        scroller.style.animation = "none";
    } else {
        const separator = `<div class="table-row" style="height:120px; display:flex; align-items:center; justify-content:center; color:var(--apple-blue); font-weight:800; opacity:0.4; grid-column: 1 / -1; border-bottom:2px dashed var(--apple-blue);">--- RICOMINCIA ELENCO ---</div>`;
        scroller.innerHTML = html + separator + html + separator;
        const durata = Math.max(20, dati.length * 5);
        scroller.style.animation = `infiniteScroll ${durata}s linear infinite`;
    }
}

// METEO E NEWS (INVARIATI)
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

window.onload = init;
