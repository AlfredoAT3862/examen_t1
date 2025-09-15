(function () {
const params = new URLSearchParams(location.search);
const id = params.get('room');


const $ = (id) => document.getElementById(id);
const toNum = (v) => (typeof v === 'number' ? v : parseFloat(v));


const severityFromRow = (row) => {
const hr = toNum(row.HR);
const hrv = toNum(row.HRV);
const eda = toNum(row.sudoracion);
const isHigh = (hr >= 100) || (hrv > 0 && hrv < 35) || (eda >= 6);
const isModerate = !isHigh && ((hr >= 90) || (hrv > 0 && hrv < 45) || (eda >= 4));
if (isHigh) return { label: 'ALTA', cls: 'bg-danger' };
if (isModerate) return { label: 'MODERADA', cls: 'bg-warning text-dark' };
return { label: 'OK', cls: 'bg-success' };
};


async function loadRoom() {
if (!id) {
$('#roomError').classList.remove('d-none');
return;
}


let row = await fetchRoomById(id);
if (!row) {
// Fallback: busca en la lista local
row = (FALLBACK_ROOMS || []).find(r => String(r.id) === String(id)) || null;
}


if (!row) {
$('#roomError').classList.remove('d-none');
return;
}


// Header
$('#roomHeader').querySelector('h1').textContent = `Habitación – Cuarto ${row.cuarto ?? '—'}`;
const sev = severityFromRow(row);
const sevBadge = $('#sevBadge');
sevBadge.textContent = sev.label;
sevBadge.className = `badge ${sev.cls}`;


// Métricas
$('#valHR').textContent = row.HR ?? '—';
$('#valHRV').textContent = row.HRV ?? '—';
const eda = toNum(row.sudoracion);
$('#valEDA').textContent = Number.isFinite(eda) ? eda : '—';
$('#valSkin').textContent = row.skinTemp ?? '—';
$('#valDate').textContent = row.date ? new Date(row.date).toLocaleString() : '—';


// Estado cuarto
$('#valId').textContent = row.id ?? '—';
$('#valRoom').textContent = row.cuarto ?? '—';
$('#valLight').textContent = row.tipLuz ?? '—';
$('#valSev').textContent = sev.label;


// Link directo a la API (útil para debug)
const apiUrl = `${API_BASE_URL}/${RESOURCE}/${row.id}`;
const apiLink = $('#apiLink');
apiLink.href = apiUrl;
}


loadRoom();
})();