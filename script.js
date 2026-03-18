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
const STORAGE_SUGERENCIAS_KEY = "minisuper-sugerencias";
const STORAGE_ACTIVIDADES_KEY = "minisuper-actividades";
const STORAGE_THEME_KEY = "minisuper-tema";
const COLLECTION_NAME = "minisuper_turnos";
const SUGERENCIAS_COLLECTION_NAME = "minisuper_sugerencias";
const ACTIVIDADES_COLLECTION_NAME = "minisuper_actividades";

const form = document.getElementById("turno-form");
const fechaInput = document.getElementById("fecha");
const ventaTurnoInput = document.getElementById("ventaTurno");
const numeroTicketsInput = document.getElementById("numeroTickets");
const promedioTicketInput = document.getElementById("promedioTicket");
const tablaRegistros = document.getElementById("tabla-registros");
const totalTurnos = document.getElementById("total-turnos");
const ventaAcumulada = document.getElementById("venta-acumulada");
const promedioGlobal = document.getElementById("promedio-global");
const semanaActualTexto = document.getElementById("semana-actual-texto");
const semanaTurnos = document.getElementById("semana-turnos");
const semanaVenta = document.getElementById("semana-venta");
const semanaPromedio = document.getElementById("semana-promedio");
const semanaProductoTop = document.getElementById("semana-producto-top");
const semanaEmpleadas = document.getElementById("semana-empleadas");
const actividadesForm = document.getElementById("actividades-form");
const actividadFechaInput = document.getElementById("actividad-fecha");
const actividadEmpleadaInput = document.getElementById("actividad-empleada");
const actividadDetalleInput = document.getElementById("actividad-detalle");
const limpiarActividadBtn = document.getElementById("limpiar-actividad");
const generarPdfActividadesBtn = document.getElementById("generar-pdf-actividades");
const actividadSemanaTexto = document.getElementById("actividad-semana-texto");
const actividadTotalSemana = document.getElementById("actividad-total-semana");
const actividadEmpleadaTop = document.getElementById("actividad-empleada-top");
const actividadUltimoRegistro = document.getElementById("actividad-ultimo-registro");
const actividadResumenEmpleadas = document.getElementById("actividad-resumen-empleadas");
const tablaActividades = document.getElementById("tabla-actividades");
const limpiarFormBtn = document.getElementById("limpiar-form");
const cancelarEdicionBtn = document.getElementById("cancelar-edicion");
const borrarRegistrosBtn = document.getElementById("borrar-registros");
const exportarCsvBtn = document.getElementById("exportar-csv");
const generarPdfBtn = document.getElementById("generar-pdf");
const generarPdfSemanalBtn = document.getElementById("generar-pdf-semanal");
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
const themeToggle = document.getElementById("theme-toggle");
const cerrarSesionBtn = document.getElementById("cerrar-sesion");
const menuToggle = document.getElementById("menu-toggle");
const appMenu = document.getElementById("app-menu");
const menuLinks = document.querySelectorAll(".menu-link");
const sectionPanels = document.querySelectorAll("section[data-section]");
const sugerenciasForm = document.getElementById("sugerencias-form");
const sugerenciaFechaInput = document.getElementById("sugerencia-fecha");
const sugerenciaEmpleadaInput = document.getElementById("sugerencia-empleada");
const sugerenciaProductoInput = document.getElementById("sugerencia-producto");
const sugerenciaCantidadInput = document.getElementById("sugerencia-cantidad");
const sugerenciaNotasInput = document.getElementById("sugerencia-notas");
const limpiarSugerenciaBtn = document.getElementById("limpiar-sugerencia");
const tablaSugerencias = document.getElementById("tabla-sugerencias");
const totalSugerencias = document.getElementById("total-sugerencias");
const productosDistintos = document.getElementById("productos-distintos");
const productoTop = document.getElementById("producto-top");
const topSugerencias = document.getElementById("top-sugerencias");
const generarPdfSugerenciasBtn = document.getElementById("generar-pdf-sugerencias");
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
let unsubscribeSugerencias = null;
let unsubscribeActividades = null;
let currentUser = null;
let sugerencias = [];
let actividades = [];
let currentSection = "tickets";

