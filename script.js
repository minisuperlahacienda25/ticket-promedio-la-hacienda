import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const STORAGE_KEY = "minisuper-turnos";
const COLLECTION_NAME = "minisuper_turnos";

const form = document.getElementById("turno-form");
const fechaInput = document.getElementById("fecha");
const efectivoInicialInput = document.getElementById("efectivoInicial");
const ventaTurnoInput = document.getElementById("ventaTurno");
const numeroTicketsInput = document.getElementById("numeroTickets");
const totalCalculadoInput = document.getElementById("totalCalculado");
const promedioTicketInput = document.getElementById("promedioTicket");
const tablaRegistros = document.getElementById("tabla-registros");
const totalTurnos = document.getElementById("total-turnos");
const ventaAcumulada = document.getElementById("venta-acumulada");
const promedioGlobal = document.getElementById("promedio-global");
const limpiarFormBtn = document.getElementById("limpiar-form");
const cancelarEdicionBtn = document.getElementById("cancelar-edicion");
const borrarRegistrosBtn = document.getElementById("borrar-registros");
const exportarCsvBtn = document.getElementById("exportar-csv");
const generarPdfBtn = document.getElementById("generar-pdf");
const filtroEmpleada = document.getElementById("filtro-empleada");
const filtroFechaInicio = document.getElementById("filtro-fecha-inicio");
const filtroFechaFin = document.getElementById("filtro-fecha-fin");
const ordenRegistros = document.getElementById("orden-registros");
const limpiarFiltrosBtn = document.getElementById("limpiar-filtros");
const analisisEmpleadas = document.getElementById("analisis-empleadas");
const modoAviso = document.getElementById("modo-aviso");
const authOverlay = document.getElementById("auth-overlay");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const sessionUser = document.getElementById("session-user");
const cerrarSesionBtn = document.getElementById("cerrar-sesion");
const topVentasIds = ["topVenta1", "topVenta2", "topVenta3", "topVenta4", "topVenta5"];
const bajaRotacionIds = ["bajaRotacion1", "bajaRotacion2", "bajaRotacion3"];
const mermaProductoInput = document.getElementById("mermaProducto");
const mermaCantidadInput = document.getElementById("mermaCantidad");

const EMPLEADAS = ["NITZIA", "PAOLA", "VALERIA"];

let registros = [];
let modoDatos = "local";
let editingId = null;
let db = null;
let auth = null;
let unsubscribeTurnos = null;
let currentUser = null;

fechaInput.value = obtenerFechaHoy();
actualizarCalculados();
registrarEventos();
inicializarDatos();
document.body.classList.add("locked");

function registrarEventos() {
  [efectivoInicialInput, ventaTurnoInput, numeroTicketsInput].forEach((input) => {
    input.addEventListener("input", actualizarCalculados);
  });

  [filtroEmpleada, filtroFechaInicio, filtroFechaFin, ordenRegistros].forEach((control) => {
    control.addEventListener("change", refrescarVista);
  });

  form.addEventListener("submit", manejarEnvioFormulario);
  limpiarFormBtn.addEventListener("click", limpiarFormularioCompleto);
  cancelarEdicionBtn.addEventListener("click", cancelarEdicion);
  borrarRegistrosBtn.addEventListener("click", borrarHistorial);
  exportarCsvBtn.addEventListener("click", exportarCsv);
  generarPdfBtn.addEventListener("click", generarPdf);
  loginForm.addEventListener("submit", manejarLogin);
  cerrarSesionBtn.addEventListener("click", manejarCerrarSesion);
  limpiarFiltrosBtn.addEventListener("click", limpiarFiltros);
}

async function inicializarDatos() {
  const config = window.FIREBASE_CONFIG || {};
  const puedeUsarFirebase =
    config.enabled === true &&
    config.firebaseConfig &&
    config.firebaseConfig.projectId &&
    window.location.protocol !== "file:";

  if (puedeUsarFirebase) {
    try {
      const app = initializeApp(config.firebaseConfig);
      db = getFirestore(app);
      auth = getAuth(app);
      modoDatos = "compartido";
      modoAviso.textContent = "Modo compartido activo. Los cambios se sincronizan entre dispositivos que usen este link.";
      await setPersistence(auth, browserLocalPersistence);
      vigilarSesion();
      return;
    } catch (error) {
      console.error(error);
      modoAviso.textContent = "No se pudo conectar Firebase. Se activo el modo local en este navegador.";
    }
  } else {
    modoAviso.textContent = "Modo local activo. Para compartir y editar desde cualquier dispositivo, conecta Firebase y publica la pagina.";
  }

  registros = cargarRegistrosLocales();
  ocultarPantallaAcceso();
  sessionUser.textContent = "Modo local sin inicio de sesion.";
  refrescarVista();
}

