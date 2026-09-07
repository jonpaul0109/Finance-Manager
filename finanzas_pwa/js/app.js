/**
 * Controlador principal. Pestañas: Inicio, Movimientos, Cuentas,
 * Presupuestos. Todo el estado se recarga desde IndexedDB en cada
 * refreshApp() -- simple y sin riesgo de desincronizacion.
 */
let currentTab = "dashboard";

const TABS = {
  dashboard: { label: "🏠 Inicio", render: renderDashboard },
  transactions: { label: "💸 Movimientos", render: renderTransactions },
  accounts: { label: "💳 Cuentas", render: renderAccounts },
  budgets: { label: "🎯 Presupuestos", render: renderBudgets },
};

async function loadState() {
  const [accounts, transactions, categories, budgets] = await Promise.all([
    FinDB.getAll("accounts"),
    FinDB.getAll("transactions"),
    FinDB.getAll("categories"),
    FinDB.getAll("budgets"),
  ]);
  const balances = computeAllBalances(accounts, transactions);
  return { accounts, transactions, categories, budgets, balances };
}

async function refreshApp() {
  const state = await loadState();
  window.__state = state;

  const container = document.getElementById("view-container");
  TABS[currentTab].render(container, state);

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === currentTab);
  });

  renderActionBar(state);
}
window.refreshApp = refreshApp;

function renderActionBar(state) {
  const bar = document.getElementById("action-bar");
  bar.innerHTML = "";

  if (currentTab === "dashboard") {
    bar.appendChild(el("button", { type: "button", class: "btn btn-primary btn-lg", text: "+ Nuevo Movimiento",
      onclick: () => openModal("Nuevo Movimiento", transactionForm(state)) }));
  } else if (currentTab === "transactions") {
    bar.appendChild(el("button", { type: "button", class: "btn btn-primary", text: "+ Movimiento",
      onclick: () => openModal("Nuevo Movimiento", transactionForm(state)) }));
    bar.appendChild(el("button", { type: "button", class: "btn btn-secondary", text: "⬇ Exportar CSV",
      onclick: () => exportTransactionsCsv(state) }));
  } else if (currentTab === "accounts") {
    bar.appendChild(el("button", { type: "button", class: "btn btn-primary", text: "+ Cuenta",
      onclick: () => openModal("Nueva Cuenta", accountForm()) }));
  } else if (currentTab === "budgets") {
    bar.appendChild(el("button", { type: "button", class: "btn btn-primary", text: "+ Presupuesto",
      onclick: () => openModal("Nuevo Presupuesto", budgetForm(state)) }));
  }
}

function switchTab(tab) {
  currentTab = tab;
  refreshApp();
  window.scrollTo(0, 0);
}

async function init() {
  await ensureDefaultCategories();

  const nav = document.getElementById("tab-nav");
  Object.entries(TABS).forEach(([key, def]) => {
    nav.appendChild(el("button", {
      type: "button", class: "tab-btn", "data-tab": key, text: def.label,
      onclick: () => switchTab(key),
    }));
  });

  await refreshApp();
}

document.addEventListener("DOMContentLoaded", () => {
  init().catch((err) => {
    console.error(err);
    alert("Error al iniciar la app: " + err.message);
  });
});
