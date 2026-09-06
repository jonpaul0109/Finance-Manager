/**
 * Controlador principal. 5 pestañas: Inicio, Movimientos, Cuentas,
 * Deudas y Obligaciones, Metas. Todo el estado se recarga desde
 * IndexedDB en cada refreshApp() -- simple y sin riesgo de
 * desincronizacion.
 */
let currentTab = "dashboard";

const TABS = {
  dashboard: { label: "🏠 Inicio", render: renderDashboard },
  transactions: { label: "💸 Movimientos", render: renderTransactions },
  accounts: { label: "💳 Cuentas", render: renderAccounts },
  debts: { label: "📉 Deudas", render: renderDebts },
  goals: { label: "🎯 Metas", render: renderGoals },
};

async function loadState() {
  const [
    accounts, transactions, transfers, categories, subcategories, tags, transactionTags,
    debts, debtInstallments, debtPayments, creditCardPayments,
    budgets, budgetCategories, savingsGoals, savingsContributions,
    taxes, foodExpenses, vehicles,
  ] = await Promise.all([
    FinDB.getAll("accounts"), FinDB.getAll("transactions"), FinDB.getAll("transfers"),
    FinDB.getAll("categories"), FinDB.getAll("subcategories"), FinDB.getAll("tags"), FinDB.getAll("transaction_tags"),
    FinDB.getAll("debts"), FinDB.getAll("debt_installments"), FinDB.getAll("debt_payments"), FinDB.getAll("credit_card_payments"),
    FinDB.getAll("budgets"), FinDB.getAll("budget_categories"), FinDB.getAll("savings_goals"), FinDB.getAll("savings_contributions"),
    FinDB.getAll("taxes"), FinDB.getAll("food_expenses"), FinDB.getAll("vehicles"),
  ]);
  const balances = computeAllBalances(accounts, transactions, transfers);
  return {
    accounts, transactions, transfers, categories, subcategories, tags, transactionTags,
    debts, debtInstallments, debtPayments, creditCardPayments,
    budgets, budgetCategories, savingsGoals, savingsContributions,
    taxes, foodExpenses, vehicles, balances,
  };
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
    bar.appendChild(el("button", { type: "button", class: "btn btn-secondary", text: "+ Vehículo",
      onclick: () => openModal("Nuevo Vehículo", vehicleForm()) }));
  } else if (currentTab === "debts") {
    bar.appendChild(el("button", { type: "button", class: "btn btn-primary", text: "+ Deuda",
      onclick: () => openModal("Nueva Deuda", debtForm(state)) }));
    bar.appendChild(el("button", { type: "button", class: "btn btn-secondary", text: "+ Impuesto",
      onclick: () => openModal("Nuevo Impuesto", taxForm()) }));
  } else if (currentTab === "goals") {
    bar.appendChild(el("button", { type: "button", class: "btn btn-primary", text: "+ Presupuesto",
      onclick: () => openModal("Nuevo Presupuesto", budgetForm(state)) }));
    bar.appendChild(el("button", { type: "button", class: "btn btn-secondary", text: "+ Meta de Ahorro",
      onclick: () => openModal("Nueva Meta de Ahorro", savingsGoalForm(state)) }));
  }
}

function switchTab(tab) {
  currentTab = tab;
  refreshApp();
  window.scrollTo(0, 0);
}

async function init() {
  window.__userId = await ensureSeedData();

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
