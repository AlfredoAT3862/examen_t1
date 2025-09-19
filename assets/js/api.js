/**
 * Capa de datos: MockAPI
 * Campos: id, cuarto, tipLuz, HR, skinTemp, sudoracion, alertas, HRV, date, doorState, nombrePaciente, olores
 */
const API_BASE_URL = "https://68bb0de584055bce63f104e1.mockapi.io/api/v1";
const RESOURCE = "Test";

// Cache básico (2s)
let currentRoomsData = null;
let lastFetchTime = null;
const CACHE_DURATION = 2000;

// --- Utilidades de dominio ---
function toNum(x, def=0){
  if (x === null || x === undefined) return def;
  if (typeof x === "number") return x;
  const n = parseFloat(String(x).replace(",", "."));
  return Number.isFinite(n) ? n : def;
}

function normalizeDoorState(s){
  const val = (s||"").toString().trim().toLowerCase();
  return val === "abierto" ? "abierto" : "cerrado";
}

// --- Ansiedad ---
function calculateAnxietyScore(hr, hrv, skinTemp, sweat){
  let score = 0;
  // HR (30%)
  if (hr >= 100) score += 30;
  else if (hr >= 90) score += 20;
  else if (hr >= 80) score += 10;

  // HRV (30%) - menor HRV => mayor ansiedad
  if (hrv <= 35) score += 30;
  else if (hrv <= 45) score += 20;
  else if (hrv <= 55) score += 10;

  // skinTemp (20%) - más baja => mayor ansiedad
  if (skinTemp <= 34.5) score += 20;
  else if (skinTemp <= 35.0) score += 15;
  else if (skinTemp <= 35.5) score += 10;

  // sudoracion (20%)
  if (sweat >= 6.0) score += 20;
  else if (sweat >= 4.5) score += 15;
  else if (sweat >= 3.0) score += 10;

  return Math.min(100, Math.max(0, Math.round(score)));
}

function anxietyLevel(score){
  if (score >= 70) return { level:"Alta", class:"danger", icon:"fa-exclamation-triangle" };
  if (score >= 40) return { level:"Moderada", class:"warning", icon:"fa-exclamation-circle" };
  if (score >= 20) return { level:"Leve", class:"info", icon:"fa-info-circle" };
  return { level:"Estable", class:"success", icon:"fa-check-circle" };
}

// --- Fetch list ---
async function fetchRoomsFromApi(forceRefresh=false){
  if (!forceRefresh && currentRoomsData && lastFetchTime && (Date.now()-lastFetchTime) < CACHE_DURATION){
    return currentRoomsData;
  }
  try{
    const resp = await fetch(`${API_BASE_URL}/${RESOURCE}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (!Array.isArray(data)) throw new Error("API no devolvió un array");
    currentRoomsData = data.map(mapRoom);
    lastFetchTime = Date.now();
    return currentRoomsData;
  }catch(err){
    console.error("Error fetchRoomsFromApi:", err);
    return currentRoomsData || [];
  }
}

// --- Fetch single ---
async function fetchRoomById(id, forceRefresh=false){
  if (!forceRefresh && currentRoomsData){
    const cached = currentRoomsData.find(r => String(r.id)===String(id));
    if (cached) return cached;
  }
  try{
    const resp = await fetch(`${API_BASE_URL}/${RESOURCE}/${id}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const raw = await resp.json();
    const room = mapRoom(raw);

    // Actualiza cache
    if (currentRoomsData){
      const i = currentRoomsData.findIndex(r => String(r.id)===String(id));
      if (i>=0) currentRoomsData[i] = room; else currentRoomsData.push(room);
      lastFetchTime = Date.now();
    }else{
      currentRoomsData = [room];
      lastFetchTime = Date.now();
    }
    return room;
  }catch(err){
    console.error("Error fetchRoomById:", err);
    return null;
  }
}

// --- Update ---
async function updateRoom(id, patch){
  try{
    const resp = await fetch(`${API_BASE_URL}/${RESOURCE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify(patch)
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const updated = mapRoom(await resp.json());
    // invalida/actualiza cache
    if (currentRoomsData){
      const i = currentRoomsData.findIndex(r => String(r.id)===String(id));
      if (i>=0) currentRoomsData[i]=updated; else currentRoomsData.push(updated);
    }
    lastFetchTime = 0;
    return updated;
  }catch(err){
    console.error("Error updateRoom:", err);
    return null;
  }
}

// --- Create ---
async function createRoom(data){
  try{
    const resp = await fetch(`${API_BASE_URL}/${RESOURCE}`, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify(data)
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const createdRaw = await resp.json();
    const created = mapRoom(createdRaw);
    if (currentRoomsData) currentRoomsData.unshift(created);
    lastFetchTime = 0;
    return created;
  }catch(err){
    console.error("Error createRoom:", err);
    return null;
  }
}

// --- Mapper único (solo usa tus campos) ---
function mapRoom(room){
  const hr  = toNum(room.HR, 75);
  const hrv = toNum(room.HRV, 50);
  const t   = toNum(room.skinTemp, 35.5);
  const eda = toNum(room.sudoracion, 2.0);

  const score = calculateAnxietyScore(hr, hrv, t, eda);
  const lvl = anxietyLevel(score);

  return {
    id: String(room.id),
    cuarto: toNum(room.cuarto, 0),
    tipLuz: (room.tipLuz ?? "").toString(),      // string libre (incluye "apagada")
    HR: hr,
    HRV: hrv,
    skinTemp: t,
    sudoracion: eda,
    alertas: (room.alertas ?? "").toString(),
    date: room.date ?? null,
    doorState: normalizeDoorState(room.doorState),
    nombrePaciente: (room.nombrePaciente ?? `Paciente ${room.cuarto ?? ""}`).toString(),
    olores: (room.olores ?? "").toString(),      // aroma seleccionado, vacío = inactivo
    anxietyScore: score,
    anxietyLevel: lvl
  };
}