function vigilarSesion() {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;

    if (!user) {
      mostrarPantallaAcceso();
      sessionUser.textContent = "No has iniciado sesion.";
      cerrarSesionBtn.classList.add("hidden");
      if (unsubscribeTurnos) {
        unsubscribeTurnos();
        unsubscribeTurnos = null;
      }
      registros = [];
      refrescarVista();
      return;
    }

    ocultarPantallaAcceso();
    sessionUser.textContent = `Sesion: ${user.email}`;
    cerrarSesionBtn.classList.remove("hidden");
    escucharTurnosCompartidos();
  });
}

async function manejarLogin(event) {
  event.preventDefault();

  if (!auth) {
    return;
  }

  const email = loginForm.loginEmail.value.trim();
  const password = loginForm.loginPassword.value;

  loginError.classList.add("hidden");
  loginError.textContent = "";

  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginForm.reset();
  } catch (error) {
    console.error(error);
    loginError.textContent = "No se pudo iniciar sesion. Revisa el correo y la contrasena.";
    loginError.classList.remove("hidden");
  }
}

async function manejarCerrarSesion() {
  if (!auth) {
    return;
  }

  await signOut(auth);
}

function escucharTurnosCompartidos() {
  if (unsubscribeTurnos) {
    unsubscribeTurnos();
  }
  const consulta = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
  unsubscribeTurnos = onSnapshot(
    consulta,
    (snapshot) => {
      registros = snapshot.docs.map((item) => normalizarRegistroRemoto(item));
      refrescarVista();
    },
    (error) => {
      console.error(error);
      modoAviso.textContent = "Firebase esta configurado, pero el acceso a la base de datos fallo. Revisa la configuracion y las reglas.";
    }
  );
}

async function manejarEnvioFormulario(event) {
  event.preventDefault();

  const ventaTurno = leerNumero(ventaTurnoInput.value);
  const numeroTickets = Math.floor(leerNumero(numeroTicketsInput.value));

  if (numeroTickets <= 0) {
    alert("El numero de tickets debe ser mayor que cero.");
    numeroTicketsInput.focus();
    return;
  }

  const payload = construirRegistroPayload(ventaTurno, numeroTickets);

  try {
    if (modoDatos === "compartido") {
      await guardarRegistroRemoto(payload);
    } else {
      guardarRegistroLocal(payload);
    }

    limpiarFormularioCompleto();
  } catch (error) {
    console.error(error);
    alert("No se pudo guardar el turno. Revisa la configuracion o intenta de nuevo.");
  }
}

function construirRegistroPayload(ventaTurno, numeroTickets) {
  const efectivoInicial = leerNumero(efectivoInicialInput.value);

  return {
    fecha: fechaInput.value,
    turno: form.turno.value,
    efectivoInicial,
    ventaTurno,
    numeroTickets,
    totalCalculado: efectivoInicial + ventaTurno,
    promedioTicket: ventaTurno / numeroTickets,
    checklist: obtenerChecklist(),
    topVentas: obtenerListaProductos(topVentasIds),
    bajaRotacion: obtenerListaProductos(bajaRotacionIds),
    merma: {
      producto: mermaProductoInput.value.trim(),
      cantidad: Math.floor(leerNumero(mermaCantidadInput.value)),
    },
    updatedAt: Date.now(),
  };
}

