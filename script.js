/**
 * TEATRO-UNA — Lógica de reserva de asientos
 *
 * Estructura de cada asiento:
 *   { id: number, estado: boolean }
 *   estado = true  → ocupado
 *   estado = false → disponible
 */

// ============================================================
// CONFIGURACIÓN DEL TEATRO
// ============================================================

const ROW_LABELS    = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
const SEATS_PER_ROW = 10;
const NUM_ROWS      = ROW_LABELS.length;

// IDs ocupados por defecto (precarga inicial)
const DEFAULT_OCCUPIED = new Set([
     3,  7,              // Fila A
    11, 15, 19,          // Fila B
    22, 26, 30,          // Fila C
    34, 38,              // Fila D
    43, 45, 47,          // Fila E (centro)
    51, 56,              // Fila F
    62, 64, 69,          // Fila G
    77,                  // Fila H
    83, 88               // Fila I
]);

// ============================================================
// ESTADO GLOBAL
// ============================================================

/** @type {Array<Array<{id:number, estado:boolean}>>} Matriz de asientos */
let seats = [];

/** @type {Set<number>} IDs de asientos actualmente sugeridos */
let suggestedSeats = new Set();

// ============================================================
// INICIALIZACIÓN
// ============================================================

/**
 * Construye la matriz de asientos con su estado inicial.
 */
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

// ============================================================
// FUNCIÓN PRINCIPAL: suggest(cantidad)
// ============================================================

/**
 * Busca asientos consecutivos disponibles priorizando la fila
 * más cercana al centro del teatro.
 *
 * @param {number} cantidad - Asientos a reservar
 * @returns {Set<number>} IDs sugeridos, o Set vacío si no hay solución
 */
function suggest(cantidad) {
    // Caso borde: solicitud imposible
    if (cantidad < 1 || cantidad > SEATS_PER_ROW) {
        return new Set();
    }

    // Índice de la fila central (0-based)
    const centerIdx = Math.floor(NUM_ROWS / 2);

    // Ordenar filas por distancia al centro; en caso de empate,
    // la de menor índice (más hacia el escenario) tiene prioridad.
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
                // Asiento libre
                if (consecutive === 0) startCol = col;
                consecutive++;

                if (consecutive === cantidad) {
                    // Grupo encontrado: recopilar IDs
                    const result = new Set();
                    for (let j = startCol; j < startCol + cantidad; j++) {
                        result.add(row[j].id);
                    }
                    return result;
                }
            } else {
                // Asiento ocupado: reiniciar racha
                consecutive = 0;
                startCol    = -1;
            }
        }
    }

    // Sin fila con suficientes consecutivos disponibles
    return new Set();
}

// ============================================================
// RENDERIZADO
// ============================================================

/**
 * Convierte un ID de asiento en una etiqueta legible, ej. "E3".
 * @param {number} id
 * @returns {string}
 */
function seatLabel(id) {
    const rowIdx = Math.floor((id - 1) / SEATS_PER_ROW);
    const colIdx = (id - 1) % SEATS_PER_ROW;
    return `${ROW_LABELS[rowIdx]}${colIdx + 1}`;
}

/**
 * Genera el HTML de todos los asientos y lo vuelca en #seating-area.
 */
function renderSeats() {
    const area = document.getElementById('seating-area');
    area.innerHTML = '';

    seats.forEach((rowSeats, rowIdx) => {
        const rowDiv = document.createElement('div');
        rowDiv.classList.add('row');

        // Etiqueta izquierda
        const labelL = document.createElement('span');
        labelL.classList.add('row-label');
        labelL.textContent = ROW_LABELS[rowIdx];
        rowDiv.appendChild(labelL);

        // Contenedor de butacas
        const seatsRow = document.createElement('div');
        seatsRow.classList.add('seats-row');

        rowSeats.forEach((seat, colIdx) => {
            // Pasillo central entre columna 5 y 6 (0-based 4 y 5)
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

        // Etiqueta derecha
        const labelR = document.createElement('span');
        labelR.classList.add('row-label');
        labelR.textContent = ROW_LABELS[rowIdx];
        rowDiv.appendChild(labelR);

        area.appendChild(rowDiv);
    });
}

// ============================================================
// MANEJADORES DE EVENTOS
// ============================================================

/**
 * Botón "Sugerir Asientos": ejecuta suggest() y actualiza la vista.
 */
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

    // Ejecutar función principal
    suggestedSeats = suggest(cantidad);
    renderSeats();

    if (suggestedSeats.size === 0) {
        showMessage('No hay asientos consecutivos disponibles para esa cantidad.', 'error');
        btnConf.disabled = true;
        summary.style.display = 'none';
        return;
    }

    // Mostrar resultado positivo
    const labels = [...suggestedSeats].map(seatLabel);
    showMessage(`Se encontraron ${cantidad} asiento(s) consecutivo(s).`, 'info');
    btnConf.disabled = false;

    summary.style.display = 'block';
    summary.innerHTML =
        `<h4>Asientos Sugeridos</h4>` +
        `<p>${labels.map(l => `<span class="seat-tag">${l}</span>`).join('')}</p>`;
}

/**
 * Botón "Confirmar Reserva": marca los asientos sugeridos como ocupados.
 */
function handleConfirm() {
    if (suggestedSeats.size === 0) return;

    const labels = [...suggestedSeats].map(seatLabel);

    // Actualizar matriz: marcar como ocupados
    suggestedSeats.forEach(id => {
        const rowIdx = Math.floor((id - 1) / SEATS_PER_ROW);
        const colIdx = (id - 1) % SEATS_PER_ROW;
        seats[rowIdx][colIdx].estado = true;
    });

    showMessage(`¡Reserva confirmada! Asientos: ${labels.join(', ')}`, 'success');

    // Limpiar estado de sugerencia
    suggestedSeats = new Set();
    document.getElementById('btn-confirmar').disabled = true;
    document.getElementById('reservation-summary').style.display = 'none';

    renderSeats();
}

/**
 * Botón "Limpiar": descarta la sugerencia actual sin confirmar.
 */
function handleClear() {
    suggestedSeats = new Set();
    document.getElementById('btn-confirmar').disabled = true;
    document.getElementById('message-area').innerHTML = '';
    document.getElementById('reservation-summary').style.display = 'none';
    renderSeats();
}

/**
 * Muestra un mensaje con estilo en #message-area.
 * @param {string} text
 * @param {'info'|'success'|'error'} type
 */
function showMessage(text, type) {
    const icons = { info: 'ℹ️', success: '✅', error: '❌' };
    document.getElementById('message-area').innerHTML =
        `<div class="message-${type}">${icons[type]} ${text}</div>`;
}

// ============================================================
// ARRANQUE
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    initSeats();
    renderSeats();
});
