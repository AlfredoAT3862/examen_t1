(function(){
  const grid = document.getElementById("roomsGrid");
  const skeleton = document.getElementById("skeleton");

  function fmtAgo(dateStr){
    if (!dateStr) return "—";
    const diff = (Date.now() - new Date(dateStr).getTime())/60000;
    if (diff < 1) return "Hace unos segundos";
    if (diff < 2) return "Hace 1 minuto";
    if (diff < 60) return `Hace ${Math.floor(diff)} minutos`;
    const h = Math.floor(diff/60);
    return h===1 ? "Hace 1 hora" : `Hace ${h} horas`;
  }

  function cardHtml(room){
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(room.nombrePaciente)}&background=2b5876&color=fff`;
    const doorChip = room.doorState === "abierto"
      ? `<span class="door-chip door-open"><i class="fa-solid fa-door-open me-1"></i> Abierta</span>`
      : `<span class="door-chip door-closed"><i class="fa-solid fa-door-closed me-1"></i> Cerrada</span>`;

    return `
      <div class="col">
        <a class="text-decoration-none" href="room.html?room=${encodeURIComponent(room.id)}&timestamp=${Date.now()}">
          <div class="card room-card h-100">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <h5 class="card-title mb-0">Habitación ${room.cuarto || "—"}</h5>
                <span class="badge room-badge bg-${room.anxietyLevel.class}">
                  <i class="fas ${room.anxietyLevel.icon} me-1"></i>${room.anxietyLevel.level}
                </span>
              </div>

              <div class="d-flex align-items-center mb-3">
                <img class="patient-avatar" src="${avatar}" alt="${room.nombrePaciente}">
                <div class="ms-3">
                  <h6 class="mb-0">${room.nombrePaciente}</h6>
                  <small class="text-muted">${doorChip}</small>
                </div>
              </div>

              <p class="card-text mb-3">${room.alertas || "Sin alertas"}</p>

              <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <small class="text-muted">Nivel de ansiedad</small>
                  <small class="fw-bold">${room.anxietyScore}%</small>
                </div>
                <div class="progress progress-thin">
                  <div class="progress-bar bg-${room.anxietyLevel.class}" role="progressbar"
                       style="width:${room.anxietyScore}%" aria-valuenow="${room.anxietyScore}" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
              </div>

              <div class="d-flex justify-content-between small text-muted">
                <span><i class="fas fa-heart me-1"></i> ${room.HR} bpm</span>
                <span><i class="fas fa-wave-square me-1"></i> ${room.HRV} ms</span>
                <span><i class="fas fa-tint me-1"></i> ${room.sudoracion} µS</span>
              </div>

              <div class="last-update mt-2"><i class="fas fa-clock me-1"></i> ${fmtAgo(room.date)}</div>
            </div>
          </div>
        </a>
      </div>
    `;
  }

  async function load(force=false){
    try{
      skeleton && skeleton.classList.add("d-none");
      let rooms = await fetchRoomsFromApi(force);
      grid.innerHTML = (rooms||[]).slice(0, 12).map(cardHtml).join("") || `
        <div class="col-12"><div class="alert alert-warning">No hay habitaciones disponibles.</div></div>`;
    }catch(e){
      console.error(e);
      grid.innerHTML = `<div class="col-12"><div class="alert alert-danger">Error cargando el listado.</div></div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    load();
    setInterval(()=>load(true), 2000); // refresco 2s
    document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) load(true); });
    window.addEventListener("focus", ()=>load(true));
  });
})();
