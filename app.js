const categories = ["Seguridad", "Inventario", "Auditoria", "Personal", "Pedidos", "Reportes", "Capacitacion", "Operaciones"];
const dayNames = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const storageKey = "control-gerencial-operativo-v2";
const supabaseClient = window.appSupabase?.client || null;

const state = {
  projects: [],
  scheduled_visits: [],
  visit_records: [],
  ars: [],
  tools: [],
  evidence_files: [],
  recycle_bin: []
};

const els = {
  syncStatus: document.querySelector("#syncStatus"),
  metricsGrid: document.querySelector("#metricsGrid"),
  monthFilter: document.querySelector("#monthFilter"),
  projectForm: document.querySelector("#projectForm"),
  toolForm: document.querySelector("#toolForm"),
  scheduleForm: document.querySelector("#visitScheduleForm"),
  recordForm: document.querySelector("#visitRecordForm"),
  arForm: document.querySelector("#arForm"),
  projectsTable: document.querySelector("#projectsTable"),
  toolsGrid: document.querySelector("#toolsGrid"),
  toolsMetrics: document.querySelector("#toolsMetrics"),
  scheduleTable: document.querySelector("#scheduleTable"),
  recordsTable: document.querySelector("#recordsTable"),
  arsTable: document.querySelector("#arsTable"),
  projectSearch: document.querySelector("#projectSearch"),
  toolSearch: document.querySelector("#toolSearch"),
  toolCategoryFilter: document.querySelector("#toolCategoryFilter"),
  toolSort: document.querySelector("#toolSort"),
  scheduleSearch: document.querySelector("#scheduleSearch"),
  arStatusFilter: document.querySelector("#arStatusFilter"),
  reportType: document.querySelector("#reportType"),
  reportProject: document.querySelector("#reportProject"),
  reportGrid: document.querySelector("#reportGrid"),
  exportAllBtn: document.querySelector("#exportAllBtn"),
  exportReportBtn: document.querySelector("#exportReportBtn"),
  backupBtn: document.querySelector("#backupBtn")
};

init();

async function init() {
  fillStaticOptions();
  fillMonthOptions();
  wireEvents();
  await loadData();
  renderAll();
}

async function loadData() {
  if (supabaseClient) {
    els.syncStatus.textContent = "Supabase conectado";
    els.syncStatus.classList.add("online");
    try {
      for (const table of Object.keys(state)) {
        const { data, error } = await supabaseClient.from(table).select("*");
        if (error) throw error;
        state[table] = data || [];
      }
      if (!state.projects.length) await seedInitialData(true);
      return;
    } catch (error) {
      alert(`Supabase no respondio. Se usara respaldo local temporal. Detalle: ${error.message}`);
    }
  }

  els.syncStatus.textContent = "Modo local";
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    Object.assign(state, JSON.parse(saved));
  } else {
    seedInitialData(false);
  }
}

