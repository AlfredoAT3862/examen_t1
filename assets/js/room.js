(function(){
  const q = new URLSearchParams(location.search);
  const id = q.get("room");
  const $ = id => document.getElementById(id);

  function paintDoorChip(state){
    const el = $("valDoor");
    el.className = "door-chip " + (state==="abierto" ? "door-open" : "door-closed");
    el.textContent = state === "abierto" ? "abierta" : "cerrada";
  }

  function paintThresholds(hr,hrv,t,eda){
    $("thrHR").style.width  = Math.min(100, (hr-60)/0.6) + "%";
    $("thrHR").style.backgroundColor = hr>=90 ? "#dc3545" : hr>=80 ? "#ffc107" : "#28a745";
    $("thrHRV").style.width = Math.max(0, 100 - (hrv)) + "%";
    $("thrHRV").style.backgroundColor = hrv<=45 ? "#dc3545" : hrv<=55 ? "#ffc107" : "#28a745";
    $("thrSkin").style.width = Math.max(0, 100 - ((t-33)/3*100)) + "%";
    $("thrSkin").style.backgroundColor = t<=35.0 ? "#dc3545" : t<=35.5 ? "#ffc107" : "#28a745";
    $("thrEDA").style.width = Math.min(100, eda/8*100) + "%";
    $("thrEDA").style.backgroundColor = eda>=4.5 ? "#dc3545" : eda>=3.0 ? "#ffc107" : "#28a745";
  }

  function hourBetween(h1,h2){ // [h1,h2)
    const now = new Date(); const h = now.getHours();
    return h>=h1 && h<h2;
  }

  function recommendations(room){
    const list = $("recoList"); list.innerHTML = "";
    const push = t => { const li = document.createElement("li"); li.className="list-group-item"; li.textContent=t; list.appendChild(li); };

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
      $("doorAdvice").textContent = "Es hora sugerida de salida (16–18 h) y el paciente tiene ansiedad moderada/alta.";
    }else{
      $("doorAdvice").textContent = "";
    }
  }

  function paintRoom(room){
    $("roomNumber").textContent = room.cuarto ?? "—";
    $("valRoom").textContent = room.cuarto ?? "—";
    $("valNombre").textContent = room.nombrePaciente ?? "—";

    $("valHR").textContent = room.HR ?? "—";
    $("valHRV").textContent = room.HRV ?? "—";
    $("valSkin").textContent = room.skinTemp ?? "—";
    $("valEDA").textContent = room.sudoracion ?? "—";
    $("valDate").textContent = room.date ? new Date(room.date).toLocaleString() : "—";

    $("valTipLuz").textContent = room.tipLuz || "apagada";
    $("selTipLuz").value = (room.tipLuz || "apagada").toLowerCase();
    $("valOlor").textContent = room.olores || "(inactivo)";
    $("selOlor").value = room.olores || "";

    const sev = room.anxietyLevel;
    const sevBadge = $("sevBadge");
    sevBadge.className = `badge bg-${sev.class}`;
    sevBadge.textContent = sev.level;

    $("anxScore").textContent = `${room.anxietyScore}%`;
    const bar = $("anxBar");
    bar.style.width = `${room.anxietyScore}%`;
    bar.className = `progress-bar bg-${sev.class}`;

    paintDoorChip(room.doorState);
    paintThresholds(room.HR, room.HRV, room.skinTemp, room.sudoracion);

    const msg = $("overallMsg");
    msg.className = `alert alert-${sev.class}`;
    msg.textContent = `Nivel de ansiedad: ${sev.level}`;

    recommendations(room);
  }

  async function load(){
    if (!id){ $("roomError").classList.remove("d-none"); return; }
    const room = await fetchRoomById(id, true);
    if (!room){ $("roomError").classList.remove("d-none"); return; }
    paintRoom(room);
  }

  // Event handlers
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

  document.addEventListener("DOMContentLoaded", ()=>{
    load();
    setInterval(load, 2000);

    $("btnSetLuz").addEventListener("click", saveLight);
    $("btnSetOlor").addEventListener("click", saveScent);
    $("btnAbrir").addEventListener("click", openDoor);
    $("btnCerrar").addEventListener("click", closeDoor);
  });
})();
