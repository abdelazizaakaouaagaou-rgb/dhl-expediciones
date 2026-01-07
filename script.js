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
const dbRef = ref(db, 'audit_analytics_v7');
let erroresChart;
let datosLocales = [];

// ESCUCHA DE BUSCADOR
document.getElementById('filtroNombre').addEventListener('input', () => renderizarApp());

// GUARDAR DATOS
document.getElementById('btnGuardar').addEventListener('click', () => {
    const cargador = document.getElementById('cargador').value.trim();
    const total = parseInt(document.getElementById('totalBuenos').value) || 0;
    const err = parseInt(document.getElementById('cantidadError').value) || 0;
    const refCamion = document.getElementById('referencia').value.trim();
    const tipo = document.getElementById('tipoError').value;
    const comentario = document.getElementById('comentario').value.trim();
    const fechaActual = new Date();
    const idError = "DHL-" + Math.floor(1000 + Math.random() * 9000);

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
    } else {
        alert("⚠️ Completa el Operario y Total de Palets.");
    }
});

// DESCARGA INICIAL DE NUBE
onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    datosLocales = data ? Object.keys(data).map(id => ({ id, ...data[id] })) : [];
    renderizarApp();
});

// FUNCIÓN DE RENDERIZADO CON FILTROS
function renderizarApp() {
    const filtro = document.getElementById('filtroNombre').value.toLowerCase();
    const tabla = document.getElementById('cuerpoTabla');
    const rankingDiv = document.getElementById('rankingList');
    
    tabla.innerHTML = ""; rankingDiv.innerHTML = "";
    
    let resumen = {};
    let globalT = 0, globalE = 0;
    let diasSemanaE = [0, 0, 0, 0, 0, 0, 0];

    // FILTRADO POR NOMBRE
    const filtrados = datosLocales.filter(item => 
        item.cargador.toLowerCase().includes(filtro)
    );

    filtrados.sort((a,b) => b.ts - a.ts).forEach(item => {
        globalT += item.total;
        globalE += item.err;
        
        let idx = item.diaSemana === 0 ? 6 : item.diaSemana - 1;
        diasSemanaE[idx] += item.err;

        tabla.innerHTML += `
            <tr>
                <td>${item.fecha}</td>
                <td><span class="id-tag">${item.idError}</span></td>
                <td><strong>${item.cargador.toUpperCase()}</strong></td>
                <td>${item.refCamion}</td>
                <td style="color:${item.err > 0 ? 'red' : 'green'}; font-weight:bold">${item.err}</td>
                <td style="font-size:0.7rem; color:#666">${item.comentario || 'N/A'}</td>
                <td><button onclick="window.del('${item.id}')" style="cursor:pointer; border:none; background:none;">🗑️</button></td>
            </tr>`;

        if(!resumen[item.cargador]) resumen[item.cargador] = { t: 0, e: 0 };
        resumen[item.cargador].t += item.total;
        resumen[item.cargador].e += item.err;
    });

    // ACTUALIZAR KPIs
    const qG = globalT > 0 ? (((globalT - globalE) / globalT) * 100).toFixed(1) : "100";
    const gEl = document.getElementById('globalPerc');
    gEl.innerText = qG + "%";
    gEl.style.color = qG > 98 ? 'var(--green)' : (qG > 95 ? '#ffa500' : 'var(--dhl-red)');
    document.getElementById('globalTotal').innerText = globalT;
    document.getElementById('globalErrors').innerText = globalE;

    // ACTUALIZAR RANKING
    Object.entries(resumen)
    .map(([name, d]) => ({ name, porc: ((d.t - d.e) / d.t * 100), ...d }))
    .sort((a, b) => b.porc - a.porc)
    .forEach((op, i) => {
        const medal = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : ''));
        rankingDiv.innerHTML += `
            <div class="ranking-item" style="border-left-color:${op.porc > 98 ? 'var(--green)' : 'var(--dhl-red)'}">
                <div><span>${medal}</span> <strong>${op.name.toUpperCase()}</strong></div>
                <div style="font-weight:bold">${op.porc.toFixed(1)}%</div>
            </div>`;
    });

    actualizarGrafico(diasSemanaE);
    document.getElementById('chartTitle').innerText = filtro ? `📊 Tendencia de: ${filtro.toUpperCase()}` : "📊 Tendencia Semanal de Errores";
}

function actualizarGrafico(datos) {
    const ctx = document.getElementById('erroresChart').getContext('2d');
    if (erroresChart) erroresChart.destroy();
    erroresChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
            datasets: [{ label: 'Errores', data: datos, backgroundColor: '#D40511', borderRadius: 5 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

// EXCEL Y RESET
document.getElementById('btnExportar').onclick = () => {
    XLSX.writeFile(XLSX.utils.table_to_book(document.getElementById("tablaAuditoria")), "Reporte_Filtro_DHL.xlsx");
};
window.del = (id) => { if(confirm("¿Eliminar?")) remove(ref(db, `audit_analytics_v7/${id}`)); };
document.getElementById('btnReset').onclick = () => { if(confirm("¿Reiniciar?")) remove(dbRef); };