/**
 * Formularios de Cuenta / Movimiento / Presupuesto. Se abren dentro del
 * modal generico (ui.js) y guardan directo en IndexedDB.
 */

// ---------------------------------------------------------------------
// Formulario de Cuenta
// ---------------------------------------------------------------------
function accountForm(existing) {
  existing = existing || {};
  const form = el("form", { class: "modal-form" });

  const nameInput = el("input", { type: "text", value: existing.name || "", placeholder: "Ej: Banco Pichincha, Visa Oro..." });
  const typeSelect = el("select", {}, Object.entries(ACCOUNT_TYPE_LABELS).map(([val, label]) =>
    el("option", { value: val, text: label, ...(existing.type === val ? { selected: "selected" } : {}) })
  ));

  const condBox = el("div", { id: "acc-cond-fields" });

  function renderConditional() {
    condBox.innerHTML = "";
    const type = typeSelect.value;
    if (type === "cash" || type === "bank") {
      condBox.appendChild(field("Saldo inicial", numberInput("acc-initial", existing.initial_balance)));
    } else if (type === "credit_card") {
      condBox.appendChild(field("Saldo actual adeudado", numberInput("acc-initial", existing.initial_balance || 0)));
      condBox.appendChild(field("Límite de crédito", numberInput("acc-limit", existing.credit_limit)));
      condBox.appendChild(field("Día de corte (1-31)", numberInput("acc-cutoff", existing.cutoff_day, 1, 31)));
      condBox.appendChild(field("Día de pago (1-31)", numberInput("acc-due", existing.due_day, 1, 31)));
    } else if (type === "loan_debt" || type === "loan_credit") {
      const label = type === "loan_debt" ? "Monto que debo (principal)" : "Monto que me deben (principal)";
      condBox.appendChild(field(label, numberInput("acc-initial", existing.initial_balance)));
      condBox.appendChild(field("Número de cuotas", numberInput("acc-installments", existing.num_installments || 12, 1)));
      condBox.appendChild(field("Fecha de la primera cuota", dateInput("acc-start", existing.start_date || todayStr())));
    }
  }
  typeSelect.addEventListener("change", renderConditional);

  form.appendChild(field("Nombre", nameInput));
  form.appendChild(field("Tipo de cuenta", typeSelect));
  form.appendChild(condBox);
  renderConditional();

  const saveBtn = el("button", { type: "submit", class: "btn btn-primary btn-lg", text: existing.id ? "Guardar cambios" : "Crear cuenta" });
  form.appendChild(saveBtn);

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!nameInput.value.trim()) { alert("Ingresa un nombre para la cuenta."); return; }
    const type = typeSelect.value;
    const record = { name: nameInput.value.trim(), type };
    if (existing.id) record.id = existing.id;

    const getNum = (id) => {
      const elm = document.getElementById(id);
      return elm ? parseFloat(elm.value) || 0 : 0;
    };
    const getVal = (id) => {
      const elm = document.getElementById(id);
      return elm ? elm.value : "";
    };

    if (type === "cash" || type === "bank") {
      record.initial_balance = getNum("acc-initial");
    } else if (type === "credit_card") {
      record.initial_balance = getNum("acc-initial");
      record.credit_limit = getNum("acc-limit");
      record.cutoff_day = getNum("acc-cutoff");
      record.due_day = getNum("acc-due");
    } else if (type === "loan_debt" || type === "loan_credit") {
      record.initial_balance = getNum("acc-initial");
      record.num_installments = getNum("acc-installments") || 1;
      record.start_date = getVal("acc-start");
    }

    await FinDB.put("accounts", record);
    closeModal();
    window.refreshApp();
  });

  return form;
}

