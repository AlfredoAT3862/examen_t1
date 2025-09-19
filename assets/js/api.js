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

// --- Ansiedad (biométricos) ---
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

/* ======= Efecto de dispositivos (común) ======= */
function deviceMultiplier(room){
  const tip = (room.tipLuz || "").toLowerCase();
  const aroma = (room.olores || "").toLowerCase();
  const door = normalizeDoorState(room.doorState);
  let m = 1.0;

  // Luz
  if (tip === "calida") m *= 0.80;
  else if (tip === "violeta") m *= 0.85;
  else if (tip === "azul") m *= 0.92;
  else if (tip === "fria") m *= 0.95;
  else if (tip === "apagada") m *= 1.08;

  // Aroma
  if (aroma) m *= 0.85; else m *= 1.08;

  // Puerta 16–18 h
  const h = new Date().getHours();
  if (h >= 16 && h < 18){
    if (door === "abierto") m *= 0.92; else m *= 1.05;
  }

  return Math.max(0.4, Math.min(1.2, m));
}

function calculateAnxietyScoreWithDevices(hr, hrv, skinTemp, sweat, room){
  const base = calculateAnxietyScore(hr, hrv, skinTemp, sweat);
  const mult = deviceMultiplier(room || {});
  return Math.min(100, Math.max(0, Math.round(base * mult)));
}
/* ======= fin efecto dispositivos ======= */

/* ======= Snapshot sincronizado (no persiste) ======= */
const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
const TICK_MS = 2000;
function currentTick(){ return Math.floor(Date.now()/TICK_MS); }

