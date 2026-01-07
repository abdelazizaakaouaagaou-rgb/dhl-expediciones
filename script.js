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
const dbRef = ref(db, 'calidad_v4');

let erroresChart; // Variable para el gráfico

// GUARDAR
document.getElementById('btnGuardar').addEventListener('click', () => {
    const cargador = document.getElementById('cargador').value.trim();
    const total = parseInt(document.getElementById('totalBuenos').value) || 0;
    const err = parseInt(document.getElementById('cantidadError').value) || 0;
    const refCamion = document.getElementById('referencia').value.trim();
    const tipo = document.getElementById('tipoError').value;
    const fechaActual = new Date();

    if (cargador && total > 0) {
        push(dbRef, { 
            cargador, total, err, refCamion, tipo, 
            fecha: fechaActual.toLocaleDateString(),
            diaSemana: fechaActual.getDay() // 0=Dom, 1=Lun...
        });
        document.getElementById('cantidadError').value = "0";
        document.getElementById('referencia').value = "";
    }
});

onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    const lista = data ? Object.keys(data).map(id => ({ id, ...data[id] })) : [];
    
    const tabla = document.getElementById('cuerpoTabla');
    const rankingDiv = document.getElementById('rankingList');
    tabla.innerHTML = ""; rankingDiv.innerHTML = "";
    
    let resumen = {};
    let globalT = 0, globalE = 0;
    let diasErrores = [0, 0, 0, 0, 0, 0, 0]; // Lun a Dom

    lista.reverse().forEach(item => {
        globalT += item.total;
        globalE += item.err;
        
        // Sumar errores al gráfico (ajuste para que Lun sea 0)
        let idx = item.diaSemana === 0 ? 6 : item.diaSemana - 1;
        diasErrores[idx] += item.err;

        const porc = (((item.total - item.err) / item.total) * 100).toFixed(1);
        tabla.innerHTML += `<tr><td>${item.fecha}</td><td>${item.cargador}</td><td>${item.refCamion}</td><td>${item.total}</td><td style="color:red">${item.err}</td><td>${porc}%</td><td><button onclick="window.del('${item.id}')">🗑️</button></td></tr>`;

        if(!resumen[item.cargador]) resumen[item.cargador] = { t: 0, e: 0 };
        resumen[item.cargador].t += item.total;
        resumen[item.cargador].e += item.err;
    });

    // Actualizar KPIs
    const qGlobal = globalT > 0 ? (((globalT - globalE) / globalT) * 100).toFixed(1) : "100";
    document.getElementById('globalPerc').innerText = qGlobal + "%";
    document.getElementById('globalTotal').innerText = globalT;
    document.getElementById('globalErrors').innerText = globalE;

    // Actualizar Ranking
    Object.entries(resumen)
    .map(([name, d]) => ({ name, porc: ((d.t - d.e) / d.t * 100), ...d }))
    .sort((a, b) => b.porc - a.porc)
    .forEach((op, i) => {
        const medal = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : ''));
        rankingDiv.innerHTML += `<div class="ranking-item" style="border-left-color:${op.porc > 98 ? '#28a745' : '#d40511'}"><span>${medal} <strong>${op.name}</strong></span> <span>${op.porc.toFixed(1)}%</span></div>`;
    });

    actualizarGrafico(diasErrores);
});

function actualizarGrafico(datos) {
    const ctx = document.getElementById('erroresChart').getContext('2d');
    if (erroresChart) erroresChart.destroy();
    erroresChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
            datasets: [{
                label: 'Cantidad de Errores',
                data: datos,
                backgroundColor: '#D40511'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

window.del = (id) => { if(confirm("¿Eliminar?")) remove(ref(db, `calidad_v4/${id}`)); };
document.getElementById('btnReset').onclick = () => { if(confirm("¿Resetear?")) remove(dbRef); };