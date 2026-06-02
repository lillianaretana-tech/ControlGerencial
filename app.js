const categories = ["Seguridad", "Inventario", "Auditoria", "Personal", "Pedidos", "Reportes", "Capacitacion", "Operaciones"];
const dayNames = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const storageKey = "control-gerencial-operativo-v2";
const moduleVisibilityKey = "control-gerencial-module-visibility-v1";
const sectionCollapseKey = "control-gerencial-section-collapse-v1";
const supabaseClient = window.appSupabase?.client || null;
const modules = [
  ["dashboard", "Dashboard"],
  ["vista", "Vista"],
  ["herramientas", "Centro de Herramientas"],
  ["proyectos", "Administrar Proyectos"],
  ["agenda", "Agenda"],
  ["registro", "Registro"],
  ["ars", "ARs"],
  ["reportes", "Reportes"]
];

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
  toolStatusFilter: document.querySelector("#toolStatusFilter"),
  toolSort: document.querySelector("#toolSort"),
  moduleVisibility: document.querySelector("#moduleVisibility"),
  scheduleSearch: document.querySelector("#scheduleSearch"),
  scheduleDateFilter: document.querySelector("#scheduleDateFilter"),
  scheduleStatusFilter: document.querySelector("#scheduleStatusFilter"),
  clearScheduleFilters: document.querySelector("#clearScheduleFilters"),
  agendaDaySummary: document.querySelector("#agendaDaySummary"),
  saveFeedback: document.querySelector("#saveFeedback"),
  arStatusFilter: document.querySelector("#arStatusFilter"),
  clearArVisitFilter: document.querySelector("#clearArVisitFilter"),
  importArProject: document.querySelector("#importArProject"),
  importArFile: document.querySelector("#importArFile"),
  importArBtn: document.querySelector("#importArBtn"),
  reportType: document.querySelector("#reportType"),
  reportProject: document.querySelector("#reportProject"),
  reportCharts: document.querySelector("#reportCharts"),
  reportGrid: document.querySelector("#reportGrid"),
  exportAllBtn: document.querySelector("#exportAllBtn"),
  exportReportBtn: document.querySelector("#exportReportBtn"),
  exportExcelBtn: document.querySelector("#exportExcelBtn"),
  exportPdfBtn: document.querySelector("#exportPdfBtn"),
  backupBtn: document.querySelector("#backupBtn")
};

let activeArVisitFilter = "";

init();

async function init() {
  fillStaticOptions();
  fillMonthOptions();
  setupCollapsibleSections();
  renderModuleVisibility();
  wireEvents();
  await loadData();
  renderAll();
}

async function loadData() {
  if (supabaseClient) {
    els.syncStatus.textContent = "Supabase conectado";
    els.syncStatus.title = "Los datos se leen y guardan en Supabase.";
    els.syncStatus.classList.add("online");
    try {
      for (const table of Object.keys(state)) {
        const { data, error } = await supabaseClient.from(table).select("*");
        if (error) throw error;
        state[table] = data || [];
      }
      if (!state.projects.length) await seedInitialData(true);
      if (state.projects.length && !state.tools.length) {
        state.tools = defaultTools();
        await supabaseClient.from("tools").insert(stripMeta(state.tools));
      }
      return;
    } catch (error) {
      alert(`Supabase no respondio. Se usara respaldo local temporal. Detalle: ${error.message}`);
    }
  }

  els.syncStatus.textContent = "Modo local";
  els.syncStatus.title = "Los datos se guardan solo en este navegador.";
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

  const seedTools = defaultTools();

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

function defaultTools() {
  return [
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
    [els.monthFilter, els.projectSearch, els.toolSearch, els.toolCategoryFilter, els.toolStatusFilter, els.toolSort, els.scheduleSearch, els.scheduleDateFilter, els.scheduleStatusFilter, els.arStatusFilter, els.reportType, els.reportProject].forEach((element) => {
      element.addEventListener(eventName, renderAll);
    });
  });

  document.body.addEventListener("click", handleActionClick);
  els.moduleVisibility.addEventListener("change", handleModuleVisibilityChange);
  els.clearArVisitFilter.addEventListener("click", () => {
    activeArVisitFilter = "";
    els.clearArVisitFilter.hidden = true;
    renderArs();
  });
  els.importArBtn.addEventListener("click", importArsFromFile);
  els.clearScheduleFilters.addEventListener("click", () => {
    els.scheduleSearch.value = "";
    els.scheduleDateFilter.value = "";
    els.scheduleStatusFilter.value = "";
    renderSchedule();
  });
  els.exportAllBtn.addEventListener("click", () => exportCsv("control-gerencial.csv", buildAllRows()));
  els.exportReportBtn.addEventListener("click", () => exportCsv("reporte-control-gerencial.csv", buildReportRows()));
  els.exportExcelBtn.addEventListener("click", exportExcelReport);
  els.exportPdfBtn.addEventListener("click", exportPdfReport);
  els.backupBtn.addEventListener("click", exportBackup);
}

