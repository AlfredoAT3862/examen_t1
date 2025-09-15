(function () {
  const grid = document.getElementById("roomsGrid");
  const skeleton = document.getElementById("skeleton");

  // Convierte a número con tolerancia (si viene "34 ms" o texto)
  const toNum = (v) => {
    if (v === null || v === undefined) return NaN;
    if (typeof v === "number") return v;
    const n = parseFloat(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  };

  function severityFromRow(row) {
    const hr = toNum(row.HR);
    const hrv = toNum(row.HRV);
    const eda = toNum(row.sudoracion);

    // Umbrales de demo (ajústalos si quieres)
    const isHigh = (hr >= 100) || (hrv > 0 && hrv < 35) || (eda >= 6);
    const isModerate = !isHigh && ((hr >= 90) || (hrv > 0 && hrv < 45) || (eda >= 4));

    if (isHigh) return { label: "ALTA", cls: "bg-danger" };
    if (isModerate) return { label: "MODERADA", cls: "bg-warning text-dark" };
    return { label: "OK", cls: "bg-success" };
  }

  function cardHtml(r) {
    const sev = severityFromRow(r);
    const roomId = encodeURIComponent(r.id ?? r.cuarto);
    const eda = toNum(r.sudoracion);
    const edaTxt = Number.isFinite(eda) ? eda : "—";

    return `
      <div class="col">
        <a class="text-decoration-none" href="room.html?room=${roomId}" target="_blank" rel="noopener">
          <div class="card room-card h-100">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <h5 class="card-title mb-0">Cuarto ${r.cuarto ?? "—"}</h5>
                <span class="badge room-badge ${sev.cls}">${sev.label}</span>
              </div>
              <p class="mb-1 text-muted small">Luz: <span class="fw-medium">${r.tipLuz ?? "—"}</span></p>
              <div class="d-flex gap-3">
                <div class="small text-muted">HR<br><span class="stat fw-semibold">${r.HR ?? "—"}</span> bpm</div>
                <div class="small text-muted">HRV<br><span class="stat fw-semibold">${r.HRV ?? "—"}</span> ms</div>
                <div class="small text-muted">EDA<br><span class="stat fw-semibold">${edaTxt}</span> µS</div>
              </div>
            </div>
          </div>
        </a>
      </div>`;
  }

  async function load() {
    try {
      skeleton && skeleton.classList.add("d-none");
      let rows = await fetchRoomsFromApi();     // viene de assets/js/api.js
      if (!Array.isArray(rows) || rows.length === 0) rows = FALLBACK_ROOMS;
      grid.innerHTML = rows.slice(0, 6).map(cardHtml).join("");
    } catch (e) {
      console.error(e);
      grid.innerHTML = `<div class="col"><div class="alert alert-danger">No se pudo cargar el listado de habitaciones.</div></div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", load);
})();