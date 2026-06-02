const projects = [
  { name: "Bayer Metro", location: "Aurora de Heredia", siteType: "Grande", hours: 4, frequency: "Semanal" },
  { name: "Uber COE", location: "Aurora de Heredia", siteType: "Grande", hours: 4, frequency: "Semanal" },
  { name: "McKinsey", location: "Lagunilla de Heredia", siteType: "Grande", hours: 4, frequency: "Semanal" },
  { name: "DXC", location: "Intraparque 2 / Lagunilla de Heredia", siteType: "Pequeno", hours: 2, frequency: "Quincenal" },
  { name: "LSEG", location: "Intraparque 2 / Lagunilla de Heredia", siteType: "Pequeno", hours: 2, frequency: "Quincenal" },
  { name: "Uber Cedral", location: "San Rafael Escazu", siteType: "Pequeno", hours: 2, frequency: "Quincenal" },
  { name: "WPlaces", location: "Avenida Escazu", siteType: "Pequeno", hours: 2, frequency: "Quincenal" },
  { name: "Uber Bambu", location: "Hatillo", siteType: "Pequeno", hours: 2, frequency: "Quincenal" }
];

const dayNames = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const storageKey = "control-visitas-ars-v1";

const state = loadState();

const els = {
  metricsGrid: document.querySelector("#metricsGrid"),
  monthFilter: document.querySelector("#monthFilter"),
  scheduleForm: document.querySelector("#visitScheduleForm"),
  recordForm: document.querySelector("#visitRecordForm"),
  arForm: document.querySelector("#arForm"),
  scheduleTable: document.querySelector("#scheduleTable"),
  recordsTable: document.querySelector("#recordsTable"),
  arsTable: document.querySelector("#arsTable"),
  scheduleSearch: document.querySelector("#scheduleSearch"),
  arStatusFilter: document.querySelector("#arStatusFilter"),
  reportType: document.querySelector("#reportType"),
  reportProject: document.querySelector("#reportProject"),
  reportGrid: document.querySelector("#reportGrid"),
  exportAllBtn: document.querySelector("#exportAllBtn"),
  exportReportBtn: document.querySelector("#exportReportBtn"),
  resetDataBtn: document.querySelector("#resetDataBtn")
};

init();