function setupCollapsibleSections() {
  const saved = getSectionCollapse();
  document.querySelectorAll(".section-block").forEach((section) => {
    const heading = section.querySelector(".section-heading");
    if (!heading || section.querySelector(".section-content")) return;

    const content = document.createElement("div");
    content.className = "section-content";
    const moveNodes = Array.from(section.children).filter((child) => child !== heading);
    moveNodes.forEach((child) => content.appendChild(child));
    section.appendChild(content);

    const button = document.createElement("button");
    button.className = "collapse-btn";
    button.type = "button";
    button.setAttribute("aria-label", "Abrir o cerrar modulo");
    heading.appendChild(button);

    const collapsed = saved[section.id] ?? section.id !== "dashboard";
    setSectionCollapsed(section, collapsed);
    heading.addEventListener("click", (event) => {
      if (event.target.closest("select, input, button")) return;
      toggleSection(section);
    });
    button.addEventListener("click", () => toggleSection(section));
  });
}

function toggleSection(section) {
  setSectionCollapsed(section, !section.classList.contains("collapsed"));
  const saved = getSectionCollapse();
  saved[section.id] = section.classList.contains("collapsed");
  localStorage.setItem(sectionCollapseKey, JSON.stringify(saved));
}

function openSection(sectionId) {
  const section = document.querySelector(`#${sectionId}`);
  if (!section) return;
  setSectionCollapsed(section, false);
  const saved = getSectionCollapse();
  saved[section.id] = false;
  localStorage.setItem(sectionCollapseKey, JSON.stringify(saved));
}

function setSectionCollapsed(section, collapsed) {
  const button = section.querySelector(".collapse-btn");
  section.classList.toggle("collapsed", collapsed);
  if (button) {
    button.textContent = collapsed ? "+" : "-";
    button.setAttribute("aria-expanded", String(!collapsed));
  }
}

function getSectionCollapse() {
  const saved = localStorage.getItem(sectionCollapseKey);
  return saved ? JSON.parse(saved) : {};
}

function wireCrudForm(form, table) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    data.id = data.id || createId();
    normalizeRecord(table, data);
    await upsertRecord(table, data);
    form.reset();
    clearFormIdentity(form);
    showSaved(table);
    renderAll();
  });
}

function clearFormIdentity(form) {
  if (form.elements.id) form.elements.id.value = "";
  if (form.elements.scheduled_visit_id) form.elements.scheduled_visit_id.value = "";
}

function showSaved(table) {
  const labels = {
    projects: "Proyecto guardado.",
    tools: "Herramienta guardada.",
    scheduled_visits: "Visita agendada correctamente.",
    visit_records: "Registro de visita guardado.",
    ars: "AR guardado."
  };
  if (!els.saveFeedback) return;
  els.saveFeedback.textContent = labels[table] || "Guardado.";
  window.clearTimeout(showSaved.timer);
  showSaved.timer = window.setTimeout(() => {
    els.saveFeedback.textContent = "";
  }, 2800);
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
  if (action === "register-visit") startVisitRecord(id);
  if (action === "create-visit-ar") startVisitAr(id);
  if (action === "view-visit-ars") viewVisitArs(id);
  if (action === "mark-realized") markVisitRealized(id);
}

