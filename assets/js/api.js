/**
* Capa de datos: centraliza el acceso a MockAPI y/o datos locales.
* Cambia API_BASE_URL y RESOURCE según tu MockAPI.
*/
const API_BASE_URL = "https://68bb0de584055bce63f104e1.mockapi.io/api/v1"; // MockAPI base
const RESOURCE = "Test"; // endpoint del recurso (sensible a mayúsculas)


async function fetchRoomsFromApi() {
try {
const resp = await fetch(`${API_BASE_URL}/${RESOURCE}`);
if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
const data = await resp.json();
// Normaliza a un array de 6 (si hay más, corta; si hay menos, renderiza los que haya)
return Array.isArray(data) ? data.slice(0, 6) : [];
} catch (e) {
console.warn("⚠️ No se pudo obtener datos de MockAPI, usando fallback local.", e.message);
return null; // app.js decide el fallback
}
}


// Obtener un cuarto por id
async function fetchRoomById(id) {
try {
const resp = await fetch(`${API_BASE_URL}/${RESOURCE}/${id}`);
if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
return await resp.json();
} catch (e) {
console.warn(`⚠️ No se pudo obtener el cuarto ${id} de MockAPI.`, e.message);
return null; // room.js puede decidir fallback
}
}


/** Datos fallback para demo local (puedes borrar cuando tengas la API) */
const FALLBACK_ROOMS = [
{ id: "1", cuarto: 101, tipLuz: "cálida", HR: 78, HRV: 58, skinTemp: 35.8, sudoracion: 2.1, alertas: "sin alerta", date: new Date().toISOString() },
{ id: "2", cuarto: 102, tipLuz: "fría", HR: 95, HRV: 34, skinTemp: 35.1, sudoracion: 6.4, alertas: "moderada", date: new Date().toISOString() },
{ id: "3", cuarto: 103, tipLuz: "apagada", HR: 66, HRV: 72, skinTemp: 36.1, sudoracion: 1.3, alertas: "sin alerta", date: new Date().toISOString() },
{ id: "4", cuarto: 104, tipLuz: "neutra", HR: 88, HRV: 49, skinTemp: 35.6, sudoracion: 3.1, alertas: "sin alerta", date: new Date().toISOString() },
{ id: "5", cuarto: 105, tipLuz: "cálida", HR: 104, HRV: 28, skinTemp: 35.0, sudoracion: 7.2, alertas: "alta", date: new Date().toISOString() },
{ id: "6", cuarto: 106, tipLuz: "neutra", HR: 72, HRV: 60, skinTemp: 36.0, sudoracion: 2.8, alertas: "sin alerta", date: new Date().toISOString() }
];