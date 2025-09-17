(function () {
    const grid = document.getElementById("roomsGrid");
    const skeleton = document.getElementById("skeleton");

    // Datos de pacientes para información adicional
    const patientsInfo = {
        "1": { name: "Ana Rodríguez", age: 34, condition: "Trastorno de ansiedad generalizada" },
        "2": { name: "Carlos Méndez", age: 42, condition: "Estrés postraumático" },
        "3": { name: "María González", age: 29, condition: "Crisis de pánico" },
        "4": { name: "Javier López", age: 51, condition: "Ansiedad social" },
        "5": { name: "Laura Sánchez", age: 37, condition: "Agorafobia" },
        "6": { name: "Roberto Díaz", age: 45, condition: "Trastorno obsesivo-compulsivo" }
    };

    // Función para formatear la última actualización
    function formatLastUpdate(dateString) {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            
            if (diffMins < 1) return "Hace unos segundos";
            if (diffMins === 1) return "Hace 1 minuto";
            if (diffMins < 60) return `Hace ${diffMins} minutos`;
            
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours === 1) return "Hace 1 hora";
            return `Hace ${diffHours} horas`;
        } catch (e) {
            return "—";
        }
    }

    // Generar mensaje dinámico según el nivel de ansiedad
    function getStatusMessage(anxietyLevel, room) {
        const messages = {
            danger: [
                `Intervención necesaria en habitación ${room.cuarto}`,
                `Paciente requiere atención inmediata`,
                `Niveles críticos detectados`
            ],
            warning: [
                `Paciente muestra signos de ansiedad moderada`,
                `Monitoreo intensivo recomendado`,
                `Ansiedad moderada detectada`
            ],
            info: [
                `Paciente estable pero requiere observación`,
                `Leve aumento de ansiedad`,
                `Niveles dentro de parámetros aceptables`
            ],
            success: [
                `Paciente se encuentra estable y tranquilo/a`,
                `Habitación con niveles normales`,
                `Estado óptimo de relajación`
            ]
        };
        
        const randomIndex = Math.floor(Math.random() * messages[anxietyLevel.class].length);
        return messages[anxietyLevel.class][randomIndex];
    }

    function cardHtml(room) {
        const patient = patientsInfo[room.id] || { name: `Paciente ${room.cuarto}`, age: "", condition: "" };
        const anxiety = room.anxietyLevel;
        const roomId = encodeURIComponent(room.id);

        return `
            <div class="col">
                <a class="text-decoration-none" href="room.html?room=${roomId}">
                    <div class="card room-card h-100">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <h5 class="card-title mb-0">Cuarto ${room.cuarto ?? "—"}</h5>
                                <span class="badge room-badge ${anxiety.class}">
                                    <i class="fas ${anxiety.icon} me-1"></i> ${anxiety.level}
                                </span>
                            </div>
                            
                            <div class="d-flex align-items-center mb-3">
                                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(patient.name)}&background=2b5876&color=fff" 
                                     alt="${patient.name}" class="patient-avatar">
                                <div class="ms-3">
                                    <h6 class="mb-0">${patient.name}</h6>
                                    <small class="text-muted">${patient.age} años • ${patient.condition}</small>
                                </div>
                            </div>
                            
                            <p class="card-text mb-3">${getStatusMessage(anxiety, room)}</p>
                            
                            <div class="mb-3">
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <small class="text-muted">Nivel de ansiedad</small>
                                    <small class="fw-bold">${room.anxietyScore}%</small>
                                </div>
                                <div class="progress progress-thin">
                                    <div class="progress-bar bg-${anxiety.class}" 
                                         role="progressbar" style="width: ${room.anxietyScore}%" 
                                         aria-valuenow="${room.anxietyScore}" aria-valuemin="0" aria-valuemax="100">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="d-flex justify-content-between small text-muted">
                                <div>
                                    <i class="fas fa-heart me-1"></i> ${room.HR ?? "—"} bpm
                                </div>
                                <div>
                                    <i class="fas fa-wave-square me-1"></i> ${room.HRV ?? "—"} ms
                                </div>
                                <div>
                                    <i class="fas fa-tint me-1"></i> ${room.sudoracion ?? "—"} µS
                                </div>
                            </div>
                            
                            <div class="last-update mt-2">
                                <i class="fas fa-clock me-1"></i> ${room.date ? formatLastUpdate(room.date) : "—"}
                            </div>
                        </div>
                    </div>
                </a>
            </div>`;
    }

    async function load() {
        try {
            console.log("Cargando habitaciones...");
            skeleton && skeleton.classList.add("d-none");
            
            // Obtener datos REALES de la API
            let rooms = await fetchRoomsFromApi();
            
            // Solo usar fallback si la API falla completamente
            if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
                console.warn("Usando datos de fallback");
                rooms = FALLBACK_ROOMS;
            }
            
            console.log("Habitaciones cargadas:", rooms);
            grid.innerHTML = rooms.slice(0, 6).map(cardHtml).join("");
            
        } catch (e) {
            console.error("Error cargando habitaciones:", e);
            grid.innerHTML = `<div class="col-12"><div class="alert alert-danger">No se pudo cargar el listado de habitaciones.</div></div>`;
        }
    }

    // Configurar actualización automática cada 5 segundos
    document.addEventListener("DOMContentLoaded", function() {
        load();
        
        // Actualizar cada 5 segundos para mantener los datos frescos
        setInterval(load, 5000);
    });
})();