fechaInput.value = obtenerFechaHoy();
sugerenciaFechaInput.value = obtenerFechaHoy();
actividadFechaInput.value = obtenerFechaHoy();
aplicarTemaGuardado();
actualizarCalculados();
registrarEventos();
inicializarDatos();
document.body.classList.add("locked");

function registrarEventos() {
  [ventaTurnoInput, numeroTicketsInput].forEach((input) => {
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
  generarPdfSemanalBtn.addEventListener("click", generarPdfSemanal);
  loginForm.addEventListener("submit", manejarLogin);
  cerrarSesionBtn.addEventListener("click", manejarCerrarSesion);
  themeToggle.addEventListener("click", alternarTema);
  limpiarFiltrosBtn.addEventListener("click", limpiarFiltros);
  sugerenciasForm.addEventListener("submit", manejarSugerencia);
  limpiarSugerenciaBtn.addEventListener("click", limpiarFormularioSugerencia);
  generarPdfSugerenciasBtn.addEventListener("click", generarPdfSugerencias);
  actividadesForm.addEventListener("submit", manejarActividad);
  limpiarActividadBtn.addEventListener("click", limpiarFormularioActividad);
  generarPdfActividadesBtn.addEventListener("click", generarPdfActividadesSemanal);
  menuToggle.addEventListener("click", toggleMenu);
  menuLinks.forEach((button) => {
    button.addEventListener("click", () => cambiarSeccion(button.dataset.section));
  });
  document.addEventListener("click", manejarClickFueraMenu);
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
  sugerencias = cargarSugerenciasLocales();
  actividades = cargarActividadesLocales();
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
      if (unsubscribeSugerencias) {
        unsubscribeSugerencias();
        unsubscribeSugerencias = null;
      }
      if (unsubscribeActividades) {
        unsubscribeActividades();
        unsubscribeActividades = null;
      }
      registros = [];
      sugerencias = [];
      actividades = [];
      refrescarVista();
      return;
    }

    ocultarPantallaAcceso();
    sessionUser.textContent = `Sesion: ${user.email}`;
    cerrarSesionBtn.classList.remove("hidden");
    escucharTurnosCompartidos();
    escucharSugerenciasCompartidas();
    escucharActividadesCompartidas();
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

function aplicarTemaGuardado() {
  const tema = localStorage.getItem(STORAGE_THEME_KEY) || "dia";
  document.body.classList.toggle("theme-dark", tema === "noche");
  themeToggle.textContent = tema === "noche" ? "Modo de dia" : "Modo nocturno";
}

function alternarTema() {
  const oscuroActivo = document.body.classList.toggle("theme-dark");
  const tema = oscuroActivo ? "noche" : "dia";
  localStorage.setItem(STORAGE_THEME_KEY, tema);
  themeToggle.textContent = oscuroActivo ? "Modo de dia" : "Modo nocturno";
}

function toggleMenu(event) {
  event.stopPropagation();
  const abierto = !appMenu.classList.contains("hidden");
  appMenu.classList.toggle("hidden", abierto);
  menuToggle.setAttribute("aria-expanded", String(!abierto));
}

function manejarClickFueraMenu(event) {
  if (appMenu.classList.contains("hidden")) {
    return;
  }

  if (!appMenu.contains(event.target) && !menuToggle.contains(event.target)) {
    appMenu.classList.add("hidden");
    menuToggle.setAttribute("aria-expanded", "false");
  }
}

function cambiarSeccion(section) {
  currentSection = section;

  sectionPanels.forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.section !== section);
  });

  menuLinks.forEach((button) => {
    button.classList.toggle("active", button.dataset.section === section);
  });

  appMenu.classList.add("hidden");
  menuToggle.setAttribute("aria-expanded", "false");
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

function escucharSugerenciasCompartidas() {
  if (unsubscribeSugerencias) {
    unsubscribeSugerencias();
  }

  const consulta = query(collection(db, SUGERENCIAS_COLLECTION_NAME), orderBy("createdAt", "desc"));
  unsubscribeSugerencias = onSnapshot(
    consulta,
    (snapshot) => {
      sugerencias = snapshot.docs.map((item) => normalizarSugerenciaRemota(item));
      refrescarVista();
    },
    (error) => {
      console.error(error);
    }
  );
}

