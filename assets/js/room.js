(function () {
    const params = new URLSearchParams(location.search);
    const id = params.get('room');

    const $ = (id) => document.getElementById(id);

    // Estado local de los dispositivos
    let currentRoomState = {
        light: {
            enabled: false,
            color: 'apagada'
        },
        diffuser: {
            enabled: false,
            scent: 'apagado',
            intensity: 1
        }
    };

    async function loadRoom() {
        if (!id) {
            $('#roomError').classList.remove('d-none');
            return;
        }

        console.log(`Cargando habitación ${id}...`);
        
        // Obtener datos REALES de la API
        let room = await fetchRoomById(id);
        
        // Solo usar fallback si la API falla
        if (!room) {
            console.warn("Usando datos de fallback para la habitación");
            room = FALLBACK_ROOMS.find(r => String(r.id) === String(id)) || null;
        }

        if (!room) {
            $('#roomError').classList.remove('d-none');
            return;
        }

        console.log("Datos de la habitación:", room);

        // Actualizar la interfaz con datos REALES
        $('#roomNumber').textContent = room.cuarto ?? '—';
        
        const anxiety = room.anxietyLevel;
        const sevBadge = $('#sevBadge');
        sevBadge.textContent = anxiety.level;
        sevBadge.className = `badge ${anxiety.class}`;

        // Métricas
        $('#valHR').textContent = room.HR ?? '—';
        $('#valHRV').textContent = room.HRV ?? '—';
        $('#valEDA').textContent = room.sudoracion ?? '—';
        $('#valSkin').textContent = room.skinTemp ?? '—';
        $('#valDate').textContent = room.date ? new Date(room.date).toLocaleString() : '—';

        // Estado cuarto
        $('#valId').textContent = room.id ?? '—';
        $('#valRoom').textContent = room.cuarto ?? '—';
        $('#valLight').textContent = room.tipLuz ?? '—';
        $('#valSev').textContent = anxiety.level;

        // Inicializar estado de dispositivos desde API
        if (room.tipLuz) {
            currentRoomState.light.color = room.tipLuz;
            currentRoomState.light.enabled = room.tipLuz !== 'apagada';
        }

        updateDeviceStatus();

        // Link directo a la API
        const apiUrl = `${API_BASE_URL}/${RESOURCE}/${room.id}`;
        const apiLink = $('#apiLink');
        apiLink.href = apiUrl;

        // Configurar event listeners
        setupEventListeners();

        // Auto-refresh cada 3 segundos para monitoreo en tiempo real
        setInterval(async () => {
            console.log(`Actualizando datos de habitación ${id}...`);
            const updatedRoom = await fetchRoomById(id);
            
            if (updatedRoom) {
                console.log("Datos actualizados:", updatedRoom);
                
                // Actualizar métricas
                $('#valHR').textContent = updatedRoom.HR ?? '—';
                $('#valHRV').textContent = updatedRoom.HRV ?? '—';
                $('#valEDA').textContent = updatedRoom.sudoracion ?? '—';
                $('#valSkin').textContent = updatedRoom.skinTemp ?? '—';
                $('#valDate').textContent = updatedRoom.date ? new Date(updatedRoom.date).toLocaleString() : '—';
                
                // Actualizar severidad
                const updatedAnxiety = updatedRoom.anxietyLevel;
                sevBadge.textContent = updatedAnxiety.level;
                sevBadge.className = `badge ${updatedAnxiety.class}`;
                $('#valSev').textContent = updatedAnxiety.level;
            }
        }, 3000);
    }

    document.addEventListener('DOMContentLoaded', loadRoom);
})();