function init() {
  fillProjectOptions();
  fillMonthOptions();
  wireForms();
  renderAll();
}

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (saved) return JSON.parse(saved);

  const today = new Date();
  const baseSchedule = projects.map((project, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), 3 + index * 3);
    return {
      id: crypto.randomUUID(),
      date: toInputDate(date),
      day: dayNames[date.getDay()],
      project: project.name,
      location: project.location,
      siteType: project.siteType,
      frequency: project.frequency,
      scheduledHours: project.hours,
      status: index < 3 ? "Realizada" : index === 3 ? "Reprogramada" : "Programada",
      comments: index < 3 ? "Visita completada segun plan." : ""
    };
  });

  const baseRecords = baseSchedule.slice(0, 3).map((visit, index) => ({
    id: crypto.randomUUID(),
    project: visit.project,
    date: visit.date,
    startTime: "08:00",
    endTime: index === 2 ? "12:30" : "12:00",
    siteAudit: "Si",
    warehouseReview: index === 1 ? "No" : "Si",
    trainingReview: "Si",
    supervisionFollowup: "Si",
    findings: index === 1 ? "Actualizar rotulacion de bodega." : "Sin hallazgos criticos.",
    comments: "Registro inicial de demostracion."
  }));

  return {
    schedule: baseSchedule,
    records: baseRecords,
    ars: [
      {
        id: crypto.randomUUID(),
        project: "Uber COE",
        finding: "Rotulacion de bodega incompleta",
        action: "Actualizar etiquetas y validar inventario visible",
        owner: "Supervisor local",
        dueDate: toInputDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5)),
        status: "En proceso",
        closingComment: ""
      },
      {
        id: crypto.randomUUID(),
        project: "Bayer Metro",
        finding: "Pendiente evidencia de capacitacion",
        action: "Cargar lista de asistencia firmada",
        owner: "Coordinador de proyecto",
        dueDate: toInputDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2)),
        status: "Vencida",
        closingComment: ""
      }
    ]
  };
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function fillProjectOptions() {
  const options = projects.map((project) => `<option>${project.name}</option>`).join("");
  document.querySelectorAll('select[name="project"]').forEach((select) => {
    select.innerHTML = options;
  });
  els.reportProject.innerHTML += options;
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

function wireForms() {
  els.scheduleForm.date.addEventListener("change", () => {
    els.scheduleForm.day.value = dayNames[new Date(`${els.scheduleForm.date.value}T00:00:00`).getDay()] || "";
  });

  els.scheduleForm.project.addEventListener("change", () => applyProjectDefaults(els.scheduleForm));

  els.scheduleForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(els.scheduleForm));
    state.schedule.push({ id: crypto.randomUUID(), ...data });
    saveState();
    els.scheduleForm.reset();
    renderAll();
  });

  els.recordForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(els.recordForm));
    state.records.push({ id: crypto.randomUUID(), ...data });
    const scheduled = state.schedule.find((item) => item.project === data.project && item.date === data.date);
    if (scheduled) scheduled.status = "Realizada";
    saveState();
    els.recordForm.reset();
    renderAll();
  });

  els.arForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(els.arForm));
    state.ars.push({ id: crypto.randomUUID(), ...data });
    saveState();
    els.arForm.reset();
    renderAll();
  });

  [els.monthFilter, els.scheduleSearch, els.arStatusFilter, els.reportType, els.reportProject].forEach((element) => {
    element.addEventListener("input", renderAll);
  });

  els.exportAllBtn.addEventListener("click", () => exportCsv("control-visitas-ars.csv", buildAllRows()));
  els.exportReportBtn.addEventListener("click", () => exportCsv("reporte-control-visitas-ars.csv", buildReportRows()));
  els.resetDataBtn.addEventListener("click", () => {
    localStorage.removeItem(storageKey);
    location.reload();
  });

  applyProjectDefaults(els.scheduleForm);
}

function applyProjectDefaults(form) {
  const project = projects.find((item) => item.name === form.project.value);
  if (!project) return;
  form.location.value = project.location;
  form.siteType.value = project.siteType;
  form.frequency.value = project.frequency;
  form.scheduledHours.value = project.hours;
}

function renderAll() {
  updateExpiredArs();
  renderMetrics();
  renderSchedule();
  renderRecords();
  renderArs();
  renderReports();
  saveState();
}

function updateExpiredArs() {
  const today = toInputDate(new Date());
  state.ars.forEach((ar) => {
    if (ar.status !== "Cerrada" && ar.dueDate < today) ar.status = "Vencida";
  });
}

function renderMetrics() {
  const month = els.monthFilter.value;
  const monthlySchedule = state.schedule.filter((visit) => visit.date.startsWith(month));
  const monthlyRecords = state.records.filter((record) => record.date.startsWith(month));
  const scheduled = monthlySchedule.length;
  const completed = monthlySchedule.filter((visit) => visit.status === "Realizada").length;
  const compliance = scheduled ? Math.round((completed / scheduled) * 100) : 0;
  const openArs = state.ars.filter((ar) => ar.status === "Abierta" || ar.status === "En proceso").length;
  const closedArs = state.ars.filter((ar) => ar.status === "Cerrada").length;
  const overdueArs = state.ars.filter((ar) => ar.status === "Vencida").length;
  const supervisionHours = monthlyRecords.reduce((total, record) => total + getHours(record.startTime, record.endTime), 0);

  const metrics = [
    ["Visitas programadas", scheduled, ""],
    ["Visitas realizadas", completed, "ok"],
    ["Cumplimiento", `${compliance}%`, compliance >= 80 ? "ok" : "warn"],
    ["ARs abiertos", openArs, "warn"],
    ["ARs cerrados", closedArs, "ok"],
    ["ARs vencidos", overdueArs, overdueArs ? "danger" : "ok"],
    ["Horas supervision", supervisionHours.toFixed(1), ""]
  ];

  els.metricsGrid.innerHTML = metrics
    .map(([label, value, tone]) => `<article class="metric-card ${tone}"><span>${label}</span><strong>${value}</strong></article>`)
    .join("");
}