async function seedInitialData(saveRemote) {
  const seedProjects = [
    { name: "Bayer Metro", location: "Aurora de Heredia", site_type: "Grande", frequency: "Semanal", suggested_hours: 4, client: "Bayer", status: "Activo", comments: "" },
    { name: "Uber COE", location: "Aurora de Heredia", site_type: "Grande", frequency: "Semanal", suggested_hours: 4, client: "Uber", status: "Activo", comments: "" },
    { name: "McKinsey", location: "Lagunilla de Heredia", site_type: "Grande", frequency: "Semanal", suggested_hours: 4, client: "McKinsey", status: "Activo", comments: "" },
    { name: "DXC", location: "Intraparque 2 / Lagunilla de Heredia", site_type: "Pequeno", frequency: "Quincenal", suggested_hours: 2, client: "DXC", status: "Activo", comments: "" },
    { name: "LSEG", location: "Intraparque 2 / Lagunilla de Heredia", site_type: "Pequeno", frequency: "Quincenal", suggested_hours: 2, client: "LSEG", status: "Activo", comments: "" },
    { name: "Uber Cedral", location: "San Rafael Escazu", site_type: "Pequeno", frequency: "Quincenal", suggested_hours: 2, client: "Uber", status: "Activo", comments: "" },
    { name: "WPlaces", location: "Avenida Escazu", site_type: "Pequeno", frequency: "Quincenal", suggested_hours: 2, client: "WPlaces", status: "Activo", comments: "" },
    { name: "Uber Bambu", location: "Hatillo", site_type: "Pequeno", frequency: "Quincenal", suggested_hours: 2, client: "Uber", status: "Activo", comments: "" }
  ].map(withId);

  const seedTools = [
    ["Good Catch", "Seguridad", "", "Registro y seguimiento de observaciones preventivas", "Operaciones", "Activa", "Interna", "GC", 1],
    ["Inventario", "Inventario", "", "Consulta y control de inventario operativo", "Bodega", "Activa", "Interna", "IN", 2],
    ["Auditorias", "Auditoria", "", "Acceso a auditorias y listas de verificacion", "Calidad", "Activa", "Interna", "AU", 3],
    ["Vacaciones", "Personal", "", "Control de vacaciones y ausencias", "RRHH", "Activa", "Externa", "VA", 4],
    ["Pedido Mensual", "Pedidos", "", "Solicitud y seguimiento de pedidos recurrentes", "Administracion", "Activa", "Interna", "PM", 5],
    ["Control de Visitas & ARs", "Operaciones", "", "Gestion de visitas y acciones requeridas", "Supervision", "Activa", "Interna", "CV", 6],
    ["Reportes", "Reportes", "", "Reportes operativos y gerenciales", "Gerencia", "Activa", "Interna", "RP", 7],
    ["Capacitaciones", "Capacitacion", "", "Seguimiento de capacitaciones", "Entrenamiento", "Activa", "Interna", "CA", 8],
    ["Ingresos Extraordinarios", "Operaciones", "", "Gestion de ingresos fuera de rutina", "Operaciones", "Activa", "Interna", "IE", 9]
  ].map(([name, category, url, description, responsible, status, type, icon, sort_order]) =>
    withId({ name, category, url, description, responsible, status, type, icon, sort_order, comments: "" })
  );

  state.projects = seedProjects;
  state.tools = seedTools;

  const today = new Date();
  state.scheduled_visits = seedProjects.map((project, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), 3 + index * 3);
    return withId({
      project_id: project.id,
      date: toInputDate(date),
      day: dayNames[date.getDay()],
      scheduled_hours: project.suggested_hours,
      status: index < 3 ? "Realizada" : index === 3 ? "Reprogramada" : "Programada",
      comments: index < 3 ? "Visita completada segun plan." : ""
    });
  });

  state.visit_records = state.scheduled_visits.slice(0, 3).map((visit, index) =>
    withId({
      project_id: visit.project_id,
      date: visit.date,
      start_time: "08:00",
      end_time: index === 2 ? "12:30" : "12:00",
      site_audit: "Si",
      warehouse_review: index === 1 ? "No" : "Si",
      training_review: "Si",
      supervision_followup: "Si",
      findings: index === 1 ? "Actualizar rotulacion de bodega." : "Sin hallazgos criticos.",
      comments: "Registro inicial de demostracion."
    })
  );

  state.ars = [
    withId({
      project_id: seedProjects[1].id,
      source: "Visita",
      finding_date: toInputDate(today),
      finding: "Rotulacion de bodega incompleta",
      required_action: "Actualizar etiquetas y validar inventario visible",
      owner: "Supervisor local",
      priority: "Media",
      due_date: toInputDate(addDays(today, 5)),
      status: "En proceso",
      closing_comment: "",
      evidence_url: ""
    }),
    withId({
      project_id: seedProjects[0].id,
      source: "Capacitacion",
      finding_date: toInputDate(addDays(today, -8)),
      finding: "Pendiente evidencia de capacitacion",
      required_action: "Cargar lista de asistencia firmada",
      owner: "Coordinador de proyecto",
      priority: "Alta",
      due_date: toInputDate(addDays(today, -2)),
      status: "Vencida",
      closing_comment: "",
      evidence_url: ""
    })
  ];

  if (saveRemote && supabaseClient) {
    await supabaseClient.from("projects").insert(stripMeta(state.projects));
    await supabaseClient.from("tools").insert(stripMeta(state.tools));
    await supabaseClient.from("scheduled_visits").insert(stripMeta(state.scheduled_visits));
    await supabaseClient.from("visit_records").insert(stripMeta(state.visit_records));
    await supabaseClient.from("ars").insert(stripMeta(state.ars));
  }
  saveLocal();
}

