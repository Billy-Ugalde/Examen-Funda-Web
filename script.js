const ROW_LABELS    = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
const SEATS_PER_ROW = 10;
const NUM_ROWS      = ROW_LABELS.length;

const DEFAULT_OCCUPIED = new Set([
     3,  7,
    11, 15, 19,
    22, 26, 30,
    34, 38,
    43, 45, 47,
    51, 56,
    62, 64, 69,
    77,
    83, 88
]);

let seats          = [];
let suggestedSeats = new Set();

// Construye la matriz de asientos con su estado inicial
function initSeats() {
    seats = [];
    for (let row = 0; row < NUM_ROWS; row++) {
        const rowArr = [];
        for (let col = 0; col < SEATS_PER_ROW; col++) {
            const id = row * SEATS_PER_ROW + col + 1;
            rowArr.push({ id, estado: DEFAULT_OCCUPIED.has(id) });
        }
        seats.push(rowArr);
    }
    suggestedSeats = new Set();
}

// Busca asientos consecutivos disponibles priorizando la fila más cercana al centro.
// Recibe la cantidad deseada y devuelve un Set con los IDs sugeridos, o Set vacío si no hay.
function suggest(cantidad) {
    if (cantidad < 1 || cantidad > SEATS_PER_ROW) {
        return new Set();
    }

    const centerIdx = Math.floor(NUM_ROWS / 2);

    const sortedRows = [...Array(NUM_ROWS).keys()].sort((a, b) => {
        const da = Math.abs(a - centerIdx);
        const db = Math.abs(b - centerIdx);
        return da !== db ? da - db : a - b;
    });

    for (const rowIdx of sortedRows) {
        const row = seats[rowIdx];
        let consecutive = 0;
        let startCol    = -1;

        for (let col = 0; col < row.length; col++) {
            if (!row[col].estado) {
                if (consecutive === 0) startCol = col;
                consecutive++;

                if (consecutive === cantidad) {
                    const result = new Set();
                    for (let j = startCol; j < startCol + cantidad; j++) {
                        result.add(row[j].id);
                    }
                    return result;
                }
            } else {
                consecutive = 0;
                startCol    = -1;
            }
        }
    }

    return new Set();
}

// Convierte un ID numérico en etiqueta legible, ej. ID 43 → "E3"
function seatLabel(id) {
    const rowIdx = Math.floor((id - 1) / SEATS_PER_ROW);
    const colIdx = (id - 1) % SEATS_PER_ROW;
    return `${ROW_LABELS[rowIdx]}${colIdx + 1}`;
}

// Genera el HTML de la sala completa y lo vuelca en #seating-area
function renderSeats() {
    const area = document.getElementById('seating-area');
    area.innerHTML = '';

    seats.forEach((rowSeats, rowIdx) => {
        const rowDiv = document.createElement('div');
        rowDiv.classList.add('row');

        const labelL = document.createElement('span');
        labelL.classList.add('row-label');
        labelL.textContent = ROW_LABELS[rowIdx];
        rowDiv.appendChild(labelL);

        const seatsRow = document.createElement('div');
        seatsRow.classList.add('seats-row');

        rowSeats.forEach((seat, colIdx) => {
            if (colIdx === 5) {
                const gap = document.createElement('div');
                gap.classList.add('aisle-gap');
                seatsRow.appendChild(gap);
            }

            const btn = document.createElement('button');
            btn.classList.add('seat');
            btn.dataset.id = seat.id;
            btn.textContent = colIdx + 1;
            btn.title = `Fila ${ROW_LABELS[rowIdx]} — Asiento ${colIdx + 1}`;

            if (seat.estado) {
                btn.classList.add('occupied');
                btn.disabled = true;
                btn.setAttribute('aria-label', 'Asiento ocupado');
            } else if (suggestedSeats.has(seat.id)) {
                btn.classList.add('suggested');
                btn.setAttribute('aria-label', 'Asiento sugerido');
            } else {
                btn.classList.add('available');
                btn.setAttribute('aria-label', 'Asiento disponible');
            }

            seatsRow.appendChild(btn);
        });

        rowDiv.appendChild(seatsRow);

        const labelR = document.createElement('span');
        labelR.classList.add('row-label');
        labelR.textContent = ROW_LABELS[rowIdx];
        rowDiv.appendChild(labelR);

        area.appendChild(rowDiv);
    });
}

// Lee la cantidad ingresada, ejecuta suggest() y muestra los asientos sugeridos
function handleSuggest() {
    const input    = document.getElementById('cantidad');
    const cantidad = parseInt(input.value, 10);
    const btnConf  = document.getElementById('btn-confirmar');
    const summary  = document.getElementById('reservation-summary');

    if (isNaN(cantidad) || cantidad < 1) {
        showMessage('Por favor ingresa una cantidad válida (mínimo 1).', 'error');
        return;
    }

    if (cantidad > SEATS_PER_ROW) {
        showMessage(`La cantidad máxima por reserva es ${SEATS_PER_ROW} asientos.`, 'error');
        suggestedSeats = new Set();
        btnConf.disabled = true;
        summary.style.display = 'none';
        renderSeats();
        return;
    }

    suggestedSeats = suggest(cantidad);
    renderSeats();

    if (suggestedSeats.size === 0) {
        showMessage('No hay asientos consecutivos disponibles para esa cantidad.', 'error');
        btnConf.disabled = true;
        summary.style.display = 'none';
        return;
    }

    const labels = [...suggestedSeats].map(seatLabel);
    showMessage(`Se encontraron ${cantidad} asiento(s) consecutivo(s).`, 'info');
    btnConf.disabled = false;

    summary.style.display = 'block';
    summary.innerHTML =
        `<h4>Asientos Sugeridos</h4>` +
        `<p>${labels.map(l => `<span class="seat-tag">${l}</span>`).join('')}</p>`;
}

// Marca los asientos sugeridos como ocupados y actualiza la vista
function handleConfirm() {
    if (suggestedSeats.size === 0) return;

    const labels = [...suggestedSeats].map(seatLabel);

    suggestedSeats.forEach(id => {
        const rowIdx = Math.floor((id - 1) / SEATS_PER_ROW);
        const colIdx = (id - 1) % SEATS_PER_ROW;
        seats[rowIdx][colIdx].estado = true;
    });

    showMessage(`¡Reserva confirmada! Asientos: ${labels.join(', ')}`, 'success');

    suggestedSeats = new Set();
    document.getElementById('btn-confirmar').disabled = true;
    document.getElementById('reservation-summary').style.display = 'none';

    renderSeats();
}

function handleClear() {
    suggestedSeats = new Set();
    document.getElementById('btn-confirmar').disabled = true;
    document.getElementById('message-area').innerHTML = '';
    document.getElementById('reservation-summary').style.display = 'none';
    renderSeats();
}

function showMessage(text, type) {
    const icons = { info: 'ℹ️', success: '✅', error: '❌' };
    document.getElementById('message-area').innerHTML =
        `<div class="message-${type}">${icons[type]} ${text}</div>`;
}

document.addEventListener('DOMContentLoaded', () => {
    initSeats();
    renderSeats();
});