function hashId(s){
  s = String(s || "");
  let h = 0;
  for (let i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function noise(seed, amp){
  const x = Math.sin(seed) * 43758.5453;
  return (x - Math.floor(x)) * 2*amp - amp; // [-amp, amp]
}

function snapshotFromBase(baseRoom){
  const r = { ...baseRoom };

  // 1) Partimos de API
  let hr  = Number(r.HR)  || 75;
  let hrv = Number(r.HRV) || 50;
  let t   = Number(r.skinTemp) || 35.5;
  let eda = Number(r.sudoracion) || 2.0;

  // 2) Ruido determinístico por tick
  const tick = currentTick();
  const hid = hashId(r.id);
  hr  += noise(hid*1.1 + tick*0.7, 2.2);
  hrv += noise(hid*1.7 + tick*1.1, 2.5);
  t   += noise(hid*2.3 + tick*1.3, 0.12);
  eda += noise(hid*3.1 + tick*0.9, 0.22);

  // 3) Tendencia por dispositivos
  const tip = (r.tipLuz || "").toLowerCase();
  const aroma = (r.olores || "").toLowerCase();
  const door  = (r.doorState || "cerrado").toLowerCase();

  if (tip === "calida"){ hr -= 3; hrv += 6; t += 0.15; eda -= 0.20; }
  else if (tip === "violeta"){ hr -= 2; hrv += 4; t += 0.10; eda -= 0.15; }
  else if (tip === "azul"){ hr -= 1; hrv += 2; eda -= 0.10; }
  else if (tip === "apagada"){ hr += 2; hrv -= 3; eda += 0.20; }

  if (aroma){ hr -= 1.5; hrv += 3; eda -= 0.15; } else { hr += 1.5; hrv -= 2.5; eda += 0.20; }

  const h = new Date().getHours();
  if (h >= 16 && h < 18){
    if (door === "abierto"){ hr -= 1.0; hrv += 1.8; eda -= 0.10; }
    else { hr += 0.8; hrv -= 1.0; eda += 0.08; }
  }

  // 4) Límites
  hr  = Math.round(clamp(hr, 50, 120));
  hrv = Math.round(clamp(hrv, 15, 130));
  t   = clamp(parseFloat(t.toFixed(1)), 33.0, 37.8);
  eda = clamp(parseFloat(eda.toFixed(1)), 0.3, 10.0);

  // 5) Ansiedad con dispositivos
  const score = calculateAnxietyScoreWithDevices(hr, hrv, t, eda, r);
  const lvl = anxietyLevel(score);

  return {
    ...r,
    HR: hr,
    HRV: hrv,
    skinTemp: t,
    sudoracion: eda,
    anxietyScore: score,
    anxietyLevel: lvl,
    date: new Date().toISOString()
  };
}
/* ======= fin snapshot ======= */

// --- Fetch list ---
async function fetchRoomsFromApi(forceRefresh=false){
  if (!forceRefresh && currentRoomsData && lastFetchTime && (Date.now()-lastFetchTime) < CACHE_DURATION){
    return currentRoomsData.map(snapshotFromBase);
  }
  try{
    const resp = await fetch(`${API_BASE_URL}/${RESOURCE}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (!Array.isArray(data)) throw new Error("API no devolvió un array");
    currentRoomsData = data.map(mapRoom); // base
    lastFetchTime = Date.now();
    return currentRoomsData.map(snapshotFromBase);
  }catch(err){
    console.error("Error fetchRoomsFromApi:", err);
    return (currentRoomsData || []).map(snapshotFromBase);
  }
}

// --- Fetch single ---
async function fetchRoomById(id, forceRefresh=false){
  if (!forceRefresh && currentRoomsData){
    const cached = currentRoomsData.find(r => String(r.id)===String(id));
    if (cached) return snapshotFromBase(cached);
  }
  try{
    const resp = await fetch(`${API_BASE_URL}/${RESOURCE}/${id}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const raw = await resp.json();
    const room = mapRoom(raw);

    // actualiza base
    if (currentRoomsData){
      const i = currentRoomsData.findIndex(r => String(r.id)===String(id));
      if (i>=0) currentRoomsData[i] = room; else currentRoomsData.push(room);
      lastFetchTime = Date.now();
    }else{
      currentRoomsData = [room];
      lastFetchTime = Date.now();
    }
    return snapshotFromBase(room);
  }catch(err){
    console.error("Error fetchRoomById:", err);
    const cached = currentRoomsData ? currentRoomsData.find(r => String(r.id)===String(id)) : null;
    return cached ? snapshotFromBase(cached) : null;
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
    // actualiza base
    if (currentRoomsData){
      const i = currentRoomsData.findIndex(r => String(r.id)===String(id));
      if (i>=0) currentRoomsData[i]=updated; else currentRoomsData.push(updated);
    }
    lastFetchTime = 0;
    return snapshotFromBase(updated);
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
    return snapshotFromBase(created);
  }catch(err){
    console.error("Error createRoom:", err);
    return null;
  }
}

// --- Delete (NUEVO) ---
async function deleteRoom(id){
  try{
    const resp = await fetch(`${API_BASE_URL}/${RESOURCE}/${id}`, {
      method: "DELETE"
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    // limpiar de cache base
    if (currentRoomsData){
      currentRoomsData = currentRoomsData.filter(r => String(r.id)!==String(id));
    }
    lastFetchTime = 0;
    return true;
  }catch(err){
    console.error("Error deleteRoom:", err);
    return false;
  }
}

// --- Mapper único (solo usa tus campos) ---
function mapRoom(room){
  const hr  = toNum(room.HR, 75);
  const hrv = toNum(room.HRV, 50);
  const t   = toNum(room.skinTemp, 35.5);
  const eda = toNum(room.sudoracion, 2.0);

  const score = calculateAnxietyScoreWithDevices(
    hr, hrv, t, eda,
    { tipLuz: room.tipLuz, olores: room.olores, doorState: room.doorState }
  );
  const lvl = anxietyLevel(score);

  return {
    id: String(room.id),
    cuarto: toNum(room.cuarto, 0),
    tipLuz: (room.tipLuz ?? "").toString(),
    HR: hr,
    HRV: hrv,
    skinTemp: t,
    sudoracion: eda,
    alertas: (room.alertas ?? "").toString(),
    date: room.date ?? null,
    doorState: normalizeDoorState(room.doorState),
    nombrePaciente: (room.nombrePaciente ?? `Paciente ${room.cuarto ?? ""}`).toString(),
    olores: (room.olores ?? "").toString(),
    anxietyScore: score,
    anxietyLevel: lvl
  };
}