function fillStaticOptions() {
  const categoryOptions = categories.map((item) => `<option>${item}</option>`).join("");
  document.querySelector('select[name="category"]').innerHTML = categoryOptions;
  els.toolCategoryFilter.innerHTML = `<option value="">Todas las categorias</option>${categoryOptions}`;
}

function fillMonthOptions() {
  const now = new Date();
  const months = [];
  for (let offset = -2; offset <= 6; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    months.push({
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("es-CR", { month: "long", year: "numeric" })
    });
  }
  els.monthFilter.innerHTML = months.map((month) => `<option value="${month.value}">${month.label}</option>`).join("");
  els.monthFilter.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function wireEvents() {
  wireCrudForm(els.projectForm, "projects");
  wireCrudForm(els.toolForm, "tools");
  wireCrudForm(els.scheduleForm, "scheduled_visits");
  wireCrudForm(els.recordForm, "visit_records");
  wireCrudForm(els.arForm, "ars");

  els.scheduleForm.date.addEventListener("change", () => {
    els.scheduleForm.day.value = dayNames[new Date(`${els.scheduleForm.date.value}T00:00:00`).getDay()] || "";
  });

  els.scheduleForm.project_id.addEventListener("change", () => {
    const project = getProject(els.scheduleForm.project_id.value);
    if (project) els.scheduleForm.scheduled_hours.value = project.suggested_hours || 0;
  });

  document.querySelectorAll("[data-reset-form]").forEach((button) => {
    button.addEventListener("click", () => document.querySelector(`#${button.dataset.resetForm}`).reset());
  });

  ["input", "change"].forEach((eventName) => {
    [els.monthFilter, els.projectSearch, els.toolSearch, els.toolCategoryFilter, els.toolSort, els.scheduleSearch, els.arStatusFilter, els.reportType, els.reportProject].forEach((element) => {
      element.addEventListener(eventName, renderAll);
    });
  });

  document.body.addEventListener("click", handleActionClick);
  els.exportAllBtn.addEventListener("click", () => exportCsv("control-gerencial.csv", buildAllRows()));
  els.exportReportBtn.addEventListener("click", () => exportCsv("reporte-control-gerencial.csv", buildReportRows()));
  els.backupBtn.addEventListener("click", exportBackup);
}

function wireCrudForm(form, table) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    data.id = data.id || createId();
    normalizeRecord(table, data);
    await upsertRecord(table, data);
    form.reset();
    renderAll();
  });
}

async function upsertRecord(table, record) {
  record.updated_at = new Date().toISOString();
  const index = state[table].findIndex((item) => item.id === record.id);
  if (index >= 0) state[table][index] = { ...state[table][index], ...record };
  else state[table].push({ ...record, created_at: new Date().toISOString() });

  if (supabaseClient) {
    const { error } = await supabaseClient.from(table).upsert(stripOne(record));
    if (error) alert(`No se pudo guardar en Supabase: ${error.message}`);
  }
  saveLocal();
}