function startVisitRecord(visitId) {
  const visit = state.scheduled_visits.find((item) => item.id === visitId);
  if (!visit) return;
  els.recordForm.reset();
  els.recordForm.scheduled_visit_id.value = visit.id;
  els.recordForm.project_id.value = visit.project_id;
  els.recordForm.date.value = visit.date || "";
  els.recordForm.start_time.value = currentTime();
  openSection("registro");
  els.recordForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

function startVisitAr(visitId) {
  const visit = state.scheduled_visits.find((item) => item.id === visitId);
  if (!visit) return;
  els.arForm.reset();
  els.arForm.scheduled_visit_id.value = visit.id;
  els.arForm.project_id.value = visit.project_id;
  els.arForm.source.value = "Visita programada";
  els.arForm.finding_date.value = visit.date || toInputDate(new Date());
  openSection("ars");
  els.arForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

function viewVisitArs(visitId) {
  activeArVisitFilter = visitId;
  els.clearArVisitFilter.hidden = false;
  openSection("ars");
  renderArs();
  document.querySelector("#ars").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function markVisitRealized(visitId) {
  const visit = state.scheduled_visits.find((item) => item.id === visitId);
  if (!visit) return;
  visit.status = "Realizada";
  await upsertRecord("scheduled_visits", visit);
  renderAll();
}

function renderAll() {
  updateExpiredArs();
  fillProjectOptions();
  applyModuleVisibility();
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
  const currentImport = els.importArProject.value;
  els.importArProject.innerHTML = options;
  els.importArProject.value = currentImport;
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
  const status = els.toolStatusFilter.value;
  const sort = els.toolSort.value;
  const rows = state.tools
    .filter((tool) => (!category || tool.category === category) && (!status || tool.status === status) && Object.values(tool).join(" ").toLowerCase().includes(search))
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

function renderModuleVisibility() {
  const visibility = getModuleVisibility();
  els.moduleVisibility.innerHTML = modules.map(([id, label]) => `
    <label class="module-toggle">
      <span>${escapeHtml(label)}</span>
      <input type="checkbox" data-module-id="${id}" ${visibility[id] ? "checked" : ""} ${id === "vista" ? "disabled" : ""}>
    </label>
  `).join("");
  applyModuleVisibility();
}

function handleModuleVisibilityChange(event) {
  const input = event.target.closest("[data-module-id]");
  if (!input) return;
  const visibility = getModuleVisibility();
  visibility[input.dataset.moduleId] = input.checked;
  localStorage.setItem(moduleVisibilityKey, JSON.stringify(visibility));
  applyModuleVisibility();
}

function getModuleVisibility() {
  const defaults = Object.fromEntries(modules.map(([id]) => [id, true]));
  defaults.vista = true;
  const saved = localStorage.getItem(moduleVisibilityKey);
  return saved ? { ...defaults, ...JSON.parse(saved), vista: true } : defaults;
}

function applyModuleVisibility() {
  const visibility = getModuleVisibility();
  modules.forEach(([id]) => {
    const section = document.querySelector(`#${id}`);
    const navLink = document.querySelector(`.nav-list a[href="#${id}"]`);
    const visible = visibility[id] !== false;
    if (section) section.hidden = !visible;
    if (navLink) navLink.hidden = !visible;
  });
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
  const dateFilter = els.scheduleDateFilter.value;
  const statusFilter = els.scheduleStatusFilter.value;
  const rows = state.scheduled_visits
    .filter((visit) => {
      const matchesText = `${projectName(visit.project_id)} ${Object.values(visit).join(" ")}`.toLowerCase().includes(search);
      const matchesDate = !dateFilter || visit.date === dateFilter;
      const matchesStatus = !statusFilter || visit.status === statusFilter;
      return matchesText && matchesDate && matchesStatus;
    })
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  renderAgendaDaySummary(rows, dateFilter);
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
        <td>${scheduleActions(visit.id)}</td>
      </tr>
    `;
  }).join("");
}

function renderAgendaDaySummary(rows, dateFilter) {
  const allCount = state.scheduled_visits.length;
  if (!dateFilter) {
    els.agendaDaySummary.innerHTML = `<span class="agenda-chip"><strong>Agenda:</strong> mostrando ${rows.length} de ${allCount} visita(s)</span>`;
    return;
  }
  const totalHours = rows.reduce((total, visit) => total + Number(visit.scheduled_hours || 0), 0);
  const projects = rows.map((visit) => projectName(visit.project_id)).join(", ");
  els.agendaDaySummary.innerHTML = `
    <span class="agenda-chip"><strong>${formatDate(dateFilter)}</strong>: ${rows.length} visita(s), ${totalHours} hora(s)</span>
    <span>${escapeHtml(projects || "No hay visitas para esta fecha.")}</span>
  `;
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
    .filter((ar) => (!filter || ar.status === filter) && (!activeArVisitFilter || ar.scheduled_visit_id === activeArVisitFilter))
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
  const report = getReportData();
  const { projectId, schedule, records, ars } = report;
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
  renderReportCharts(report);
}

function getReportData() {
  const projectId = els.reportProject.value;
  const month = els.monthFilter.value;
  const schedule = state.scheduled_visits.filter((item) => (!projectId || item.project_id === projectId) && (!month || item.date?.startsWith(month)));
  const records = state.visit_records.filter((item) => (!projectId || item.project_id === projectId) && (!month || item.date?.startsWith(month)));
  const ars = state.ars.filter((item) => !projectId || item.project_id === projectId);
  const completed = schedule.filter((visit) => visit.status === "Realizada").length;
  const compliance = schedule.length ? Math.round((completed / schedule.length) * 100) : 0;
  const arStatus = countBy(ars, "status");
  const visitsByProject = state.projects.map((project) => ({
    project: project.name,
    planned: schedule.filter((visit) => visit.project_id === project.id).length,
    completed: schedule.filter((visit) => visit.project_id === project.id && visit.status === "Realizada").length
  })).filter((item) => item.planned || item.completed);

  return {
    projectId,
    month,
    schedule,
    records,
    ars,
    completed,
    compliance,
    arStatus,
    visitsByProject,
    generatedAt: new Date()
  };
}

function renderReportCharts(report) {
  const arTotal = report.ars.length || 1;
  const maxVisits = Math.max(1, ...report.visitsByProject.map((item) => item.planned));
  els.reportCharts.innerHTML = `
    <article class="chart-card">
      <h3>Cumplimiento mensual</h3>
      <div class="donut-lite" style="--pct: ${report.compliance}%"><span>${report.compliance}%</span></div>
      ${barRow("Realizadas", report.completed, report.schedule.length || 1, "ok")}
      ${barRow("Programadas", report.schedule.length, report.schedule.length || 1, "")}
    </article>
    <article class="chart-card">
      <h3>ARs por estado</h3>
      ${["Abierta", "En proceso", "Cerrada", "Vencida"].map((status) => {
        const tone = status === "Cerrada" ? "ok" : status === "Vencida" ? "danger" : "warn";
        return barRow(status, report.arStatus[status] || 0, arTotal, tone);
      }).join("")}
    </article>
    <article class="chart-card">
      <h3>Visitas por proyecto</h3>
      ${report.visitsByProject.length ? report.visitsByProject.slice(0, 6).map((item) => barRow(item.project, item.planned, maxVisits, "")).join("") : "<p>No hay visitas en el periodo.</p>"}
    </article>
  `;
}

function barRow(label, value, max, tone) {
  const pct = Math.max(0, Math.min(100, Math.round((Number(value || 0) / Number(max || 1)) * 100)));
  return `
    <div class="bar-row">
      <span>${escapeHtml(label)}</span>
      <span class="bar-track"><span class="bar-fill ${tone || ""}" style="width:${pct}%"></span></span>
      <strong>${value}</strong>
    </div>
  `;
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    const value = row[key] || "Sin estado";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function scheduleActions(id) {
  const relatedArs = state.ars.filter((ar) => ar.scheduled_visit_id === id).length;
  return `
    <div class="row-actions">
      <button class="small-btn primary" type="button" data-action="register-visit" data-id="${id}">Registrar visita</button>
      <button class="small-btn" type="button" data-action="create-visit-ar" data-id="${id}">Crear AR</button>
      <button class="small-btn" type="button" data-action="view-visit-ars" data-id="${id}">Ver ARs (${relatedArs})</button>
      <button class="small-btn" type="button" data-action="mark-realized" data-id="${id}">Marcar realizada</button>
      <button class="small-btn" type="button" data-action="edit" data-table="scheduled_visits" data-id="${id}">Editar</button>
      <button class="small-btn" type="button" data-action="duplicate" data-table="scheduled_visits" data-id="${id}">Duplicar</button>
      <button class="small-btn danger" type="button" data-action="delete" data-table="scheduled_visits" data-id="${id}">Eliminar</button>
    </div>
  `;
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
  if (data.scheduled_visit_id === "") data.scheduled_visit_id = null;
  if (data.finding_date === "") data.finding_date = null;
  if (data.closed_at === "") data.closed_at = null;
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

function exportExcelReport() {
  if (!window.XLSX) {
    exportExcelHtmlReport();
    return;
  }
  const report = getReportData();
  const workbook = XLSX.utils.book_new();
  const title = reportTitle(report);

  addSheet(workbook, "Resumen", [
    ["Control Gerencial Operativo"],
    [title],
    ["Generado", report.generatedAt.toLocaleString("es-CR")],
    [],
    ["Indicador", "Valor"],
    ["Visitas programadas", report.schedule.length],
    ["Visitas realizadas", report.completed],
    ["Cumplimiento", `${report.compliance}%`],
    ["ARs abiertas", report.arStatus.Abierta || 0],
    ["ARs en proceso", report.arStatus["En proceso"] || 0],
    ["ARs cerradas", report.arStatus.Cerrada || 0],
    ["ARs vencidas", report.arStatus.Vencida || 0]
  ], [28, 32]);

  addSheet(workbook, "Agenda", [
    ["Fecha", "Dia", "Proyecto", "Horas", "Estado", "Comentarios"],
    ...report.schedule.map((visit) => [visit.date, visit.day, projectName(visit.project_id), visit.scheduled_hours || 0, visit.status, visit.comments || ""])
  ], [14, 14, 28, 10, 16, 42]);

  addSheet(workbook, "Registros", [
    ["Fecha", "Proyecto", "Inicio", "Cierre", "Auditoria", "Bodega", "Capacitaciones", "Seguimiento", "Hallazgos", "Comentarios"],
    ...report.records.map((record) => [record.date, projectName(record.project_id), record.start_time || "", record.end_time || "", record.site_audit || "", record.warehouse_review || "", record.training_review || "", record.supervision_followup || "", record.findings || "", record.comments || ""])
  ], [14, 28, 10, 10, 12, 12, 16, 16, 42, 42]);

  addSheet(workbook, "ARs", [
    ["Proyecto", "Fuente", "Prioridad", "Hallazgo", "Accion requerida", "Responsable", "Compromiso", "Estado", "Cierre", "Evidencia"],
    ...report.ars.map((ar) => [projectName(ar.project_id), ar.source || "", ar.priority || "", ar.finding || "", ar.required_action || "", ar.owner || "", ar.due_date || "", ar.status || "", ar.closing_comment || "", ar.evidence_url || ""])
  ], [28, 18, 12, 42, 42, 22, 14, 16, 34, 30]);

  addSheet(workbook, "Graficos Datos", [
    ["Grafico", "Categoria", "Valor"],
    ["Cumplimiento", "Programadas", report.schedule.length],
    ["Cumplimiento", "Realizadas", report.completed],
    ...Object.entries(report.arStatus).map(([status, value]) => ["ARs por estado", status, value]),
    ...report.visitsByProject.map((item) => ["Visitas por proyecto", item.project, item.planned])
  ], [24, 30, 12]);

  XLSX.writeFile(workbook, `${fileBaseName("reporte-control-gerencial")}.xlsx`);
}

function exportExcelHtmlReport() {
  const report = getReportData();
  const sections = [
    ["Resumen", [
      ["Indicador", "Valor"],
      ["Visitas programadas", report.schedule.length],
      ["Visitas realizadas", report.completed],
      ["Cumplimiento", `${report.compliance}%`],
      ["ARs abiertas", report.arStatus.Abierta || 0],
      ["ARs en proceso", report.arStatus["En proceso"] || 0],
      ["ARs cerradas", report.arStatus.Cerrada || 0],
      ["ARs vencidas", report.arStatus.Vencida || 0]
    ]],
    ["Agenda", [
      ["Fecha", "Dia", "Proyecto", "Horas", "Estado", "Comentarios"],
      ...report.schedule.map((visit) => [visit.date, visit.day, projectName(visit.project_id), visit.scheduled_hours || 0, visit.status, visit.comments || ""])
    ]],
    ["ARs", [
      ["Proyecto", "Prioridad", "Hallazgo", "Accion requerida", "Responsable", "Compromiso", "Estado"],
      ...report.ars.map((ar) => [projectName(ar.project_id), ar.priority || "", ar.finding || "", ar.required_action || "", ar.owner || "", ar.due_date || "", ar.status || ""])
    ]]
  ];
  const html = `
    <html>
      <head><meta charset="utf-8"></head>
      <body>
        <h1>Control Gerencial Operativo</h1>
        <h2>${escapeHtml(reportTitle(report))}</h2>
        <p>Generado: ${escapeHtml(report.generatedAt.toLocaleString("es-CR"))}</p>
        ${sections.map(([title, rows]) => `
          <h2>${escapeHtml(title)}</h2>
          <table border="1">
            ${rows.map((row, index) => `<tr>${row.map((cell) => `<${index === 0 ? "th" : "td"}>${escapeHtml(cell)}</${index === 0 ? "th" : "td"}>`).join("")}</tr>`).join("")}
          </table>
        `).join("")}
      </body>
    </html>
  `;
  downloadBlob(`${fileBaseName("reporte-control-gerencial")}.xls`, new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" }));
}

function addSheet(workbook, name, rows, widths) {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = widths.map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

function exportPdfReport() {
  const jsPdf = window.jspdf?.jsPDF;
  if (!jsPdf) {
    openPrintableReport();
    return;
  }
  const report = getReportData();
  const doc = new jsPdf({ orientation: "landscape", unit: "pt", format: "a4" });
  const margin = 36;
  const title = reportTitle(report);

  doc.setFillColor(15, 21, 29);
  doc.rect(0, 0, 842, 92, "F");
  doc.setTextColor(238, 243, 248);
  doc.setFontSize(20);
  doc.text("Control Gerencial Operativo", margin, 42);
  doc.setFontSize(11);
  doc.text(title, margin, 64);
  doc.text(`Generado: ${report.generatedAt.toLocaleString("es-CR")}`, margin, 80);

  doc.setTextColor(28, 39, 51);
  drawPdfMetricCards(doc, report, margin, 116);
  drawPdfBars(doc, report, margin, 220);

  doc.autoTable({
    startY: 372,
    head: [["Fecha", "Proyecto", "Horas", "Estado", "Comentarios"]],
    body: report.schedule.map((visit) => [formatDate(visit.date), projectName(visit.project_id), visit.scheduled_hours || 0, visit.status, visit.comments || ""]),
    styles: { fontSize: 8, cellPadding: 5 },
    headStyles: { fillColor: [35, 100, 170] },
    margin: { left: margin, right: margin }
  });

  doc.addPage();
  doc.setFontSize(15);
  doc.text("Acciones requeridas", margin, 42);
  doc.autoTable({
    startY: 58,
    head: [["Proyecto", "Prioridad", "Hallazgo", "Accion", "Responsable", "Compromiso", "Estado"]],
    body: report.ars.map((ar) => [projectName(ar.project_id), ar.priority || "", ar.finding || "", ar.required_action || "", ar.owner || "", formatDate(ar.due_date), ar.status || ""]),
    styles: { fontSize: 8, cellPadding: 5 },
    headStyles: { fillColor: [35, 100, 170] },
    margin: { left: margin, right: margin }
  });

  doc.save(`${fileBaseName("reporte-control-gerencial")}.pdf`);
}

function openPrintableReport() {
  const report = getReportData();
  const html = `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(reportTitle(report))}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #1c2733; margin: 32px; }
          header { border-bottom: 3px solid #2364aa; margin-bottom: 22px; padding-bottom: 14px; }
          h1 { margin: 0 0 6px; }
          .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 18px 0; }
          .card { border: 1px solid #dbe2ea; border-radius: 8px; padding: 12px; }
          .card strong { display: block; font-size: 24px; margin-top: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 12px; }
          th, td { border: 1px solid #dbe2ea; padding: 7px; text-align: left; vertical-align: top; }
          th { background: #2364aa; color: white; }
          .bar { height: 10px; background: #dbe2ea; border-radius: 999px; overflow: hidden; }
          .fill { height: 100%; background: #2d7a46; width: ${report.compliance}%; }
          @media print { body { margin: 18px; } }
        </style>
      </head>
      <body>
        <header>
          <h1>Control Gerencial Operativo</h1>
          <div>${escapeHtml(reportTitle(report))}</div>
          <div>Generado: ${escapeHtml(report.generatedAt.toLocaleString("es-CR"))}</div>
        </header>
        <section class="cards">
          <div class="card">Programadas<strong>${report.schedule.length}</strong></div>
          <div class="card">Realizadas<strong>${report.completed}</strong></div>
          <div class="card">Cumplimiento<strong>${report.compliance}%</strong></div>
          <div class="card">ARs vencidas<strong>${report.arStatus.Vencida || 0}</strong></div>
        </section>
        <h2>Cumplimiento</h2>
        <div class="bar"><div class="fill"></div></div>
        <h2>Agenda</h2>
        <table>
          <thead><tr><th>Fecha</th><th>Proyecto</th><th>Horas</th><th>Estado</th><th>Comentarios</th></tr></thead>
          <tbody>${report.schedule.map((visit) => `<tr><td>${formatDate(visit.date)}</td><td>${escapeHtml(projectName(visit.project_id))}</td><td>${visit.scheduled_hours || 0}</td><td>${escapeHtml(visit.status)}</td><td>${escapeHtml(visit.comments || "")}</td></tr>`).join("")}</tbody>
        </table>
        <h2>ARs</h2>
        <table>
          <thead><tr><th>Proyecto</th><th>Prioridad</th><th>Hallazgo</th><th>Accion</th><th>Responsable</th><th>Compromiso</th><th>Estado</th></tr></thead>
          <tbody>${report.ars.map((ar) => `<tr><td>${escapeHtml(projectName(ar.project_id))}</td><td>${escapeHtml(ar.priority || "")}</td><td>${escapeHtml(ar.finding || "")}</td><td>${escapeHtml(ar.required_action || "")}</td><td>${escapeHtml(ar.owner || "")}</td><td>${formatDate(ar.due_date)}</td><td>${escapeHtml(ar.status || "")}</td></tr>`).join("")}</tbody>
        </table>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `;
  const reportWindow = window.open("", "_blank", "noopener");
  if (!reportWindow) {
    downloadBlob(`${fileBaseName("reporte-control-gerencial")}.html`, new Blob([html], { type: "text/html;charset=utf-8" }));
    return;
  }
  reportWindow.document.write(html);
  reportWindow.document.close();
}

function drawPdfMetricCards(doc, report, x, y) {
  const cards = [
    ["Programadas", report.schedule.length],
    ["Realizadas", report.completed],
    ["Cumplimiento", `${report.compliance}%`],
    ["ARs vencidas", report.arStatus.Vencida || 0]
  ];
  cards.forEach(([label, value], index) => {
    const cardX = x + index * 196;
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(cardX, y, 176, 64, 6, 6, "F");
    doc.setTextColor(97, 112, 131);
    doc.setFontSize(9);
    doc.text(label, cardX + 14, y + 22);
    doc.setTextColor(28, 39, 51);
    doc.setFontSize(20);
    doc.text(String(value), cardX + 14, y + 48);
  });
}

function drawPdfBars(doc, report, x, y) {
  doc.setFontSize(13);
  doc.setTextColor(28, 39, 51);
  doc.text("Indicadores graficos", x, y);
  const rows = [
    ["Cumplimiento", report.compliance, 100],
    ["ARs cerradas", report.arStatus.Cerrada || 0, Math.max(1, report.ars.length)],
    ["ARs vencidas", report.arStatus.Vencida || 0, Math.max(1, report.ars.length)]
  ];
  rows.forEach(([label, value, max], index) => {
    const rowY = y + 28 + index * 30;
    const pct = Math.max(0, Math.min(1, Number(value) / Number(max || 1)));
    doc.setFontSize(9);
    doc.text(label, x, rowY);
    doc.setFillColor(219, 226, 234);
    doc.roundedRect(x + 120, rowY - 10, 250, 10, 5, 5, "F");
    doc.setFillColor(index === 2 ? 208 : 79, index === 2 ? 90 : 179, index === 2 ? 90 : 109);
    doc.roundedRect(x + 120, rowY - 10, 250 * pct, 10, 5, 5, "F");
    doc.text(String(value), x + 386, rowY);
  });
}

function reportTitle(report) {
  const project = report.projectId ? projectName(report.projectId) : "Todos los proyectos";
  const month = report.month ? els.monthFilter.options[els.monthFilter.selectedIndex].text : "Periodo actual";
  return `${month} | ${project}`;
}

function fileBaseName(prefix) {
  return `${prefix}-${toInputDate(new Date())}`;
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

function currentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

async function importArsFromFile() {
  const file = els.importArFile.files?.[0];
  const projectId = els.importArProject.value;
  if (!file) {
    alert("Selecciona un archivo Excel o CSV.");
    return;
  }
  if (!projectId) {
    alert("Selecciona el proyecto al que pertenecen los ARs.");
    return;
  }
  if (!window.XLSX) {
    alert("No se pudo cargar el lector de Excel. Como respaldo, guarda el archivo como CSV e intenta de nuevo.");
    return;
  }

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
    const imported = [];

    rows.forEach((row) => {
      const normalized = normalizeImportRow(row);
      const finding = pickValue(normalized, ["hallazgo", "finding", "observacion", "descripcion", "description", "issue"]);
      const action = pickValue(normalized, ["accion requerida", "accion", "action required", "required action", "action", "corrective action"]);
      if (!finding && !action) return;

      imported.push(withId({
        project_id: projectId,
        scheduled_visit_id: null,
        source: pickValue(normalized, ["fuente", "source"]) || "Importado desde Excel",
        finding_date: normalizeDate(pickValue(normalized, ["fecha hallazgo", "finding date", "fecha", "date"])) || null,
        finding: finding || "Sin hallazgo indicado",
        required_action: action || "Sin accion indicada",
        owner: pickValue(normalized, ["responsable", "owner", "assigned to", "asignado"]) || "",
        priority: normalizePriority(pickValue(normalized, ["prioridad", "priority"])) || "Media",
        due_date: normalizeDate(pickValue(normalized, ["fecha compromiso", "due date", "compromiso", "fecha limite", "deadline"])) || null,
        status: normalizeArStatus(pickValue(normalized, ["estado", "status"])) || "Abierta",
        closing_comment: pickValue(normalized, ["comentario de cierre", "closing comment", "cierre"]) || "",
        closed_at: null,
        evidence_url: pickValue(normalized, ["evidencia", "evidence", "evidence url", "url"]) || ""
      }));
    });

    if (!imported.length) {
      alert("No encontre filas importables. Revisa que el archivo tenga encabezados y columnas de hallazgo/accion.");
      return;
    }

    if (!confirm(`Se importaran ${imported.length} ARs para ${projectName(projectId)}. Deseas continuar?`)) return;

    state.ars.push(...imported);
    if (supabaseClient) {
      const { error } = await supabaseClient.from("ars").insert(stripMeta(imported));
      if (error) throw error;
    }
    saveLocal();
    els.importArFile.value = "";
    showSaved("ars");
    openSection("ars");
    renderAll();
    alert(`Importacion lista: ${imported.length} ARs agregados.`);
  } catch (error) {
    alert(`No se pudo importar el archivo: ${error.message}`);
  }
}

function normalizeImportRow(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeKey(key), value]));
}

function normalizeKey(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pickValue(row, keys) {
  for (const key of keys) {
    const value = row[normalizeKey(key)];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
  }
  return "";
}

function normalizeDate(value) {
  if (!value) return "";
  const asDate = new Date(value);
  if (!Number.isNaN(asDate.getTime())) return toInputDate(asDate);
  const parts = String(value).match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (!parts) return "";
  const year = parts[3].length === 2 ? `20${parts[3]}` : parts[3];
  return `${year}-${String(parts[2]).padStart(2, "0")}-${String(parts[1]).padStart(2, "0")}`;
}

function normalizePriority(value) {
  const text = normalizeKey(value);
  if (text.includes("alta") || text.includes("high")) return "Alta";
  if (text.includes("baja") || text.includes("low")) return "Baja";
  if (text.includes("media") || text.includes("medium")) return "Media";
  return "";
}

function normalizeArStatus(value) {
  const text = normalizeKey(value);
  if (text.includes("cerr")) return "Cerrada";
  if (text.includes("venc") || text.includes("overdue")) return "Vencida";
  if (text.includes("proceso") || text.includes("progress")) return "En proceso";
  if (text.includes("abier") || text.includes("open")) return "Abierta";
  return "";
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