function escucharActividadesCompartidas() {
  if (unsubscribeActividades) {
    unsubscribeActividades();
  }

  const consulta = query(collection(db, ACTIVIDADES_COLLECTION_NAME), orderBy("createdAt", "desc"));
  unsubscribeActividades = onSnapshot(
    consulta,
    (snapshot) => {
      actividades = snapshot.docs.map((item) => normalizarActividadRemota(item));
      refrescarVista();
    },
    (error) => {
      console.error(error);
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
  return {
    fecha: fechaInput.value,
    turno: form.turno.value,
    ventaTurno,
    numeroTickets,
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
    ventaTurno: Number(data.ventaTurno || 0),
    numeroTickets: Number(data.numeroTickets || 0),
    promedioTicket: Number(data.promedioTicket || 0),
    checklist: data.checklist || {},
    topVentas: Array.isArray(data.topVentas) ? data.topVentas : [],
    bajaRotacion: Array.isArray(data.bajaRotacion) ? data.bajaRotacion : [],
    merma: data.merma || { producto: "", cantidad: 0 },
    createdAt: data.createdAt?.toMillis?.() || 0,
  };
}

function normalizarSugerenciaRemota(item) {
  const data = item.data();

  return {
    id: item.id,
    fecha: data.fecha || "",
    empleada: data.empleada || "",
    producto: data.producto || "",
    cantidad: Number(data.cantidad || 0),
    notas: data.notas || "",
    createdAt: data.createdAt?.toMillis?.() || 0,
  };
}

function normalizarActividadRemota(item) {
  const data = item.data();

  return {
    id: item.id,
    fecha: data.fecha || "",
    empleada: data.empleada || "",
    detalle: data.detalle || "",
    createdAt: data.createdAt?.toMillis?.() || 0,
  };
}

function actualizarCalculados() {
  const ventaTurno = leerNumero(ventaTurnoInput.value);
  const numeroTickets = leerNumero(numeroTicketsInput.value);

  promedioTicketInput.value = formatearMoneda(numeroTickets > 0 ? ventaTurno / numeroTickets : 0);
}

function renderizarRegistros() {
  const registrosFiltrados = obtenerRegistrosVisibles();

  if (!registrosFiltrados.length) {
    tablaRegistros.innerHTML = `
      <tr class="empty-row">
        <td colspan="7">No hay registros para el filtro seleccionado.</td>
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
          <td>${formatearMoneda(registro.ventaTurno)}</td>
          <td>${registro.numeroTickets}</td>
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

function renderizarResumenSemanal() {
  const { inicio, fin } = obtenerRangoSemanaActual();
  const registrosSemana = registros.filter((registro) => registro.fecha >= inicio && registro.fecha <= fin);
  const sugerenciasSemana = sugerencias.filter((item) => item.fecha >= inicio && item.fecha <= fin);
  const analisis = obtenerAnalisisResumen(registrosSemana);
  const resumenSugerencias = obtenerResumenSugerencias(sugerenciasSemana);

  semanaActualTexto.textContent = `Semana actual: ${formatearFechaCorta(inicio)} al ${formatearFechaCorta(fin)}`;
  semanaTurnos.textContent = String(analisis.turnos);
  semanaVenta.textContent = formatearMoneda(analisis.ventaTotal);
  semanaPromedio.textContent = formatearMoneda(analisis.promedio);
  semanaProductoTop.textContent = resumenSugerencias.productoTop || "Sin datos";

  semanaEmpleadas.innerHTML = EMPLEADAS.map((empleada) => {
    const datos = registrosSemana.filter((registro) => registro.turno === empleada);
    const totalVenta = datos.reduce((acumulado, registro) => acumulado + registro.ventaTurno, 0);
    const totalTickets = datos.reduce((acumulado, registro) => acumulado + registro.numeroTickets, 0);
    const promedio = totalTickets > 0 ? totalVenta / totalTickets : 0;

    return `
      <article class="card">
        <p class="card-label">${empleada}</p>
        <p class="card-value">${formatearMoneda(totalVenta)}</p>
        <p>Turnos en la semana: ${datos.length}</p>
        <p>Tickets atendidos: ${totalTickets}</p>
        <p>Promedio semanal: ${formatearMoneda(promedio)}</p>
      </article>
    `;
  }).join("");
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
      return `
        <article class="card">
          <p class="card-label">${empleada}</p>
          <p class="card-value">${formatearMoneda(venta)}</p>
          <p>Turnos registrados: ${turnos}</p>
          <p>Tickets atendidos: ${tickets}</p>
          <p>Promedio del ticket: ${formatearMoneda(promedio)}</p>
        </article>
      `;
    })
    .join("");
}

function renderizarResumenSugerencias() {
  const resumen = obtenerResumenSugerencias();
  totalSugerencias.textContent = String(resumen.totalSolicitudes);
  productosDistintos.textContent = String(resumen.productos.length);
  productoTop.textContent = resumen.productoTop || "Sin datos";
  renderizarTopSugerencias(resumen.productos);

  if (!resumen.productos.length) {
    tablaSugerencias.innerHTML = `
      <tr class="empty-row">
        <td colspan="5">Aun no hay sugerencias guardadas.</td>
      </tr>
    `;
    return;
  }

  tablaSugerencias.innerHTML = resumen.productos
    .map((item) => {
      return `
        <tr>
          <td>${item.producto}</td>
          <td>${item.cantidad}</td>
          <td>${item.ultimaFecha || "-"}</td>
          <td>${item.ultimaEmpleada || "-"}</td>
          <td>${item.notas || "-"}</td>
        </tr>
      `;
    })
    .join("");
}

function renderizarActividades() {
  const { inicio, fin } = obtenerRangoSemanaActual();
  const actividadesSemana = obtenerActividadesSemanaActual();
  const resumen = obtenerResumenActividades(actividadesSemana);

  actividadSemanaTexto.textContent = `Semana actual: ${formatearFechaCorta(inicio)} al ${formatearFechaCorta(fin)}`;
  actividadTotalSemana.textContent = String(resumen.total);
  actividadEmpleadaTop.textContent = resumen.empleadaTop || "Sin datos";
  actividadUltimoRegistro.textContent = resumen.ultimoRegistro || "Sin datos";

  actividadResumenEmpleadas.innerHTML = EMPLEADAS.map((empleada) => {
    const datos = actividadesSemana.filter((item) => item.empleada === empleada);
    const ultima = datos[0];

    return `
      <article class="card">
        <p class="card-label">${empleada}</p>
        <p class="card-value">${datos.length}</p>
        <p>Actividades registradas: ${datos.length}</p>
        <p>Ultima actividad: ${ultima ? ultima.detalle : "Sin registros"}</p>
      </article>
    `;
  }).join("");

  if (!actividades.length) {
    tablaActividades.innerHTML = `
      <tr class="empty-row">
        <td colspan="3">Aun no hay actividades registradas.</td>
      </tr>
    `;
    return;
  }

  tablaActividades.innerHTML = [...actividades]
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.createdAt - a.createdAt)
    .map((item) => `
      <tr>
        <td>${item.fecha}</td>
        <td>${item.empleada}</td>
        <td>${item.detalle}</td>
      </tr>
    `)
    .join("");
}

function renderizarTopSugerencias(productos) {
  if (!productos.length) {
    topSugerencias.innerHTML = `
      <article class="card">
        <p class="card-label">Sin datos</p>
        <p class="small-value">Aun no hay sugerencias suficientes.</p>
      </article>
    `;
    return;
  }

  topSugerencias.innerHTML = productos
    .slice(0, 10)
    .map((item, index) => {
      return `
        <article class="card">
          <p class="card-label">#${index + 1}</p>
          <p class="small-value">${item.producto}</p>
          <p>Veces solicitado: ${item.cantidad}</p>
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
  ventaTurnoInput.value = registro.ventaTurno;
  numeroTicketsInput.value = registro.numeroTickets;
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
  promedioTicketInput.value = formatearMoneda(0);
  cancelarEdicionBtn.classList.add("hidden");
  actualizarAvisoModo();
  ventaTurnoInput.focus();
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

async function manejarSugerencia(event) {
  event.preventDefault();

  const payload = {
    fecha: sugerenciaFechaInput.value,
    empleada: sugerenciaEmpleadaInput.value,
    producto: sugerenciaProductoInput.value.trim(),
    cantidad: Math.floor(leerNumero(sugerenciaCantidadInput.value)),
    notas: sugerenciaNotasInput.value.trim(),
  };

  if (!payload.producto) {
    alert("Escribe el producto que el cliente solicito.");
    sugerenciaProductoInput.focus();
    return;
  }

  if (payload.cantidad <= 0) {
    alert("La cantidad de veces solicitadas debe ser mayor que cero.");
    sugerenciaCantidadInput.focus();
    return;
  }

  try {
    if (modoDatos === "compartido") {
      await addDoc(collection(db, SUGERENCIAS_COLLECTION_NAME), {
        ...payload,
        createdAt: serverTimestamp(),
      });
    } else {
      sugerencias.unshift({
        id: crypto.randomUUID(),
        ...payload,
        createdAt: Date.now(),
      });
      guardarSugerenciasLocales();
      refrescarVista();
    }

    limpiarFormularioSugerencia();
  } catch (error) {
    console.error(error);
    alert("No se pudo guardar la sugerencia.");
  }
}

async function manejarActividad(event) {
  event.preventDefault();

  const payload = {
    fecha: actividadFechaInput.value,
    empleada: actividadEmpleadaInput.value,
    detalle: actividadDetalleInput.value.trim(),
  };

  if (!payload.detalle) {
    alert("Escribe la actividad realizada por la empleada.");
    actividadDetalleInput.focus();
    return;
  }

  try {
    if (modoDatos === "compartido") {
      await addDoc(collection(db, ACTIVIDADES_COLLECTION_NAME), {
        ...payload,
        createdAt: serverTimestamp(),
      });
    } else {
      actividades.unshift({
        id: crypto.randomUUID(),
        ...payload,
        createdAt: Date.now(),
      });
      guardarActividadesLocales();
      refrescarVista();
    }

    limpiarFormularioActividad();
  } catch (error) {
    console.error(error);
    alert("No se pudo guardar la actividad.");
  }
}

function limpiarFormularioSugerencia() {
  sugerenciasForm.reset();
  sugerenciaFechaInput.value = obtenerFechaHoy();
  sugerenciaCantidadInput.value = 1;
  sugerenciaProductoInput.focus();
}

function limpiarFormularioActividad() {
  actividadesForm.reset();
  actividadFechaInput.value = obtenerFechaHoy();
  actividadDetalleInput.focus();
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
    "Venta por turno",
    "Numero de tickets",
    "Promedio del ticket",
    "Detalle operativo",
  ];

  const filas = registrosFiltrados.map((registro) => [
    registro.fecha,
    registro.turno,
    registro.ventaTurno,
    registro.numeroTickets,
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
          <td>${formatearMoneda(registro.ventaTurno)}</td>
          <td>${registro.numeroTickets}</td>
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
            <th>Venta</th>
            <th>Tickets</th>
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

function generarPdfSugerencias() {
  const resumen = obtenerResumenSugerencias();

  if (!resumen.productos.length) {
    alert("No hay sugerencias para generar el PDF.");
    return;
  }

  const filasHtml = resumen.productos
    .map((item) => {
      return `
        <tr>
          <td>${item.producto}</td>
          <td>${item.cantidad}</td>
          <td>${item.ultimaFecha || "-"}</td>
          <td>${item.ultimaEmpleada || "-"}</td>
          <td>${item.notas || "-"}</td>
        </tr>
      `;
    })
    .join("");

  const ventana = window.open("", "_blank", "width=1100,height=850");
  if (!ventana) {
    alert("Tu navegador bloqueo la ventana del reporte. Permite ventanas emergentes e intenta de nuevo.");
    return;
  }

  ventana.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Reporte de sugerencias - MINISUPER LA HACIENDA</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 32px; color: #2f241a; }
        .brand { display: flex; gap: 16px; align-items: center; margin-bottom: 20px; }
        .brand img { width: 90px; height: 90px; object-fit: contain; }
        .meta { margin-bottom: 20px; color: #6f5844; }
        .summary { display: grid; grid-template-columns: repeat(3, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
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
          <p class="meta">Reporte de sugerencias generado el ${formatearFechaHoraActual()}</p>
        </div>
      </div>
      <div class="summary">
        <div class="box"><strong>Sugerencias registradas</strong>${resumen.totalSolicitudes}</div>
        <div class="box"><strong>Productos distintos</strong>${resumen.productos.length}</div>
        <div class="box"><strong>Producto mas pedido</strong>${resumen.productoTop || "Sin datos"}</div>
      </div>
      <h2>Resumen agrupado de sugerencias</h2>
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Veces solicitado</th>
            <th>Ultima fecha</th>
            <th>Ultimo registro</th>
            <th>Notas recientes</th>
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

function generarPdfSemanal() {
  const { inicio, fin } = obtenerRangoSemanaActual();
  const registrosSemana = registros.filter((registro) => registro.fecha >= inicio && registro.fecha <= fin);
  const sugerenciasSemana = sugerencias.filter((item) => item.fecha >= inicio && item.fecha <= fin);

  if (!registrosSemana.length && !sugerenciasSemana.length) {
    alert("No hay datos en la semana actual para generar el reporte.");
    return;
  }

  const analisis = obtenerAnalisisResumen(registrosSemana);
  const resumenSugerencias = obtenerResumenSugerencias(sugerenciasSemana);
  const resumenEmpleadas = EMPLEADAS.map((empleada) => {
    const datos = registrosSemana.filter((registro) => registro.turno === empleada);
    const venta = datos.reduce((acumulado, registro) => acumulado + registro.ventaTurno, 0);
    const tickets = datos.reduce((acumulado, registro) => acumulado + registro.numeroTickets, 0);
    return {
      empleada,
      turnos: datos.length,
      venta,
      promedio: tickets > 0 ? venta / tickets : 0,
    };
  });

  const filasEmpleadas = resumenEmpleadas.map((item) => `
    <tr>
      <td>${item.empleada}</td>
      <td>${item.turnos}</td>
      <td>${formatearMoneda(item.venta)}</td>
      <td>${formatearMoneda(item.promedio)}</td>
    </tr>
  `).join("");

  const filasSugerencias = resumenSugerencias.productos.slice(0, 10).map((item) => `
    <tr>
      <td>${item.producto}</td>
      <td>${item.cantidad}</td>
      <td>${item.ultimaFecha || "-"}</td>
      <td>${item.ultimaEmpleada || "-"}</td>
    </tr>
  `).join("");

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
      <title>Reporte semanal - MINISUPER LA HACIENDA</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 32px; color: #2f241a; }
        .brand { display: flex; gap: 16px; align-items: center; margin-bottom: 20px; }
        .brand img { width: 90px; height: 90px; object-fit: contain; }
        .meta { margin-bottom: 20px; color: #6f5844; }
        .summary { display: grid; grid-template-columns: repeat(4, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
        .box { border: 1px solid #d7c3aa; border-radius: 10px; padding: 12px; background: #fbf4ea; }
        .box strong { display: block; margin-bottom: 8px; font-size: 12px; text-transform: uppercase; color: #6f5844; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px; }
        th, td { border: 1px solid #e4d3be; padding: 8px; text-align: left; vertical-align: top; }
        th { background: #f3e6d5; }
        h1, h2, p { margin-top: 0; }
      </style>
    </head>
    <body>
      <div class="brand">
        <img src="logo.png.png" alt="Logo">
        <div>
          <h1>MINISUPER LA HACIENDA</h1>
          <p class="meta">Reporte semanal automatico | Semana del ${formatearFechaCorta(inicio)} al ${formatearFechaCorta(fin)} | Generado el ${formatearFechaHoraActual()}</p>
        </div>
      </div>
      <div class="summary">
        <div class="box"><strong>Turnos de la semana</strong>${analisis.turnos}</div>
        <div class="box"><strong>Venta semanal</strong>${formatearMoneda(analisis.ventaTotal)}</div>
        <div class="box"><strong>Tickets semanales</strong>${analisis.ticketsTotales}</div>
        <div class="box"><strong>Promedio semanal</strong>${formatearMoneda(analisis.promedio)}</div>
      </div>
      <h2>Resumen por empleada</h2>
      <table>
        <thead>
          <tr>
            <th>Empleada</th>
            <th>Turnos</th>
            <th>Venta semanal</th>
            <th>Ticket promedio</th>
          </tr>
        </thead>
        <tbody>${filasEmpleadas}</tbody>
      </table>
      <h2>Sugerencias mas pedidas de la semana</h2>
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Veces solicitado</th>
            <th>Ultima fecha</th>
            <th>Ultimo registro</th>
          </tr>
        </thead>
        <tbody>${filasSugerencias || '<tr><td colspan="4">Sin sugerencias esta semana.</td></tr>'}</tbody>
      </table>
      <script>window.onload = function () { window.print(); };<\/script>
    </body>
    </html>
  `);
  ventana.document.close();
}

function generarPdfActividadesSemanal() {
  const { inicio, fin } = obtenerRangoSemanaActual();
  const actividadesSemana = obtenerActividadesSemanaActual();
  const resumen = obtenerResumenActividades(actividadesSemana);

  if (!actividadesSemana.length) {
    alert("No hay actividades registradas en la semana actual.");
    return;
  }

  const filasDetalle = actividadesSemana
    .map((item) => `
      <tr>
        <td>${item.fecha}</td>
        <td>${item.empleada}</td>
        <td>${item.detalle}</td>
      </tr>
    `)
    .join("");

  const filasEmpleadas = EMPLEADAS.map((empleada) => {
    const datos = actividadesSemana.filter((item) => item.empleada === empleada);
    return `
      <tr>
        <td>${empleada}</td>
        <td>${datos.length}</td>
        <td>${datos[0] ? datos[0].detalle : "Sin registros"}</td>
      </tr>
    `;
  }).join("");

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
      <title>Reporte semanal de actividades - MINISUPER LA HACIENDA</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 32px; color: #2f241a; }
        .brand { display: flex; gap: 16px; align-items: center; margin-bottom: 20px; }
        .brand img { width: 90px; height: 90px; object-fit: contain; }
        .meta { margin-bottom: 20px; color: #6f5844; }
        .summary { display: grid; grid-template-columns: repeat(3, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
        .box { border: 1px solid #d7c3aa; border-radius: 10px; padding: 12px; background: #fbf4ea; }
        .box strong { display: block; margin-bottom: 8px; font-size: 12px; text-transform: uppercase; color: #6f5844; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px; }
        th, td { border: 1px solid #e4d3be; padding: 8px; text-align: left; vertical-align: top; }
        th { background: #f3e6d5; }
      </style>
    </head>
    <body>
      <div class="brand">
        <img src="logo.png.png" alt="Logo">
        <div>
          <h1>MINISUPER LA HACIENDA</h1>
          <p class="meta">Reporte semanal de actividades | Semana del ${formatearFechaCorta(inicio)} al ${formatearFechaCorta(fin)} | Generado el ${formatearFechaHoraActual()}</p>
        </div>
      </div>
      <div class="summary">
        <div class="box"><strong>Actividades de la semana</strong>${resumen.total}</div>
        <div class="box"><strong>Empleada mas activa</strong>${resumen.empleadaTop || "Sin datos"}</div>
        <div class="box"><strong>Ultimo registro</strong>${resumen.ultimoRegistro || "Sin datos"}</div>
      </div>
      <h2>Resumen por empleada</h2>
      <table>
        <thead>
          <tr>
            <th>Empleada</th>
            <th>Actividades registradas</th>
            <th>Ultima actividad</th>
          </tr>
        </thead>
        <tbody>${filasEmpleadas}</tbody>
      </table>
      <h2>Detalle semanal de actividades</h2>
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Empleada</th>
            <th>Actividad realizada</th>
          </tr>
        </thead>
        <tbody>${filasDetalle}</tbody>
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

function obtenerResumenSugerencias(lista = sugerencias) {
  const mapa = new Map();
  let totalSolicitudes = 0;

  lista.forEach((item) => {
    totalSolicitudes += item.cantidad;
    const llave = item.producto.trim().toLowerCase();
    const actual = mapa.get(llave) || {
      producto: item.producto,
      cantidad: 0,
      ultimaFecha: item.fecha,
      ultimaEmpleada: item.empleada,
      notas: item.notas,
    };

    actual.cantidad += item.cantidad;
    if (!actual.ultimaFecha || item.fecha >= actual.ultimaFecha) {
      actual.ultimaFecha = item.fecha;
      actual.ultimaEmpleada = item.empleada;
      actual.notas = item.notas || actual.notas;
    }

    mapa.set(llave, actual);
  });

  const productos = [...mapa.values()].sort((a, b) => b.cantidad - a.cantidad || a.producto.localeCompare(b.producto));

  return {
    totalSolicitudes,
    productos,
    productoTop: productos[0] ? `${productos[0].producto} (${productos[0].cantidad})` : "",
  };
}

function obtenerActividadesSemanaActual() {
  const { inicio, fin } = obtenerRangoSemanaActual();
  return actividades.filter((item) => item.fecha >= inicio && item.fecha <= fin);
}

function obtenerResumenActividades(lista = actividades) {
  const conteo = new Map();
  let ultimo = null;

  lista
    .slice()
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.createdAt - a.createdAt)
    .forEach((item) => {
      conteo.set(item.empleada, (conteo.get(item.empleada) || 0) + 1);
      if (!ultimo) {
        ultimo = item;
      }
    });

  const empleadaTop = [...conteo.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];

  return {
    total: lista.length,
    empleadaTop: empleadaTop ? `${empleadaTop[0]} (${empleadaTop[1]})` : "",
    ultimoRegistro: ultimo ? `${ultimo.empleada} - ${ultimo.fecha}` : "",
  };
}

function guardarRegistrosLocales() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
}

function cargarRegistrosLocales() {
  const datos = localStorage.getItem(STORAGE_KEY);
  return datos ? JSON.parse(datos) : [];
}

function guardarSugerenciasLocales() {
  localStorage.setItem(STORAGE_SUGERENCIAS_KEY, JSON.stringify(sugerencias));
}

function cargarSugerenciasLocales() {
  const datos = localStorage.getItem(STORAGE_SUGERENCIAS_KEY);
  return datos ? JSON.parse(datos) : [];
}

function guardarActividadesLocales() {
  localStorage.setItem(STORAGE_ACTIVIDADES_KEY, JSON.stringify(actividades));
}

function cargarActividadesLocales() {
  const datos = localStorage.getItem(STORAGE_ACTIVIDADES_KEY);
  return datos ? JSON.parse(datos) : [];
}

function refrescarVista() {
  renderizarRegistros();
  renderizarResumen();
  renderizarResumenSemanal();
  renderizarAnalisisEmpleadas();
  renderizarResumenSugerencias();
  renderizarActividades();
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

function obtenerRangoSemanaActual() {
  const hoy = new Date();
  const dia = hoy.getDay();
  const ajusteLunes = dia === 0 ? -6 : 1 - dia;
  const inicio = new Date(hoy);
  inicio.setHours(0, 0, 0, 0);
  inicio.setDate(hoy.getDate() + ajusteLunes);

  const fin = new Date(inicio);
  fin.setDate(inicio.getDate() + 6);

  return {
    inicio: convertirFechaIsoLocal(inicio),
    fin: convertirFechaIsoLocal(fin),
  };
}

function convertirFechaIsoLocal(fecha) {
  const offset = fecha.getTimezoneOffset();
  const fechaLocal = new Date(fecha.getTime() - offset * 60000);
  return fechaLocal.toISOString().split("T")[0];
}

function formatearFechaCorta(fechaIso) {
  if (!fechaIso) {
    return "-";
  }

  const [year, month, day] = fechaIso.split("-");
  return `${day}/${month}/${year}`;
}

function formatearFechaHoraActual() {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
}