async function guardarRegistroRemoto(payload) {
  if (editingId) {
    await updateDoc(doc(db, COLLECTION_NAME, editingId), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await addDoc(collection(db, COLLECTION_NAME), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

function guardarRegistroLocal(payload) {
  if (editingId) {
    registros = registros.map((registro) =>
      registro.id === editingId ? { ...registro, ...payload, id: editingId } : registro
    );
  } else {
    registros.unshift({
      id: crypto.randomUUID(),
      ...payload,
      createdAt: Date.now(),
    });
  }

  guardarRegistrosLocales();
  refrescarVista();
}

function normalizarRegistroRemoto(item) {
  const data = item.data();

  return {
    id: item.id,
    fecha: data.fecha || "",
    turno: data.turno || "",
    efectivoInicial: Number(data.efectivoInicial || 0),
    ventaTurno: Number(data.ventaTurno || 0),
    numeroTickets: Number(data.numeroTickets || 0),
    totalCalculado: Number(data.totalCalculado || 0),
    promedioTicket: Number(data.promedioTicket || 0),
    checklist: data.checklist || {},
    topVentas: Array.isArray(data.topVentas) ? data.topVentas : [],
    bajaRotacion: Array.isArray(data.bajaRotacion) ? data.bajaRotacion : [],
    merma: data.merma || { producto: "", cantidad: 0 },
    createdAt: data.createdAt?.toMillis?.() || 0,
  };
}

function actualizarCalculados() {
  const efectivoInicial = leerNumero(efectivoInicialInput.value);
  const ventaTurno = leerNumero(ventaTurnoInput.value);
  const numeroTickets = leerNumero(numeroTicketsInput.value);

  totalCalculadoInput.value = formatearMoneda(efectivoInicial + ventaTurno);
  promedioTicketInput.value = formatearMoneda(numeroTickets > 0 ? ventaTurno / numeroTickets : 0);
}

function renderizarRegistros() {
  const registrosFiltrados = obtenerRegistrosVisibles();

  if (!registrosFiltrados.length) {
    tablaRegistros.innerHTML = `
      <tr class="empty-row">
        <td colspan="9">No hay registros para el filtro seleccionado.</td>
      </tr>
    `;
    return;
  }

  tablaRegistros.innerHTML = registrosFiltrados
    .map((registro) => {
      return `
        <tr>
          <td>${registro.fecha}</td>
          <td>${registro.turno}</td>
          <td>${formatearMoneda(registro.efectivoInicial)}</td>
          <td>${formatearMoneda(registro.ventaTurno)}</td>
          <td>${registro.numeroTickets}</td>
          <td>${formatearMoneda(registro.totalCalculado)}</td>
          <td>${formatearMoneda(registro.promedioTicket)}</td>
          <td class="detail-cell">${crearResumenOperativo(registro, "<br>")}</td>
          <td>
            <div class="inline-actions">
              <button type="button" class="secondary small-button" data-action="editar" data-id="${registro.id}">Editar</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  tablaRegistros.querySelectorAll("[data-action='editar']").forEach((button) => {
    button.addEventListener("click", () => iniciarEdicion(button.dataset.id));
  });
}

function renderizarResumen() {
  const registrosFiltrados = obtenerRegistrosVisibles();
  const analisis = obtenerAnalisisResumen(registrosFiltrados);

  totalTurnos.textContent = String(analisis.turnos);
  ventaAcumulada.textContent = formatearMoneda(analisis.ventaTotal);
  promedioGlobal.textContent = formatearMoneda(analisis.promedio);
}

function renderizarAnalisisEmpleadas() {
  const personas = filtroEmpleada.value === "TODAS" ? EMPLEADAS : [filtroEmpleada.value];
  const registrosBase = obtenerRegistrosVisibles(false);

  analisisEmpleadas.innerHTML = personas
    .map((empleada) => {
      const datos = registrosBase.filter((registro) => registro.turno === empleada);
      const turnos = datos.length;
      const venta = datos.reduce((acumulado, registro) => acumulado + registro.ventaTurno, 0);
      const tickets = datos.reduce((acumulado, registro) => acumulado + registro.numeroTickets, 0);
      const promedio = tickets > 0 ? venta / tickets : 0;
      const totalCaja = datos.reduce((acumulado, registro) => acumulado + registro.totalCalculado, 0);

      return `
        <article class="card">
          <p class="card-label">${empleada}</p>
          <p class="card-value">${formatearMoneda(venta)}</p>
          <p>Turnos registrados: ${turnos}</p>
          <p>Tickets atendidos: ${tickets}</p>
          <p>Total calculado acumulado: ${formatearMoneda(totalCaja)}</p>
          <p>Promedio del ticket: ${formatearMoneda(promedio)}</p>
        </article>
      `;
    })
    .join("");
}

function iniciarEdicion(id) {
  const registro = registros.find((item) => item.id === id);
  if (!registro) {
    return;
  }

  editingId = id;
  form.turno.value = registro.turno;
  fechaInput.value = registro.fecha;
  efectivoInicialInput.value = registro.efectivoInicial;
  ventaTurnoInput.value = registro.ventaTurno;
  numeroTicketsInput.value = registro.numeroTickets;
  totalCalculadoInput.value = formatearMoneda(registro.totalCalculado);
  promedioTicketInput.value = formatearMoneda(registro.promedioTicket);

  document.getElementById("check-caja-limpia").checked = Boolean(registro.checklist?.cajaLimpia);
  document.getElementById("check-impulso").checked = Boolean(registro.checklist?.impulso);
  document.getElementById("check-precios").checked = Boolean(registro.checklist?.precios);
  document.getElementById("check-reporte-ventas").checked = Boolean(registro.checklist?.reporteVentas);
  document.getElementById("check-merma-reportada").checked = Boolean(registro.checklist?.mermaReportada);

  rellenarLista(topVentasIds, registro.topVentas || []);
  rellenarLista(bajaRotacionIds, registro.bajaRotacion || []);
  mermaProductoInput.value = registro.merma?.producto || "";
  mermaCantidadInput.value = registro.merma?.cantidad || "";

  cancelarEdicionBtn.classList.remove("hidden");
  modoAviso.textContent =
    modoDatos === "compartido"
      ? "Estas editando un registro compartido. Al guardar, el cambio se vera en todos los dispositivos."
      : "Estas editando un registro local en este navegador.";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelarEdicion() {
  limpiarFormularioCompleto();
}

function limpiarFormularioCompleto() {
  editingId = null;
  form.reset();
  fechaInput.value = obtenerFechaHoy();
  totalCalculadoInput.value = formatearMoneda(0);
  promedioTicketInput.value = formatearMoneda(0);
  cancelarEdicionBtn.classList.add("hidden");
  actualizarAvisoModo();
  efectivoInicialInput.focus();
}

async function borrarHistorial() {
  if (!registros.length) {
    return;
  }

  const confirmar = confirm(
    "Se borrara todo el historial disponible en este modo. Deseas continuar?"
  );
  if (!confirmar) {
    return;
  }

  try {
    if (modoDatos === "compartido") {
      await Promise.all(registros.map((registro) => deleteDoc(doc(db, COLLECTION_NAME, registro.id))));
    } else {
      registros = [];
      guardarRegistrosLocales();
      refrescarVista();
    }
  } catch (error) {
    console.error(error);
    alert("No se pudo borrar el historial completo.");
  }
}

function exportarCsv() {
  const registrosFiltrados = obtenerRegistrosVisibles();
  if (!registrosFiltrados.length) {
    alert("No hay registros para exportar.");
    return;
  }

  const encabezados = [
    "Fecha",
    "Turno",
    "Efectivo inicial",
    "Venta por turno",
    "Numero de tickets",
    "Total calculado",
    "Promedio del ticket",
    "Detalle operativo",
  ];

  const filas = registrosFiltrados.map((registro) => [
    registro.fecha,
    registro.turno,
    registro.efectivoInicial,
    registro.ventaTurno,
    registro.numeroTickets,
    registro.totalCalculado,
    registro.promedioTicket,
    crearResumenOperativo(registro),
  ]);

  const csv = [encabezados, ...filas]
    .map((fila) => fila.map((valor) => `"${String(valor).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `turnos-minisuper-${obtenerFechaHoy()}.csv`;
  enlace.click();
  URL.revokeObjectURL(url);
}

function generarPdf() {
  const registrosFiltrados = obtenerRegistrosVisibles();
  if (!registrosFiltrados.length) {
    alert("No hay registros para generar el PDF.");
    return;
  }

  const analisis = obtenerAnalisisResumen(registrosFiltrados);
  const tituloFiltro = construirResumenFiltros();

  const filasHtml = registrosFiltrados
    .map((registro) => {
      return `
        <tr>
          <td>${registro.fecha}</td>
          <td>${registro.turno}</td>
          <td>${formatearMoneda(registro.efectivoInicial)}</td>
          <td>${formatearMoneda(registro.ventaTurno)}</td>
          <td>${registro.numeroTickets}</td>
          <td>${formatearMoneda(registro.totalCalculado)}</td>
          <td>${formatearMoneda(registro.promedioTicket)}</td>
          <td>${crearResumenOperativo(registro, "<br>")}</td>
        </tr>
      `;
    })
    .join("");

  const ventana = window.open("", "_blank", "width=1200,height=900");
  if (!ventana) {
    alert("Tu navegador bloqueo la ventana del reporte. Permite ventanas emergentes e intenta de nuevo.");
    return;
  }

  ventana.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Reporte de ventas - MINISUPER LA HACIENDA</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 32px; color: #2f241a; }
        .brand { display: flex; gap: 16px; align-items: center; margin-bottom: 20px; }
        .brand img { width: 90px; height: 90px; object-fit: contain; }
        h1, h2, p { margin-top: 0; }
        .meta { margin-bottom: 20px; color: #6f5844; }
        .summary { display: grid; grid-template-columns: repeat(4, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
        .box { border: 1px solid #d7c3aa; border-radius: 10px; padding: 12px; background: #fbf4ea; }
        .box strong { display: block; margin-bottom: 8px; font-size: 12px; text-transform: uppercase; color: #6f5844; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #e4d3be; padding: 8px; text-align: left; vertical-align: top; }
        th { background: #f3e6d5; }
      </style>
    </head>
    <body>
      <div class="brand">
        <img src="logo.png.png" alt="Logo">
        <div>
          <h1>MINISUPER LA HACIENDA</h1>
          <p class="meta">Reporte generado el ${formatearFechaHoraActual()} | Filtro: ${tituloFiltro}</p>
        </div>
      </div>
      <div class="summary">
        <div class="box"><strong>Turnos registrados</strong>${analisis.turnos}</div>
        <div class="box"><strong>Venta acumulada</strong>${formatearMoneda(analisis.ventaTotal)}</div>
        <div class="box"><strong>Tickets totales</strong>${analisis.ticketsTotales}</div>
        <div class="box"><strong>Ticket promedio</strong>${formatearMoneda(analisis.promedio)}</div>
      </div>
      <h2>Detalle de registros</h2>
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Turno</th>
            <th>Efectivo inicial</th>
            <th>Venta</th>
            <th>Tickets</th>
            <th>Total calculado</th>
            <th>Ticket promedio</th>
            <th>Detalle operativo</th>
          </tr>
        </thead>
        <tbody>${filasHtml}</tbody>
      </table>
      <script>window.onload = function () { window.print(); };<\/script>
    </body>
    </html>
  `);
  ventana.document.close();
}

function obtenerRegistrosVisibles(aplicarOrden = true) {
  let resultado = [...registros];

  if (filtroEmpleada.value !== "TODAS") {
    resultado = resultado.filter((registro) => registro.turno === filtroEmpleada.value);
  }

  if (filtroFechaInicio.value) {
    resultado = resultado.filter((registro) => registro.fecha >= filtroFechaInicio.value);
  }

  if (filtroFechaFin.value) {
    resultado = resultado.filter((registro) => registro.fecha <= filtroFechaFin.value);
  }

  if (!aplicarOrden) {
    return resultado;
  }

  return resultado.sort((a, b) => compararRegistros(a, b, ordenRegistros.value));
}

function compararRegistros(a, b, criterio) {
  switch (criterio) {
    case "fecha-asc":
      return a.fecha.localeCompare(b.fecha);
    case "ticket-desc":
      return b.promedioTicket - a.promedioTicket || b.fecha.localeCompare(a.fecha);
    case "ticket-asc":
      return a.promedioTicket - b.promedioTicket || b.fecha.localeCompare(a.fecha);
    case "venta-desc":
      return b.ventaTurno - a.ventaTurno || b.fecha.localeCompare(a.fecha);
    case "venta-asc":
      return a.ventaTurno - b.ventaTurno || b.fecha.localeCompare(a.fecha);
    case "fecha-desc":
    default:
      return b.fecha.localeCompare(a.fecha);
  }
}

function limpiarFiltros() {
  filtroEmpleada.value = "TODAS";
  filtroFechaInicio.value = "";
  filtroFechaFin.value = "";
  ordenRegistros.value = "fecha-desc";
  refrescarVista();
}

function construirResumenFiltros() {
  const partes = [];

  partes.push(filtroEmpleada.value === "TODAS" ? "Todas las empleadas" : filtroEmpleada.value);

  if (filtroFechaInicio.value || filtroFechaFin.value) {
    const inicio = filtroFechaInicio.value || "sin inicio";
    const fin = filtroFechaFin.value || "sin fin";
    partes.push(`Fechas: ${inicio} a ${fin}`);
  }

  const etiquetasOrden = {
    "fecha-desc": "Fecha mas reciente",
    "fecha-asc": "Fecha mas antigua",
    "ticket-desc": "Ticket promedio mas alto",
    "ticket-asc": "Ticket promedio mas bajo",
    "venta-desc": "Venta mas alta",
    "venta-asc": "Venta mas baja",
  };
  partes.push(`Orden: ${etiquetasOrden[ordenRegistros.value]}`);

  return partes.join(" | ");
}

function obtenerChecklist() {
  return {
    cajaLimpia: document.getElementById("check-caja-limpia").checked,
    impulso: document.getElementById("check-impulso").checked,
    precios: document.getElementById("check-precios").checked,
    reporteVentas: document.getElementById("check-reporte-ventas").checked,
    mermaReportada: document.getElementById("check-merma-reportada").checked,
  };
}

function obtenerListaProductos(ids) {
  return ids
    .map((id) => document.getElementById(id).value.trim())
    .filter((valor) => valor.length > 0);
}

function rellenarLista(ids, valores) {
  ids.forEach((id, index) => {
    document.getElementById(id).value = valores[index] || "";
  });
}

function crearResumenOperativo(registro, separador = " | ") {
  const checklist = registro.checklist || {};
  const topVentas = registro.topVentas?.length ? registro.topVentas.join(", ") : "Sin captura";
  const bajaRotacion = registro.bajaRotacion?.length ? registro.bajaRotacion.join(", ") : "Sin captura";
  const merma = registro.merma?.producto
    ? `${registro.merma.producto} (${registro.merma.cantidad || 0})`
    : "Sin merma";

  return [
    `Caja limpia: ${checklist.cajaLimpia ? "Si" : "No"}`,
    `Impulso acomodado: ${checklist.impulso ? "Si" : "No"}`,
    `Precios visibles: ${checklist.precios ? "Si" : "No"}`,
    `Reporte de ventas: ${checklist.reporteVentas ? "Si" : "No"}`,
    `Diferencia o merma reportada: ${checklist.mermaReportada ? "Si" : "No"}`,
    `Top 5 vendidos: ${topVentas}`,
    `Baja rotacion: ${bajaRotacion}`,
    `Merma: ${merma}`,
  ].join(separador);
}

function obtenerAnalisisResumen(registrosFiltrados) {
  const turnos = registrosFiltrados.length;
  const ventaTotal = registrosFiltrados.reduce((acumulado, registro) => acumulado + registro.ventaTurno, 0);
  const ticketsTotales = registrosFiltrados.reduce((acumulado, registro) => acumulado + registro.numeroTickets, 0);
  const promedio = ticketsTotales > 0 ? ventaTotal / ticketsTotales : 0;

  return { turnos, ventaTotal, ticketsTotales, promedio };
}

function guardarRegistrosLocales() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
}

function cargarRegistrosLocales() {
  const datos = localStorage.getItem(STORAGE_KEY);
  return datos ? JSON.parse(datos) : [];
}

function refrescarVista() {
  renderizarRegistros();
  renderizarResumen();
  renderizarAnalisisEmpleadas();
}

function mostrarPantallaAcceso() {
  authOverlay.classList.remove("hidden");
  document.body.classList.add("locked");
}

function ocultarPantallaAcceso() {
  authOverlay.classList.add("hidden");
  document.body.classList.remove("locked");
}

function actualizarAvisoModo() {
  if (modoDatos === "compartido") {
    modoAviso.textContent = "Modo compartido activo. Los cambios se sincronizan entre dispositivos que usen este link.";
  } else {
    modoAviso.textContent = "Modo local activo. Para compartir y editar desde cualquier dispositivo, conecta Firebase y publica la pagina.";
  }
}

function leerNumero(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

function formatearMoneda(valor) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(valor);
}

function obtenerFechaHoy() {
  const hoy = new Date();
  const offset = hoy.getTimezoneOffset();
  const fechaLocal = new Date(hoy.getTime() - offset * 60000);
  return fechaLocal.toISOString().split("T")[0];
}

function formatearFechaHoraActual() {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
}