// ---------------------------------------------------------------------
// Formulario de Movimiento (ingreso / gasto / transferencia)
// ---------------------------------------------------------------------
function transactionForm(state, existing) {
  existing = existing || {};
  const { accounts, categories } = state;
  const form = el("form", { class: "modal-form" });

  const typeSelect = el("select", {}, [
    el("option", { value: "expense", text: "Gasto" }),
    el("option", { value: "income", text: "Ingreso" }),
    el("option", { value: "transfer", text: "Transferencia / Pago" }),
  ]);
  typeSelect.value = existing.type || "expense";

  const dateInputEl = dateInput("tx-date", existing.date || todayStr());
  const amountInputEl = numberInput("tx-amount", existing.amount);
  const noteInputEl = el("input", { type: "text", id: "tx-note", value: existing.note || "", placeholder: "Nota (opcional)" });

  const condBox = el("div", { id: "tx-cond-fields" });

  function accountOptions(selectedId) {
    return accounts.map((a) => el("option", {
      value: a.id, text: `${a.name} (${accountTypeLabel(a.type)})`,
      ...(selectedId === a.id ? { selected: "selected" } : {}),
    }));
  }
  function categoryOptions(catType, selectedId) {
    return categories.filter((c) => c.type === catType).map((c) => el("option", {
      value: c.id, text: c.name, ...(selectedId === c.id ? { selected: "selected" } : {}),
    }));
  }

  function renderConditional() {
    condBox.innerHTML = "";
    const type = typeSelect.value;
    if (type === "income") {
      condBox.appendChild(field("Cuenta destino", el("select", { id: "tx-to" }, accountOptions(existing.to_account_id))));
      condBox.appendChild(field("Categoría", el("select", { id: "tx-cat" }, categoryOptions("income", existing.category_id))));
    } else if (type === "expense") {
      condBox.appendChild(field("Cuenta de origen", el("select", { id: "tx-from" }, accountOptions(existing.from_account_id))));
      condBox.appendChild(field("Categoría", el("select", { id: "tx-cat" }, categoryOptions("expense", existing.category_id))));
    } else {
      condBox.appendChild(field("Desde (origen)", el("select", { id: "tx-from" }, accountOptions(existing.from_account_id))));
      condBox.appendChild(field("Hacia (destino)", el("select", { id: "tx-to" }, accountOptions(existing.to_account_id))));
      const hint = el("p", { class: "muted", text: "Tip: usa esto para pagar una tarjeta/préstamo (origen: tu banco, destino: la tarjeta/préstamo) o para cobrar un préstamo (origen: el préstamo, destino: tu banco)." });
      condBox.appendChild(hint);
    }
  }
  typeSelect.addEventListener("change", renderConditional);

  form.appendChild(field("Tipo", typeSelect));
  form.appendChild(field("Fecha", dateInputEl));
  form.appendChild(field("Monto", amountInputEl));
  form.appendChild(condBox);
  renderConditional();
  form.appendChild(field("Nota", noteInputEl));

  const saveBtn = el("button", { type: "submit", class: "btn btn-primary btn-lg", text: existing.id ? "Guardar cambios" : "Registrar movimiento" });
  form.appendChild(saveBtn);

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const type = typeSelect.value;
    const amount = parseFloat(document.getElementById("tx-amount").value);
    if (!amount || amount <= 0) { alert("Ingresa un monto valido (mayor a 0)."); return; }
    const date = document.getElementById("tx-date").value || todayStr();
    const note = document.getElementById("tx-note").value.trim();

    const record = { type, date, amount, note };
    if (existing.id) record.id = existing.id;

    if (type === "income") {
      record.to_account_id = parseInt(document.getElementById("tx-to").value, 10);
      record.category_id = parseInt(document.getElementById("tx-cat").value, 10);
    } else if (type === "expense") {
      record.from_account_id = parseInt(document.getElementById("tx-from").value, 10);
      record.category_id = parseInt(document.getElementById("tx-cat").value, 10);
    } else {
      record.from_account_id = parseInt(document.getElementById("tx-from").value, 10);
      record.to_account_id = parseInt(document.getElementById("tx-to").value, 10);
      if (record.from_account_id === record.to_account_id) {
        alert("El origen y el destino deben ser cuentas distintas.");
        return;
      }
    }

    await FinDB.put("transactions", record);
    closeModal();
    window.refreshApp();
  });

  return form;
}

// ---------------------------------------------------------------------
// Formulario de Presupuesto
// ---------------------------------------------------------------------
function budgetForm(state, existing) {
  existing = existing || {};
  const expenseCats = state.categories.filter((c) => c.type === "expense");
  const usedCatIds = new Set(state.budgets.filter((b) => b.id !== existing.id).map((b) => b.category_id));
  const available = expenseCats.filter((c) => !usedCatIds.has(c.id));

  const form = el("form", { class: "modal-form" });
  if (!available.length) {
    form.appendChild(el("p", { class: "muted", text: "Ya tenes un presupuesto para todas tus categorias de gasto." }));
    return form;
  }

  const catSelect = el("select", {}, available.map((c) => el("option", {
    value: c.id, text: c.name, ...(existing.category_id === c.id ? { selected: "selected" } : {}),
  })));
  const limitInput = numberInput("budget-limit", existing.limit_amount);

  form.appendChild(field("Categoría", catSelect));
  form.appendChild(field("Límite mensual", limitInput));
  form.appendChild(el("button", { type: "submit", class: "btn btn-primary btn-lg", text: existing.id ? "Guardar cambios" : "Crear presupuesto" }));

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const limit_amount = parseFloat(limitInput.value);
    if (!limit_amount || limit_amount <= 0) { alert("Ingresa un limite valido."); return; }
    const record = { category_id: parseInt(catSelect.value, 10), limit_amount };
    if (existing.id) record.id = existing.id;
    await FinDB.put("budgets", record);
    closeModal();
    window.refreshApp();
  });

  return form;
}

// -- helpers de campo -----------------------------------------------------
function field(label, inputNode) {
  return el("div", { class: "field-row" }, [el("label", { text: label }), inputNode]);
}
function numberInput(id, value, min, max) {
  const opts = { type: "number", step: "any", id, value: value === undefined || value === null ? "" : value };
  if (min !== undefined) opts.min = min;
  if (max !== undefined) opts.max = max;
  return el("input", opts);
}
function dateInput(id, value) {
  return el("input", { type: "date", id, value: value || "" });
}
