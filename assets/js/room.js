(function(){
  const q = new URLSearchParams(location.search);
  const id = q.get("room");
  const $ = id => document.getElementById(id);

  /* ================= util: localStorage (persistencia por cuarto) ================= */
  const LS_KEY = id ? `anxHist:${id}` : null;

  function loadHistoryFromStorage(){
    if (!LS_KEY) return { light:[], aroma:[], door:[], vitals:[] };
    try{
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return { light:[], aroma:[], door:[], vitals:[] };
      const parsed = JSON.parse(raw);
      // sanea estructura por si hay claves faltantes
      return {
        light:  Array.isArray(parsed.light)  ? parsed.light  : [],
        aroma:  Array.isArray(parsed.aroma)  ? parsed.aroma  : [],
        door:   Array.isArray(parsed.door)   ? parsed.door   : [],
        vitals: Array.isArray(parsed.vitals) ? parsed.vitals : []
      };
    }catch(_){
      return { light:[], aroma:[], door:[], vitals:[] };
    }
  }
  function saveHistoryToStorage(){
    if (!LS_KEY) return;
    try{
      localStorage.setItem(LS_KEY, JSON.stringify(history));
    }catch(_){}
  }
  function clearHistoryStorage(){
    if (!LS_KEY) return;
    try{ localStorage.removeItem(LS_KEY); }catch(_){}
  }

  /* ================= pintado existente ================= */

  function paintDoorChip(state){
    const el = $("valDoor");
    if (!el) return;
    el.className = "door-chip " + (state==="abierto" ? "door-open" : "door-closed");
    el.textContent = state === "abierto" ? "abierta" : "cerrada";
  }

  function paintThresholds(hr,hrv,t,eda){
    if ($("thrHR")){
      $("thrHR").style.width  = Math.min(100, (hr-60)/0.6) + "%";
      $("thrHR").style.backgroundColor = hr>=90 ? "#dc3545" : hr>=80 ? "#ffc107" : "#28a745";
    }
    if ($("thrHRV")){
      $("thrHRV").style.width = Math.max(0, 100 - (hrv)) + "%";
      $("thrHRV").style.backgroundColor = hrv<=45 ? "#dc3545" : hrv<=55 ? "#ffc107" : "#28a745";
    }
    if ($("thrSkin")){
      $("thrSkin").style.width = Math.max(0, 100 - ((t-33)/3*100)) + "%";
      $("thrSkin").style.backgroundColor = t<=35.0 ? "#dc3545" : t<=35.5 ? "#ffc107" : "#28a745";
    }
    if ($("thrEDA")){
      $("thrEDA").style.width = Math.min(100, eda/8*100) + "%";
      $("thrEDA").style.backgroundColor = eda>=4.5 ? "#dc3545" : eda>=3.0 ? "#ffc107" : "#28a745";
    }
  }

  function hourBetween(h1,h2){ // [h1,h2)
    const now = new Date(); const h = now.getHours();
    return h>=h1 && h<h2;
  }

  function recommendations(room){
    const list = $("recoList"); 
    if (list) list.innerHTML = "";
    const push = t => { 
      if (!list) return;
      const li = document.createElement("li"); 
      li.className="list-group-item"; 
      li.textContent=t; 
      list.appendChild(li); 
    };

    if (room.anxietyScore >= 40){
      if ((room.tipLuz||"").toLowerCase()!=="calida") push("Cambiar luz a cálida.");
      if (!room.olores) push("Activar difusor con lavanda.");
      if (room.HR >= 90) push("Ejercicio de respiración 4-7-8 durante 1 minuto.");
      if (room.sudoracion >= 4.5) push("Ajustar temperatura / hidratación.");
    }else{
      push("Continuar monitoreo cada 15 minutos.");
    }

    // Política de salida saludable 16–18h
    const salidaHora = hourBetween(16,18);
    if (salidaHora && room.anxietyScore >= 40 && room.doorState === "cerrado"){
      push("Recomendación: salir a caminar 15 min (abrir puerta).");
      if ($("doorAdvice")) $("doorAdvice").textContent = "Es hora sugerida de salida (16–18 h) y el paciente tiene ansiedad moderada/alta.";
    }else{
      if ($("doorAdvice")) $("doorAdvice").textContent = "";
    }
  }

  function paintRoom(room){
    if ($("roomNumber")) $("roomNumber").textContent = room.cuarto ?? "—";
    if ($("valRoom")) $("valRoom").textContent = room.cuarto ?? "—";
    if ($("valNombre")) $("valNombre").textContent = room.nombrePaciente ?? "—";

    if ($("valHR")) $("valHR").textContent = room.HR ?? "—";
    if ($("valHRV")) $("valHRV").textContent = room.HRV ?? "—";
    if ($("valSkin")) $("valSkin").textContent = room.skinTemp ?? "—";
    if ($("valEDA")) $("valEDA").textContent = room.sudoracion ?? "—";
    if ($("valDate")) $("valDate").textContent = room.date ? new Date(room.date).toLocaleString() : "—";

    if ($("valTipLuz")){
      $("valTipLuz").textContent = room.tipLuz || "apagada";
      if ($("selTipLuz")) $("selTipLuz").value = (room.tipLuz || "apagada").toLowerCase();
    }
    if ($("valOlor")){
      $("valOlor").textContent = room.olores || "(inactivo)";
      if ($("selOlor")) $("selOlor").value = room.olores || "";
    }

    const sev = room.anxietyLevel;
    if ($("sevBadge")){
      const sevBadge = $("sevBadge");
      sevBadge.className = `badge bg-${sev.class}`;
      sevBadge.textContent = sev.level;
    }

    if ($("anxScore")) $("anxScore").textContent = `${room.anxietyScore}%`;
    if ($("anxBar")){
      const bar = $("anxBar");
      bar.style.width = `${room.anxietyScore}%`;
      bar.className = `progress-bar bg-${sev.class}`;
    }

    paintDoorChip(room.doorState);
    paintThresholds(room.HR, room.HRV, room.skinTemp, room.sudoracion);

    if ($("overallMsg")){
      const msg = $("overallMsg");
      msg.className = `alert alert-${sev.class}`;
      msg.textContent = `Nivel de ansiedad: ${sev.level}`;
    }

    recommendations(room);

    // actualizar históricos + pintar
    pushHistories(room);
    renderHistories();
  }

  // Carga: usa los datos tal cual vienen de api.js (que ya aplica snapshot sincronizado)
  async function load(){
    if (!id){ const err = $("roomError"); if (err) err.classList.remove("d-none"); return; }
    const room = await fetchRoomById(id, true);
    if (!room){ const err = $("roomError"); if (err) err.classList.remove("d-none"); return; }
    paintRoom(room);
  }

  // Event handlers (persisten en la API y se refleja en próximo tick)
  async function saveLight(){
    const val = $("selTipLuz").value;
    const updated = await updateRoom(id, { tipLuz: val });
    if (updated) paintRoom(updated);
  }
  async function saveScent(){
    const val = $("selOlor").value; // "" = inactivo
    const updated = await updateRoom(id, { olores: val });
    if (updated) paintRoom(updated);
  }
  async function openDoor(){
    const updated = await updateRoom(id, { doorState: "abierto" });
    if (updated) paintRoom(updated);
  }
  async function closeDoor(){
    const updated = await updateRoom(id, { doorState: "cerrado" });
    if (updated) paintRoom(updated);
  }

  /* ================= NUEVO: botón Eliminar (inyectado) ================= */
  function injectDeleteButton(){
    const navbar = document.querySelector(".navbar .container");
    if (!navbar || document.getElementById("btnDeleteRoom")) return;
    const btn = document.createElement("button");
    btn.id = "btnDeleteRoom";
    btn.className = "btn btn-outline-danger btn-sm ms-2";
    btn.innerHTML = '<i class="fa-solid fa-trash me-1"></i>Eliminar cuarto';
    btn.addEventListener("click", async ()=>{
      if (!confirm("¿Eliminar este cuarto definitivamente?")) return;
      const ok = await deleteRoom(id);
      if (ok){
        clearHistoryStorage(); // limpia historial persistido de este cuarto
        location.href = "index.html";
      } else {
        alert("No se pudo eliminar. Intenta nuevamente.");
      }
    });
    navbar.appendChild(btn);
  }

  /* ================= Históricos (últimos 10) con persistencia ================= */
  const history = loadHistoryFromStorage(); // ¡carga historial si existe!
  const MAX_HIST = 10;

  function ensureHistoryCard(){
    if (document.getElementById("historyCard")) return;

    // Columna izquierda (donde están las métricas y dispositivos)
    const leftCol = document.querySelector(".container .row > .col-lg-8");
    if (!leftCol) return;

    const card = document.createElement("div");
    card.className = "card mt-4";
    card.id = "historyCard";
    card.innerHTML = `
      <div class="card-header d-flex align-items-center justify-content-between">
        <span><i class="fa-solid fa-clock-rotate-left me-2"></i>Historial (últimos 10)</span>
        <small class="text-muted">Actualiza cada 2 s</small>
      </div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-4">
            <h6 class="mb-2"><i class="fa-solid fa-lightbulb me-1"></i>Lámpara</h6>
            <div class="table-responsive">
              <table class="table table-sm table-striped align-middle mb-0">
                <thead><tr><th style="width:40%">Hora</th><th>Estado</th></tr></thead>
                <tbody id="histLight"></tbody>
              </table>
            </div>
          </div>
          <div class="col-md-4">
            <h6 class="mb-2"><i class="fa-solid fa-wind me-1"></i>Aroma</h6>
            <div class="table-responsive">
              <table class="table table-sm table-striped align-middle mb-0">
                <thead><tr><th style="width:40%">Hora</th><th>Estado</th></tr></thead>
                <tbody id="histAroma"></tbody>
              </table>
            </div>
          </div>
          <div class="col-md-4">
            <h6 class="mb-2"><i class="fa-solid fa-door-open me-1"></i>Puerta</h6>
            <div class="table-responsive">
              <table class="table table-sm table-striped align-middle mb-0">
                <thead><tr><th style="width:40%">Hora</th><th>Estado</th></tr></thead>
                <tbody id="histDoor"></tbody>
              </table>
            </div>
          </div>
        </div>

        <hr class="my-3">

        <h6 class="mb-2"><i class="fa-solid fa-chart-line me-1"></i>Ansiedad y vitales</h6>
        <div class="table-responsive">
          <table class="table table-sm table-striped align-middle mb-0">
            <thead>
              <tr>
                <th style="width:18%">Hora</th>
                <th>Ansiedad</th>
                <th>HR</th>
                <th>HRV</th>
                <th>Temp</th>
                <th>EDA</th>
              </tr>
            </thead>
            <tbody id="histVitals"></tbody>
          </table>
        </div>
      </div>
    `;
    leftCol.appendChild(card);
  }

  function cap10(arr){ 
    while (arr.length > MAX_HIST) arr.shift(); 
  }

  function pushHistories(room){
    const ts = new Date(room.date || Date.now()).toLocaleTimeString();
    history.light.push({ ts, value: (room.tipLuz || "apagada") });
    history.aroma.push({ ts, value: (room.olores || "(inactivo)") });
    history.door.push({ ts, value: (room.doorState || "cerrado") });
    history.vitals.push({ ts, score: room.anxietyScore, hr: room.HR, hrv: room.HRV, t: room.skinTemp, eda: room.sudoracion });

    cap10(history.light);
    cap10(history.aroma);
    cap10(history.door);
    cap10(history.vitals);

    // ¡persistir!
    saveHistoryToStorage();
  }

  function renderTableRows(tbodyId, rowsHtml){
    const tb = document.getElementById(tbodyId);
    if (!tb) return;
    tb.innerHTML = rowsHtml;
  }

  function renderHistories(){
    ensureHistoryCard();

    // render invertido (lo más reciente primero)
    const lightRows = [...history.light].reverse().map(r => `<tr><td>${r.ts}</td><td>${r.value}</td></tr>`).join("");
    const aromaRows = [...history.aroma].reverse().map(r => `<tr><td>${r.ts}</td><td>${r.value}</td></tr>`).join("");
    const doorRows  = [...history.door].reverse().map(r => `<tr><td>${r.ts}</td><td>${r.value}</td></tr>`).join("");
    const vitRows   = [...history.vitals].reverse().map(r => `
      <tr>
        <td>${r.ts}</td>
        <td>${r.score}%</td>
        <td>${r.hr} bpm</td>
        <td>${r.hrv} ms</td>
        <td>${r.t} °C</td>
        <td>${r.eda} µS</td>
      </tr>
    `).join("");

    renderTableRows("histLight", lightRows);
    renderTableRows("histAroma", aromaRows);
    renderTableRows("histDoor", doorRows);
    renderTableRows("histVitals", vitRows);
  }

  /* ================= Boot ================= */

  document.addEventListener("DOMContentLoaded", ()=>{
    injectDeleteButton();

    // dibuja de inmediato lo que haya en storage (si existe)
    renderHistories();

    load();
    setInterval(load, 2000);

    if ($("btnSetLuz")) $("btnSetLuz").addEventListener("click", saveLight);
    if ($("btnSetOlor")) $("btnSetOlor").addEventListener("click", saveScent);
    if ($("btnAbrir")) $("btnAbrir").addEventListener("click", openDoor);
    if ($("btnCerrar")) $("btnCerrar").addEventListener("click", closeDoor);
  });
})();
