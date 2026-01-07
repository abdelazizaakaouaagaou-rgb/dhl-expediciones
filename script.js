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
const dbRef = ref(db, 'calidad_expediciones_v3'); // Nueva tabla v3

// GUARDAR
document.getElementById('btnGuardar').addEventListener('click', () => {
    const cargador = document.getElementById('cargador').value.trim();
    const total = parseInt(document.getElementById('totalBuenos').value) || 0;
    const err = parseInt(document.getElementById('cantidadError').value) || 0;
    const refCamion = document.getElementById('referencia').value.trim();
    const tipo = document.getElementById('tipoError').value;

    if (cargador && total > 0) {
        push(dbRef, { cargador, total, err, refCamion, tipo, fecha: new Date().toLocaleDateString() })
        .then(() => {
            document.getElementById('cantidadError').value = "0";
            document.getElementById('referencia').value = "";
            console.log("Guardado correctamente");
        });
    } else { alert("Completa el nombre y total de palets."); }
});

// ACTUALIZAR DASHBOARD
onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    const lista = data ? Object.keys(data).map(id => ({ id, ...data[id] })) : [];
    
    const tabla = document.getElementById('cuerpoTabla');
    const rankingDiv = document.getElementById('rankingList');
    tabla.innerHTML = ""; rankingDiv.innerHTML = "";
    
    let resumen = {};
    let globalT = 0; let globalE = 0;

    lista.reverse().forEach(item => {
        globalT += item.total;
        globalE += item.err;
        const porcIndiv = (((item.total - item.err) / item.total) * 100).toFixed(1);
        
        tabla.innerHTML += `
            <tr>
                <td>${item.fecha}</td>
                <td><strong>${item.cargador.toUpperCase()}</strong></td>
                <td>${item.refCamion}</td>
                <td>${item.total}</td>
                <td style="color:red">${item.err}</td>
                <td style="font-weight:bold">${porcIndiv}%</td>
                <td><button onclick="window.del('${item.id}')" style="border:none; background:none; cursor:pointer;">🗑️</button></td>
            </tr>`;

        if(!resumen[item.cargador]) resumen[item.cargador] = { t: 0, e: 0 };
        resumen[item.cargador].t += item.total;
        resumen[item.cargador].e += item.err;
    });

    // Actualizar KPIs Superiores
    const qGlobal = globalT > 0 ? (((globalT - globalE) / globalT) * 100).toFixed(1) : "100";
    const gEl = document.getElementById('globalPerc');
    gEl.innerText = qGlobal + "%";
    gEl.style.color = qGlobal > 98 ? 'var(--green)' : (qGlobal > 95 ? 'var(--orange)' : 'var(--dhl-red)');
    document.getElementById('globalTotal').innerText = globalT;
    document.getElementById('globalErrors').innerText = globalE;

    // Ranking Ordenado con Medallas
    Object.entries(resumen)
    .map(([name, data]) => ({ name, porc: ((data.t - data.e) / data.t * 100), ...data }))
    .sort((a, b) => b.porc - a.porc)
    .forEach((op, index) => {
        const medal = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : ''));
        const color = op.porc > 98 ? 'var(--green)' : (op.porc > 95 ? 'var(--orange)' : 'var(--dhl-red)');
        
        rankingDiv.innerHTML += `
            <div class="ranking-item" style="border-left-color: ${color}">
                <div style="display:flex; align-items:center;">
                    <span class="medal">${medal}</span>
                    <div class="rank-info">
                        <span class="rank-name">${op.name.toUpperCase()}</span>
                        <span class="rank-stats">Palets: ${op.t} | Errores: ${op.e}</span>
                    </div>
                </div>
                <div class="rank-perc" style="color:${color}">${op.porc.toFixed(1)}%</div>
            </div>`;
    });
});

window.del = (id) => { if(confirm("¿Eliminar?")) remove(ref(db, `calidad_expediciones_v3/${id}`)); };
document.getElementById('btnReset').onclick = () => { if(confirm("¿Resetear mes?")) remove(dbRef); };