async function deleteRecord(table, id) {
  const record = state[table].find((item) => item.id === id);
  if (!record) return;
  const confirmed = confirm("Se enviara este registro a papelera por 30 dias. Deseas continuar?");
  if (!confirmed) return;

  const deleted = withId({
    table_name: table,
    record_id: id,
    record_data: record,
    deleted_at: new Date().toISOString(),
    restore_until: addDays(new Date(), 30).toISOString()
  });

  state.recycle_bin.push(deleted);
  state[table] = state[table].filter((item) => item.id !== id);

  if (supabaseClient) {
    await supabaseClient.from("recycle_bin").insert(stripOne(deleted));
    const { error } = await supabaseClient.from(table).delete().eq("id", id);
    if (error) alert(`No se pudo eliminar en Supabase: ${error.message}`);
  }
  saveLocal();
  renderAll();
}

async function duplicateRecord(table, id) {
  const record = state[table].find((item) => item.id === id);
  if (!record) return;
  const copy = { ...record, id: createId(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  if (copy.name) copy.name = `${copy.name} copia`;
  await upsertRecord(table, copy);
  renderAll();
}

function editRecord(table, id) {
  const formMap = {
    projects: els.projectForm,
    tools: els.toolForm,
    scheduled_visits: els.scheduleForm,
    visit_records: els.recordForm,
    ars: els.arForm
  };
  const form = formMap[table];
  const record = state[table].find((item) => item.id === id);
  if (!form || !record) return;
  Object.entries(record).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value || "";
  });
  form.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function toggleTool(id) {
  const tool = state.tools.find((item) => item.id === id);
  if (!tool) return;
  tool.status = tool.status === "Activa" ? "Inactiva" : "Activa";
  await upsertRecord("tools", tool);
}

function handleActionClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action, table, id, url } = button.dataset;
  if (action === "edit") editRecord(table, id);
  if (action === "duplicate") duplicateRecord(table, id);
  if (action === "delete") deleteRecord(table, id);
  if (action === "toggle-tool") toggleTool(id);
  if (action === "open-tool" && url) window.open(url, "_blank", "noopener");
}

function renderAll() {
  updateExpiredArs();
  fillProjectOptions();
  renderMetrics();
  renderTools();
  renderProjects();
  renderSchedule();
  renderRecords();
  renderArs();
  renderReports();
  saveLocal();
}