function renderSchedule() {
  const search = els.scheduleSearch.value.toLowerCase();
  const rows = state.schedule
    .filter((visit) => Object.values(visit).join(" ").toLowerCase().includes(search))
    .sort((a, b) => a.date.localeCompare(b.date));
  els.scheduleTable.innerHTML = rows.map((visit) => `
    <tr>
      <td>${formatDate(visit.date)}<br><small>${visit.day}</small></td>
      <td>${escapeHtml(visit.project)}</td>
      <td>${escapeHtml(visit.location)}</td>
      <td>${visit.siteType}</td>
      <td>${visit.frequency}</td>
      <td>${visit.scheduledHours}</td>
      <td>${statusPill(visit.status)}</td>
      <td>${escapeHtml(visit.comments || "")}</td>
    </tr>
  `).join("");
}

function renderRecords() {
  els.recordsTable.innerHTML = state.records
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((record) => `
      <tr>
        <td>${formatDate(record.date)}</td>
        <td>${escapeHtml(record.project)}</td>
        <td>${record.startTime} - ${record.endTime}</td>
        <td>${record.siteAudit}</td>
        <td>${record.warehouseReview}</td>
        <td>${record.trainingReview}</td>
        <td>${record.supervisionFollowup}</td>
        <td>${escapeHtml(record.findings || "")}</td>
      </tr>
    `).join("");
}

function renderArs() {
  const filter = els.arStatusFilter.value;
  els.arsTable.innerHTML = state.ars
    .filter((ar) => !filter || ar.status === filter)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .map((ar) => `
      <tr>
        <td>${escapeHtml(ar.project)}</td>
        <td>${escapeHtml(ar.finding)}</td>
        <td>${escapeHtml(ar.action)}</td>
        <td>${escapeHtml(ar.owner)}</td>
        <td>${formatDate(ar.dueDate)}</td>
        <td>${statusPill(ar.status)}</td>
        <td>${escapeHtml(ar.closingComment || "")}</td>
      </tr>
    `).join("");
}

function renderReports() {
  const project = els.reportProject.value;
  const schedule = state.schedule.filter((item) => !project || item.project === project);
  const records = state.records.filter((item) => !project || item.project === project);
  const ars = state.ars.filter((item) => !project || item.project === project);
  const type = els.reportType.value;

  let cards = [];
  if (type === "project") {
    cards = projects.map((projectItem) => {
      const projectVisits = state.schedule.filter((visit) => visit.project === projectItem.name);
      const done = projectVisits.filter((visit) => visit.status === "Realizada").length;
      return [projectItem.name, `${done}/${projectVisits.length}`, "visitas realizadas"];
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

function buildAllRows() {
  return [
    ["Tipo", "Proyecto", "Fecha", "Estado", "Detalle", "Responsable", "Horas"],
    ...state.schedule.map((visit) => ["Agenda", visit.project, visit.date, visit.status, visit.comments || "", "", visit.scheduledHours]),
    ...state.records.map((record) => ["Registro", record.project, record.date, "Realizada", record.findings || record.comments || "", "", getHours(record.startTime, record.endTime)]),
    ...state.ars.map((ar) => ["AR", ar.project, ar.dueDate, ar.status, `${ar.finding} - ${ar.action}`, ar.owner, ""])
  ];
}

function buildReportRows() {
  return [["Reporte", "Proyecto", "Valor"], ...Array.from(document.querySelectorAll(".report-card")).map((card) => [
    els.reportType.options[els.reportType.selectedIndex].text,
    card.querySelector("p").textContent,
    card.querySelector("strong").textContent
  ])];
}

function exportCsv(filename, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function statusPill(status) {
  const tone = status === "Cerrada" || status === "Realizada" ? "good" : status === "Vencida" ? "danger" : "warn";
  return `<span class="status-pill ${tone}">${escapeHtml(status)}</span>`;
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
