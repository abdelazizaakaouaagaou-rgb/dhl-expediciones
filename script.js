import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyA9w8bgR16u-ohUThbKqrpoFxGyif-6mI0",
    authDomain: "dhl-sistemas.firebaseapp.com",
    databaseURL: "https://dhl-sistemas-default-rtdb.firebaseio.com",
    projectId: "dhl-sistemas",
    storageBucket: "dhl-sistemas.firebasestorage.app",
    messagingSenderId: "167500803552",
    appId: "1:167500803552:web:dd8a75e082e184fc9d0f85"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const dbRef = ref(db, 'audit_analytics_v9');
let erroresChart;
let datosCache = []; 

// FILTRO EN TIEMPO REAL
document.getElementById('filtroNombre').addEventListener('input', () => {
    renderizarTodo();
});

// GUARDAR NUEVO REGISTRO
document.getElementById('btnGuardar').addEventListener('click', () => {
    const cargador = document.getElementById('cargador').value.trim();
    const total = parseInt(document.getElementById('totalBuenos').value) || 0;
    const err = parseInt(document.getElementById('cantidadError').value) || 0;
    const refCamion = document.getElementById('referencia').value.trim();
    const tipo = document.getElementById('tipoError').value;
    const comentario = document.getElementById('comentario').value.trim();
    const idError = "DHL-" + Math.floor(1000 + Math.random() * 9999);
    const fechaActual = new Date();

    if (cargador && total > 0) {
        push(dbRef, { 
            idError, cargador, total, err, refCamion, tipo, comentario,
            fecha: fechaActual.toLocaleDateString(),
            diaSemana: fechaActual.getDay(),
            ts: Date.now()
        }).then(() => {
            document.getElementById('cantidadError').value = "0";
            document.getElementById('referencia').value = "";
            document.getElementById('comentario').value = "";
        });
    }
});

// CARGAR DATOS DE FIREBASE
onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    datosCache = data ? Object.keys(data).map(id => ({ id, ...data[id] })) : [];
    renderizarTodo();
});

// FUNCIÓN CENTRAL DE FILTRADO Y CÁLCULOS
function renderizarTodo() {
    const filtro = document.getElementById('filtroNombre').value.toLowerCase();
    const tabla = document.getElementById('cuerpoTabla');
    const rankingDiv = document.getElementById('rankingList');
    
    tabla.innerHTML = ""; rankingDiv.innerHTML = "";
    
    let resumenOperarios = {};
    let gT = 0, gE = 0;
    let barData = [0, 0, 0, 0, 0, 0, 0];

    // 1. Filtrar los datos locales según el buscador
    const datosFiltrados = datosCache.filter(item => 
        item.cargador.toLowerCase().includes(filtro)
    );

    // 2. Recalcular TODO en base a los datos filtrados
    datosFiltrados.sort((a,b) => b.ts - a.ts).forEach(item => {
        gT += item.total;
        gE += item.err;
        
        // Asignar al gráfico (Lunes=0...Domingo=6)
        let dayIdx = item.diaSemana === 0 ? 6 : item.diaSemana - 1;
        barData[dayIdx] += item.err;

        // Escribir en la tabla
        tabla.innerHTML += `
            <tr>
                <td>${item.fecha}</td>
                <td><span style="background:#eee; padding:3px; border-radius:4px; font-weight:bold">${item.idError}</span></td>
                <td><strong>${item.cargador.toUpperCase()}</strong></td>
                <td style="color:${item.err > 0 ? 'red' : 'green'}; font-weight:bold">${item.err}</td>
                <td><small>${item.comentario || '-'}</small></td>
                <td class="no-print"><button onclick="window.del('${item.id}')">🗑️</button></td>
            </tr>`;

        // Agrupar para el Ranking
        if(!resumenOperarios[item.cargador]) resumenOperarios[item.cargador] = { t: 0, e: 0 };
        resumenOperarios[item.cargador].t += item.total;
        resumenOperarios[item.cargador].e += item.err;
    });

    // 3. Actualizar los 3 KPIs de cabecera
    const calidadFinal = gT > 0 ? (((gT - gE) / gT) * 100).toFixed(1) : "100";
    document.getElementById('globalPerc').innerText = calidadFinal + "%";
    document.getElementById('globalTotal').innerText = gT;
    document.getElementById('globalErrors').innerText = gE;

    // 4. Actualizar Ranking de operarios filtrados
    Object.entries(resumenOperarios)
    .map(([name, d]) => ({ name, porc: ((d.t - d.e) / d.t * 100), ...d }))
    .sort((a, b) => b.porc - a.porc)
    .forEach((op, i) => {
        const medal = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : ''));
        rankingDiv.innerHTML += `
            <div class="ranking-item" style="border-left-color:${op.porc > 98 ? 'var(--green)' : 'var(--dhl-red)'}">
                <span>${medal} <strong>${op.name.toUpperCase()}</strong></span>
                <span style="font-weight:bold">${op.porc.toFixed(1)}%</span>
            </div>`;
    });

    actualizarGrafico(barData);
    document.getElementById('chartTitle').innerText = filtro ? `📊 Rendimiento: ${filtro.toUpperCase()}` : "📊 Tendencia Global de Errores";
}

function actualizarGrafico(puntos) {
    const ctx = document.getElementById('erroresChart').getContext('2d');
    if (erroresChart) erroresChart.destroy();
    erroresChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
            datasets: [{ label: 'Errores', data: puntos, backgroundColor: '#D40511', borderRadius: 5 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

// EXPORTACIONES
document.getElementById('btnPdf').onclick = () => {
    const opt = { margin: 10, filename: 'DHL_Audit.pdf', html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    html2pdf().set(opt).from(document.getElementById('main-content')).save();
};

document.getElementById('btnExportar').onclick = () => {
    XLSX.writeFile(XLSX.utils.table_to_book(document.getElementById("tablaAuditoria")), "Reporte_DHL.xlsx");
};

window.del = (id) => { if(confirm("¿Eliminar registro?")) remove(ref(db, `audit_analytics_v9/${id}`)); };
document.getElementById('btnReset').onclick = () => { if(confirm("¿Borrar historial completo?")) remove(dbRef); };