function fillProjectOptions() {
  const activeProjects = state.projects.filter((project) => project.status !== "Inactivo");
  const options = activeProjects.map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`).join("");
  document.querySelectorAll('select[name="project_id"]').forEach((select) => {
    const current = select.value;
    select.innerHTML = options;
    if (current) select.value = current;
  });
  const currentReport = els.reportProject.value;
  els.reportProject.innerHTML = `<option value="">Todos</option>${options}`;
  els.reportProject.value = currentReport;
}

function renderMetrics() {
  const month = els.monthFilter.value;
  const monthlySchedule = state.scheduled_visits.filter((visit) => visit.date?.startsWith(month));
  const monthlyRecords = state.visit_records.filter((record) => record.date?.startsWith(month));
  const scheduled = monthlySchedule.length;
  const completed = monthlySchedule.filter((visit) => visit.status === "Realizada").length;
  const compliance = scheduled ? Math.round((completed / scheduled) * 100) : 0;
  const openArs = state.ars.filter((ar) => ar.status === "Abierta" || ar.status === "En proceso").length;
  const closedArs = state.ars.filter((ar) => ar.status === "Cerrada").length;
  const overdueArs = state.ars.filter((ar) => ar.status === "Vencida").length;
  const supervisionHours = monthlyRecords.reduce((total, record) => total + getHours(record.start_time, record.end_time), 0);

  const metrics = [
    ["Proyectos activos", state.projects.filter((item) => item.status === "Activo").length, ""],
    ["Visitas programadas", scheduled, ""],
    ["Visitas realizadas", completed, "ok"],
    ["Cumplimiento", `${compliance}%`, compliance >= 80 ? "ok" : "warn"],
    ["ARs abiertos", openArs, "warn"],
    ["ARs cerrados", closedArs, "ok"],
    ["ARs vencidos", overdueArs, overdueArs ? "danger" : "ok"],
    ["Horas supervision", supervisionHours.toFixed(1), ""]
  ];

  els.metricsGrid.innerHTML = metrics.map(([label, value, tone]) => metricCard(label, value, tone)).join("");
}

function renderTools() {
  const search = els.toolSearch.value.toLowerCase();
  const category = els.toolCategoryFilter.value;
  const sort = els.toolSort.value;
  const rows = state.tools
    .filter((tool) => (!category || tool.category === category) && Object.values(tool).join(" ").toLowerCase().includes(search))
    .sort((a, b) => String(a[sort] || "").localeCompare(String(b[sort] || ""), "es", { numeric: true }));

  const active = state.tools.filter((tool) => tool.status === "Activa").length;
  const inactive = state.tools.filter((tool) => tool.status === "Inactiva").length;
  els.toolsMetrics.innerHTML = [
    metricCard("Herramientas activas", active, "ok"),
    metricCard("Herramientas inactivas", inactive, inactive ? "warn" : ""),
    metricCard("Categorias", new Set(state.tools.map((tool) => tool.category)).size, ""),
    metricCard("Accesos importantes", state.tools.filter((tool) => Number(tool.sort_order) <= 3).length, "")
  ].join("");

  if (!rows.length) {
    els.toolsGrid.innerHTML = `<div class="empty-state">No hay herramientas con esos filtros.</div>`;
    return;
  }

  els.toolsGrid.innerHTML = rows.map((tool) => `
    <article class="tool-card">
      <div class="tool-card-header">
        <span class="tool-icon">${escapeHtml(tool.icon || "*")}</span>
        ${statusPill(tool.status)}
      </div>
      <div>
        <h3>${escapeHtml(tool.name)}</h3>
        <p>${escapeHtml(tool.description || "Sin descripcion")}</p>
      </div>
      <p><strong>${escapeHtml(tool.category || "")}</strong> | ${escapeHtml(tool.type || "")}<br>Responsable: ${escapeHtml(tool.responsible || "Sin asignar")}</p>
      <div class="card-actions">
        <button class="small-btn primary" type="button" data-action="open-tool" data-url="${escapeAttr(tool.url || "")}" ${tool.url ? "" : "disabled"}>Abrir</button>
        <button class="small-btn" type="button" data-action="edit" data-table="tools" data-id="${tool.id}">Editar</button>
        <button class="small-btn" type="button" data-action="duplicate" data-table="tools" data-id="${tool.id}">Duplicar</button>
        <button class="small-btn" type="button" data-action="toggle-tool" data-id="${tool.id}">${tool.status === "Activa" ? "Inactivar" : "Activar"}</button>
        <button class="small-btn danger" type="button" data-action="delete" data-table="tools" data-id="${tool.id}">Eliminar</button>
      </div>
    </article>
  `).join("");
}

function renderProjects() {
  const search = els.projectSearch.value.toLowerCase();
  const rows = state.projects.filter((project) => Object.values(project).join(" ").toLowerCase().includes(search));
  els.projectsTable.innerHTML = rows.map((project) => `
    <tr>
      <td>${escapeHtml(project.name)}</td>
      <td>${escapeHtml(project.location || "")}</td>
      <td>${escapeHtml(project.site_type || "")}</td>
      <td>${escapeHtml(project.frequency || "")}</td>
      <td>${project.suggested_hours || 0}</td>
      <td>${escapeHtml(project.client || "")}</td>
      <td>${statusPill(project.status || "Activo")}</td>
      <td>${rowActions("projects", project.id)}</td>
    </tr>
  `).join("");
}

function renderSchedule() {
  const search = els.scheduleSearch.value.toLowerCase();
  const rows = state.scheduled_visits
    .filter((visit) => `${projectName(visit.project_id)} ${Object.values(visit).join(" ")}`.toLowerCase().includes(search))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  els.scheduleTable.innerHTML = rows.map((visit) => {
    const project = getProject(visit.project_id);
    return `
      <tr>
        <td>${formatDate(visit.date)}<br><small>${escapeHtml(visit.day || "")}</small></td>
        <td>${escapeHtml(projectName(visit.project_id))}</td>
        <td>${escapeHtml(project?.location || "")}</td>
        <td>${visit.scheduled_hours || 0}</td>
        <td>${statusPill(visit.status)}</td>
        <td>${escapeHtml(visit.comments || "")}</td>
        <td>${rowActions("scheduled_visits", visit.id)}</td>
      </tr>
    `;
  }).join("");
}

function renderRecords() {
  els.recordsTable.innerHTML = state.visit_records
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .map((record) => `
      <tr>
        <td>${formatDate(record.date)}</td>
        <td>${escapeHtml(projectName(record.project_id))}</td>
        <td>${record.start_time || ""} - ${record.end_time || ""}</td>
        <td>${record.site_audit || ""}</td>
        <td>${record.warehouse_review || ""}</td>
        <td>${record.training_review || ""}</td>
        <td>${escapeHtml(record.findings || "")}</td>
        <td>${rowActions("visit_records", record.id)}</td>
      </tr>
    `).join("");
}

function renderArs() {
  const filter = els.arStatusFilter.value;
  els.arsTable.innerHTML = state.ars
    .filter((ar) => !filter || ar.status === filter)
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
    .map((ar) => `
      <tr>
        <td>${escapeHtml(projectName(ar.project_id))}</td>
        <td>${escapeHtml(ar.priority || "")}</td>
        <td>${escapeHtml(ar.finding || "")}</td>
        <td>${escapeHtml(ar.required_action || "")}</td>
        <td>${escapeHtml(ar.owner || "")}</td>
        <td>${formatDate(ar.due_date)}</td>
        <td>${statusPill(ar.status)}</td>
        <td>${rowActions("ars", ar.id)}</td>
      </tr>
    `).join("");
}

function renderReports() {
  const projectId = els.reportProject.value;
  const schedule = state.scheduled_visits.filter((item) => !projectId || item.project_id === projectId);
  const records = state.visit_records.filter((item) => !projectId || item.project_id === projectId);
  const ars = state.ars.filter((item) => !projectId || item.project_id === projectId);
  const type = els.reportType.value;
  let cards = [];

  if (type === "project") {
    cards = state.projects.map((project) => {
      const projectVisits = state.scheduled_visits.filter((visit) => visit.project_id === project.id);
      const done = projectVisits.filter((visit) => visit.status === "Realizada").length;
      return [project.name, `${done}/${projectVisits.length}`, "visitas realizadas"];
    });
  } else if (type === "compliance") {
    const done = schedule.filter((visit) => visit.status === "Realizada").length;
    const pending = schedule.filter((visit) => visit.status !== "Realizada").length;
    cards = [["Cumplimiento", `${schedule.length ? Math.round((done / schedule.length) * 100) : 0}%`, "visitas realizadas"], ["Pendientes", pending, "visitas sin completar"], ["ARs vencidos", ars.filter((ar) => ar.status === "Vencida").length, "acciones fuera de plazo"]];
  } else {
    cards = [["Visitas planificadas", schedule.length, type === "monthly" ? "reporte mensual" : "reporte trimestral"], ["Visitas registradas", records.length, "registros de campo"], ["ARs activos", ars.filter((ar) => ar.status !== "Cerrada").length, "acciones en seguimiento"]];
  }

  els.reportGrid.innerHTML = cards.map(([title, value, detail]) => `
    <article class="report-card">
      <span>${escapeHtml(detail)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <p>${escapeHtml(title)}</p>
    </article>
  `).join("");
}

function rowActions(table, id) {
  return `
    <div class="row-actions">
      <button class="small-btn" type="button" data-action="edit" data-table="${table}" data-id="${id}">Editar</button>
      <button class="small-btn" type="button" data-action="duplicate" data-table="${table}" data-id="${id}">Duplicar</button>
      <button class="small-btn danger" type="button" data-action="delete" data-table="${table}" data-id="${id}">Eliminar</button>
    </div>
  `;
}

function updateExpiredArs() {
  const today = toInputDate(new Date());
  state.ars.forEach((ar) => {
    if (ar.status !== "Cerrada" && ar.due_date && ar.due_date < today) ar.status = "Vencida";
  });
}

function normalizeRecord(table, data) {
  if (table === "projects") data.suggested_hours = Number(data.suggested_hours || 0);
  if (table === "tools") data.sort_order = Number(data.sort_order || 1);
  if (table === "scheduled_visits") {
    data.scheduled_hours = Number(data.scheduled_hours || 0);
    data.day = data.date ? dayNames[new Date(`${data.date}T00:00:00`).getDay()] : "";
  }
  if (table === "ars" && data.status === "Cerrada" && !data.closed_at) data.closed_at = new Date().toISOString();
}

function getProject(id) {
  return state.projects.find((project) => project.id === id);
}

function projectName(id) {
  return getProject(id)?.name || "Sin proyecto";
}

function metricCard(label, value, tone) {
  return `<article class="metric-card ${tone || ""}"><span>${label}</span><strong>${value}</strong></article>`;
}

function statusPill(status = "") {
  const tone = status === "Cerrada" || status === "Realizada" || status === "Activo" || status === "Activa" ? "good" : status === "Vencida" || status === "Inactivo" || status === "Inactiva" ? "danger" : "warn";
  return `<span class="status-pill ${tone}">${escapeHtml(status)}</span>`;
}

function buildAllRows() {
  return [
    ["Tipo", "Proyecto/Herramienta", "Fecha", "Estado", "Detalle", "Responsable", "Horas"],
    ...state.projects.map((project) => ["Proyecto", project.name, "", project.status, project.location || "", project.client || "", project.suggested_hours || ""]),
    ...state.tools.map((tool) => ["Herramienta", tool.name, "", tool.status, tool.description || "", tool.responsible || "", ""]),
    ...state.scheduled_visits.map((visit) => ["Agenda", projectName(visit.project_id), visit.date, visit.status, visit.comments || "", "", visit.scheduled_hours || ""]),
    ...state.visit_records.map((record) => ["Registro", projectName(record.project_id), record.date, "Realizada", record.findings || record.comments || "", "", getHours(record.start_time, record.end_time)]),
    ...state.ars.map((ar) => ["AR", projectName(ar.project_id), ar.due_date, ar.status, `${ar.finding || ""} - ${ar.required_action || ""}`, ar.owner || "", ""])
  ];
}

function buildReportRows() {
  return [["Reporte", "Proyecto", "Valor"], ...Array.from(document.querySelectorAll(".report-card")).map((card) => [
    els.reportType.options[els.reportType.selectedIndex].text,
    card.querySelector("p").textContent,
    card.querySelector("strong").textContent
  ])];
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json;charset=utf-8" });
  downloadBlob("respaldo-control-gerencial.json", blob);
}

function exportCsv(filename, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  downloadBlob(filename, new Blob([csv], { type: "text/csv;charset=utf-8" }));
}

function downloadBlob(filename, blob) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function saveLocal() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function stripMeta(rows) {
  return rows.map(stripOne);
}

function stripOne(row) {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined));
}

function withId(record) {
  const now = new Date().toISOString();
  return { id: createId(), created_at: now, updated_at: now, ...record };
}

function createId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getHours(start, end) {
  if (!start || !end) return 0;
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  return Math.max(0, (endH * 60 + endM - startH * 60 - startM) / 60);
}

function formatDate(value) {
  if (!value) return "";
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-CR");
}

function toInputDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
