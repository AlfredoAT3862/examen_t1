/**
 * Capa de datos: centraliza el acceso a MockAPI
 */
const API_BASE_URL = "https://68bb0de584055bce63f104e1.mockapi.io/api/v1";
const RESOURCE = "Test";

// Algoritmo unificado para calcular ansiedad
function calculateAnxietyLevel(hr, hrv, temp, sweat) {
    let anxietyScore = 0;
    
    // Ritmo cardíaco (30%)
    if (hr >= 100) anxietyScore += 30;
    else if (hr >= 90) anxietyScore += 20;
    else if (hr >= 80) anxietyScore += 10;
    
    // Variabilidad del ritmo cardíaco (30%)
    if (hrv <= 35) anxietyScore += 30;
    else if (hrv <= 45) anxietyScore += 20;
    else if (hrv <= 55) anxietyScore += 10;
    
    // Temperatura de la piel (20%)
    if (temp <= 34.5) anxietyScore += 20;
    else if (temp <= 35.0) anxietyScore += 15;
    else if (temp <= 35.5) anxietyScore += 10;
    
    // Sudoración (20%) - Convertir texto a número si es necesario
    const sweatValue = typeof sweat === 'string' ? parseFloat(sweat) || 2.0 : sweat;
    if (sweatValue >= 6.0) anxietyScore += 20;
    else if (sweatValue >= 4.5) anxietyScore += 15;
    else if (sweatValue >= 3.0) anxietyScore += 10;
    
    return Math.min(100, Math.max(0, Math.round(anxietyScore)));
}

// Determinar el nivel de ansiedad
function getAnxietyLevel(score) {
    if (score >= 70) return { level: "Alta", class: "danger", icon: "fa-exclamation-triangle" };
    if (score >= 40) return { level: "Moderada", class: "warning", icon: "fa-exclamation-circle" };
    if (score >= 20) return { level: "Leve", class: "info", icon: "fa-info-circle" };
    return { level: "Estable", class: "success", icon: "fa-check-circle" };
}

// Función para obtener todos los cuartos
async function fetchRoomsFromApi() {
    try {
        console.log("📡 Obteniendo datos de MockAPI...");
        const resp = await fetch(`${API_BASE_URL}/${RESOURCE}`);
        
        if (!resp.ok) {
            throw new Error(`Error HTTP: ${resp.status} ${resp.statusText}`);
        }
        
        const data = await resp.json();
        console.log("✅ Datos recibidos de MockAPI:", data);
        
        if (!Array.isArray(data)) {
            throw new Error("La API no devolvió un array");
        }
        
        // Procesar datos y calcular ansiedad
        const processedData = data.map(room => {
            // Convertir sudoracion de texto a número si es necesario
            const sweatValue = typeof room.sudoracion === 'string' ? 
                parseFloat(room.sudoracion.replace(',', '.')) || 2.0 : 
                room.sudoracion;
            
            const anxietyScore = calculateAnxietyLevel(
                Number(room.HR) || 75,
                Number(room.HRV) || 50,
                Number(room.skinTemp) || 35.5,
                sweatValue
            );
            
            return {
                id: room.id,
                cuarto: room.cuarto,
                tipLuz: room.tipluz,
                HR: room.HR,
                HRV: room.HRV,
                skinTemp: room.skinTemp,
                sudoracion: sweatValue,
                alertas: room.alertas,
                date: room.date,
                anxietyScore: anxietyScore,
                anxietyLevel: getAnxietyLevel(anxietyScore)
            };
        });
        
        return processedData;
        
    } catch (error) {
        console.error("❌ Error fetching from API:", error);
        console.warn("⚠️ Usando datos de fallback");
        return null;
    }
}

// Obtener un cuarto específico por ID
async function fetchRoomById(id) {
    try {
        console.log(`📡 Obteniendo datos del cuarto ${id}...`);
        const resp = await fetch(`${API_BASE_URL}/${RESOURCE}/${id}`);
        
        if (!resp.ok) {
            throw new Error(`Error HTTP: ${resp.status} ${resp.statusText}`);
        }
        
        const room = await resp.json();
        console.log("✅ Datos del cuarto recibidos:", room);
        
        // Convertir sudoracion de texto a número si es necesario
        const sweatValue = typeof room.sudoracion === 'string' ? 
            parseFloat(room.sudoracion.replace(',', '.')) || 2.0 : 
            room.sudoracion;
        
        const anxietyScore = calculateAnxietyLevel(
            Number(room.HR) || 75,
            Number(room.HRV) || 50,
            Number(room.skinTemp) || 35.5,
            sweatValue
        );
        
        return {
            id: room.id,
            cuarto: room.cuarto,
            tipLuz: room.tipluz,
            HR: room.HR,
            HRV: room.HRV,
            skinTemp: room.skinTemp,
            sudoracion: sweatValue,
            alertas: room.alertas,
            date: room.date,
            anxietyScore: anxietyScore,
            anxietyLevel: getAnxietyLevel(anxietyScore)
        };
        
    } catch (error) {
        console.error(`❌ Error fetching room ${id}:`, error);
        return null;
    }
}

// Actualizar un cuarto en la API
async function updateRoom(id, data) {
    try {
        const resp = await fetch(`${API_BASE_URL}/${RESOURCE}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (!resp.ok) {
            throw new Error(`Error HTTP: ${resp.status}`);
        }
        
        return await resp.json();
    } catch (error) {
        console.error("❌ Error updating room:", error);
        return null;
    }
}

// Datos de fallback (solo si la API falla)
const FALLBACK_ROOMS = [
    { id: "1", cuarto: 101, tipLuz: "cálida", HR: 78, HRV: 58, skinTemp: 35.8, sudoracion: 2.1, alertas: "sin alerta", date: new Date().toISOString() },
    { id: "2", cuarto: 102, tipLuz: "fría", HR: 95, HRV: 34, skinTemp: 35.1, sudoracion: 6.4, alertas: "moderada", date: new Date().toISOString() },
    { id: "3", cuarto: 103, tipLuz: "apagada", HR: 66, HRV: 72, skinTemp: 36.1, sudoracion: 1.3, alertas: "sin alerta", date: new Date().toISOString() },
    { id: "4", cuarto: 104, tipLuz: "neutra", HR: 88, HRV: 49, skinTemp: 35.6, sudoracion: 3.1, alertas: "sin alerta", date: new Date().toISOString() },
    { id: "5", cuarto: 105, tipLuz: "cálida", HR: 104, HRV: 28, skinTemp: 35.0, sudoracion: 7.2, alertas: "alta", date: new Date().toISOString() },
    { id: "6", cuarto: 106, tipLuz: "neutra", HR: 72, HRV: 60, skinTemp: 36.0, sudoracion: 2.8, alertas: "sin alerta", date: new Date().toISOString() }
].map(room => {
    const anxietyScore = calculateAnxietyLevel(
        Number(room.HR),
        Number(room.HRV),
        Number(room.skinTemp),
        Number(room.sudoracion)
    );
    
    return {
        ...room,
        anxietyScore: anxietyScore,
        anxietyLevel: getAnxietyLevel(anxietyScore)
    };
});