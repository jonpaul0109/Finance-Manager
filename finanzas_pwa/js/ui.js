/**
 * Utilidades compartidas: formato de moneda (USD, contexto Ecuador),
 * sistema de modal generico, helpers de creacion de elementos.
 */
const CURRENCY = "USD";

function money(n) {
  n = Number(n) || 0;
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function el(tag, opts, children) {
  const node = document.createElement(tag);
  opts = opts || {};
  Object.entries(opts).forEach(([k, v]) => {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (k === "html") node.innerHTML = v;
    else node.setAttribute(k, v);
  });
  (children || []).forEach((c) => c && node.appendChild(c));
  return node;
}

// -- Modal --------------------------------------------------------------
function openModal(title, bodyNode) {
  closeModal();
  const overlay = el("div", { class: "modal-overlay", id: "modal-overlay" });
  const box = el("div", { class: "modal-box" });
  const header = el("div", { class: "modal-header" }, [
    el("h3", { text: title }),
    el("button", { type: "button", class: "btn btn-ghost", text: "✕", onclick: closeModal }),
  ]);
  box.appendChild(header);
  box.appendChild(bodyNode);
  overlay.appendChild(box);
  overlay.addEventListener("click", (ev) => { if (ev.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
}

function closeModal() {
  const ov = document.getElementById("modal-overlay");
  if (ov) ov.remove();
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const ACCOUNT_TYPE_LABELS = {
  cash: "Efectivo",
  bank: "Cuenta bancaria",
  credit_card: "Tarjeta de crédito",
  loan_debt: "Préstamo (yo debo)",
  loan_credit: "Préstamo (me deben)",
};

function accountTypeLabel(t) { return ACCOUNT_TYPE_LABELS[t] || t; }
