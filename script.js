import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// REVISA QUE ESTAS LLAVES SEAN LAS TUYAS (Imagen 147106.png)
const firebaseConfig = {
    apiKey: "AIzaSyA9w8bgR16u-ohUThbKqrpoFxGyif-6mI0",
    authDomain: "dhl-sistemas.firebaseapp.com",
    databaseURL: "https://dhl-sistemas-default-rtdb.firebaseio.com",
    projectId: "dhl-sistemas",
    storageBucket: "dhl-sistemas.firebasestorage.app",
    messagingSenderId: "167500803552",
    appId: "1:167500803552:web:dd8a75e082e184fc9d0f85"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const dbRef = ref(db, 'calidad_expediciones');

// --- FUNCIÓN DEL BOTÓN GUARDAR ---
const btnGuardar = document.getElementById('btnGuardar');

btnGuardar.addEventListener('click', () => {
    // Capturar los valores de los inputs
    const cargador = document.getElementById('cargador').value.trim();
    const total = parseInt(document.getElementById('totalBuenos').value) || 0;
    const err = parseInt(document.getElementById('cantidadError').value) || 0;
    const refCamion = document.getElementById('referencia').value.trim();
    const tipo = document.getElementById('tipoError').value;

    // Validación mínima
    if (cargador === "") {
        alert("⚠️ Por favor, escribe el nombre del operario.");
        return;
    }

    // Guardar en la nube
    push(dbRef, {
        cargador: cargador,
        total: total,
        err: err,
        refCamion: refCamion,
        tipo: tipo,
        fecha: new Date().toLocaleDateString()
    })
    .then(() => {
        // Esto se ejecuta si se guardó bien
        console.log("¡Datos guardados con éxito!");
        document.getElementById('cantidadError').value = "0";
        document.getElementById('referencia').value = "";
        alert("✅ Registro guardado en la nube");
    })
    .catch((error) => {
        // Esto se ejecuta si hay un error (ej: reglas mal configuradas)
        console.error("Error al guardar:", error);
        alert("❌ Error de conexión: " + error.message);
    });
});

// --- LEER DATOS Y ACTUALIZAR RANKING ---
onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    const lista = data ? Object.keys(data).map(id => ({ id, ...data[id] })) : [];
    const tabla = document.getElementById('cuerpoTabla');
    const rankingDiv = document.getElementById('rankingList');
    
    tabla.innerHTML = ""; 
    rankingDiv.innerHTML = "";
    let resumen = {};

    lista.reverse().forEach(item => {
        const totalNum = item.total || 1;
        const errNum = item.err || 0;
        const porcIndiv = (((totalNum - errNum) / totalNum) * 100).toFixed(1);
        
        tabla.innerHTML += `
            <tr>
                <td>${item.fecha}</td>
                <td><strong>${item.cargador.toUpperCase()}</strong></td>
                <td>${item.total}</td>
                <td style="color:red">${item.err}</td>
                <td style="font-weight:bold">${porcIndiv}%</td>
                <td><button onclick="window.del('${item.id}')" style="border:none; background:none; cursor:pointer;">🗑️</button></td>
            </tr>`;

        if(!resumen[item.cargador]) resumen[item.cargador] = { t: 0, e: 0 };
        resumen[item.cargador].t += totalNum;
        resumen[item.cargador].e += errNum;
    });

    Object.entries(resumen)
    .map(([name, data]) => {
        const porcentaje = (((data.t - data.e) / data.t) * 100).toFixed(1);
        return { name, porcentaje, ...data };
    })
    .sort((a, b) => b.porcentaje - a.porcentaje)
    .forEach(op => {
        const color = op.porcentaje > 98 ? '#28a745' : (op.porcentaje > 95 ? '#ffa500' : '#d40511');
        rankingDiv.innerHTML += `
            <div class="ranking-item" style="border-left: 8px solid ${color}; background: white; margin-bottom: 5px; padding: 10px; display: flex; justify-content: space-between; align-items: center; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <div>
                    <div style="font-weight:bold; font-size: 0.9rem;">${op.name.toUpperCase()}</div>
                    <div style="font-size:0.7rem; color:#666;">Cargados: ${op.t} | Errores: ${op.e}</div>
                </div>
                <div style="font-size: 1.2rem; font-weight: bold; color: ${color};">${op.porcentaje}%</div>
            </div>`;
    });
});

// Funciones globales para botones
window.del = (id) => { if(confirm("¿Eliminar registro?")) remove(ref(db, `calidad_expediciones/${id}`)); };
document.getElementById('btnReset').onclick = () => { if(confirm("¿Resetear todo el mes?")) remove(dbRef); };