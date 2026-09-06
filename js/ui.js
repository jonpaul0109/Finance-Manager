/**
 * Helpers de UI + formato + constantes de la app.
 */

// -- construccion de elementos DOM sin plantillas -----------------------
function el(tag, attrs, children) {
  const node = document.createElement(tag);
  attrs = attrs || {};
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "text") node.textContent = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null) node.setAttribute(k, v);
  });
  (children || []).forEach((c) => {
    if (c === null || c === undefined) return;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return node;
}

function field(labelText, inputEl) {
  return el("div", { class: "field-row" }, [
    el("label", { text: labelText }),
    inputEl,
  ]);
}

function numberInput(id, value, min, step) {
  return el("input", {
    type: "number", id, value: value !== undefined && value !== null ? value : "",
    ...(min !== undefined ? { min } : {}),
    step: step || "0.01",
  });
}

function dateInput(id, value) {
  return el("input", { type: "date", id, value: value || todayStr() });
}

function textInput(id, value, placeholder) {
  return el("input", { type: "text", id, value: value || "", placeholder: placeholder || "" });
}

// -- modal generico -------------------------------------------------------
function openModal(title, contentEl) {
  closeModal();
  const overlay = el("div", { class: "modal-overlay", id: "active-modal" }, [
    el("div", { class: "modal-box" }, [
      el("div", { class: "modal-header" }, [
        el("h3", { text: title }),
        el("button", { type: "button", class: "btn-ghost", text: "✕", onclick: closeModal }),
      ]),
      contentEl,
    ]),
  ]);
  document.body.appendChild(overlay);
}
function closeModal() {
  const m = document.getElementById("active-modal");
  if (m) m.remove();
}

// -- formato ---------------------------------------------------------------
function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

function money(n) {
  n = round2(n || 0);
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function todayStr() {
  const d = new Date();
  return fmtDate(d);
}
function nowIso() { return new Date().toISOString(); }

function fmtDate(d) {
  if (typeof d === "string") return d;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function stripTime(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function monthKey(dateStr) { return (dateStr || "").slice(0, 7); }

function monthLabel(ym) {
  const [y, m] = ym.split("-").map(Number);
  const names = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  return `${names[m - 1]} ${y}`;
}

function daysUntil(dateLike, today) {
  const d = typeof dateLike === "string" ? new Date(dateLike + "T00:00:00") : stripTime(dateLike);
  const t = stripTime(today || new Date());
  return Math.round((d - t) / 86400000);
}
function daysLabel(d) {
  if (d < 0) return `Vencido hace ${Math.abs(d)} día(s)`;
  if (d === 0) return "Hoy";
  if (d === 1) return "Mañana";
  return `En ${d} días`;
}

function addMonths(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + n);
  return fmtDate(d);
}
function monthsBetween(dateStr, today) {
  const d = new Date(dateStr + "T00:00:00");
  const t = stripTime(today || new Date());
  return (t.getFullYear() - d.getFullYear()) * 12 + (t.getMonth() - d.getMonth());
}

// -- constantes / etiquetas de enums (calcan los CHECK del esquema) ------
const ACCOUNT_TYPE_LABELS = { CASH: "Efectivo", BANK: "Cuenta bancaria", CREDIT_CARD: "Tarjeta de crédito" };
const DEBT_TYPE_LABELS = {
  PRESTAMO_PERSONAL: "Préstamo personal",
  PRESTAMO_BANCARIO: "Préstamo bancario",
  HIPOTECA: "Hipoteca",
  OTRO: "Otro",
};
const DEBT_STATUS_LABELS = { pending: "Pendiente", partial: "Parcial", paid: "Pagada" };
const TAX_STATUS_LABELS = { PENDING: "Pendiente", PAID: "Pagado", OVERDUE: "Vencido" };
const TAX_TYPE_LABELS = {
  RENTA: "Impuesto a la Renta", IVA: "IVA", PREDIAL: "Predial",
  VEHICULAR: "Matrícula Vehicular", MUNICIPAL: "Municipal", OTRO: "Otro",
};
const PAYMENT_TYPE_LABELS = { CORRIENTE: "Corriente", DIFERIDO: "Diferido" };
