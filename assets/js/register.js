(function(){
  const form = document.getElementById("roomForm");
  const status = document.getElementById("formStatus");
  const ok = document.getElementById("successAlert");
  const err = document.getElementById("errorAlert");
  const link = document.getElementById("newRoomLink");

  // Genera números aleatorios en un rango (con decimales opcionales)
  function rand(min, max, decimals = 0){
    const k = Math.pow(10, decimals);
    return Math.round((Math.random() * (max - min) + min) * k) / k;
  }

  // set default datetime-local to now
  document.addEventListener("DOMContentLoaded", ()=>{
    const dateInput = form.elements["date"];
    const now = new Date();
    const pad = n => String(n).padStart(2,"0");
    const local = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    dateInput.value = local;
  });

  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    err.classList.add("d-none"); ok.classList.add("d-none");
    form.classList.add("was-validated");
    if (!form.checkValidity()) return;

    status.textContent = "Enviando…";
    const f = form.elements;

    // 🔹 Sensores autogenerados (rangos realistas)
    // HR (bpm): reposo a leve actividad
    const HR = rand(55, 110, 0);
    // HRV (ms): típico en reposo/estrés leve
    const HRV = rand(20, 120, 0);
    // Temp piel (°C)
    const skinTemp = rand(33.0, 37.5, 1);
    // Sudoración (µS)
    const sudoracion = rand(0.5, 8.0, 1);

    // Construir payload SOLO con tus campos
    const payload = {
      cuarto: Number(f["cuarto"].value),
      nombrePaciente: f["nombrePaciente"].value.trim(),
      HR,
      HRV,
      skinTemp,
      sudoracion,
      doorState: f["doorState"].value,                // "abierto"/"cerrado"
      tipLuz: f["tipLuz"].value,                      // "apagada"/"calida"/...
      olores: f["olores"].value,                      // "" o aroma
      alertas: f["alertas"].value.trim(),
      date: f["date"].value ? new Date(f["date"].value).toISOString() : new Date().toISOString()
    };

    const created = await createRoom(payload);
    if (created && created.id){
      status.textContent = "";
      ok.classList.remove("d-none");
      link.href = `room.html?room=${encodeURIComponent(created.id)}&timestamp=${Date.now()}`;
      // reset opcional
      form.reset();
      form.classList.remove("was-validated");
    }else{
      status.textContent = "";
      err.classList.remove("d-none");
    }
  });
})();
