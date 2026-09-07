/**
 * Formularios: Cuenta, Movimiento, Deuda (+ pago), Impuesto (+ pago),
 * Presupuesto mensual, Meta de ahorro (+ aporte), Vehiculo.
 */

// ---------------------------------------------------------------------
// Cuenta (incluye campos de Tarjeta de credito cuando corresponde)
// ---------------------------------------------------------------------
function accountForm(existing) {
  existing = existing || {};
  const form = el("form", { class: "modal-form" });

  const nameInput = textInput("acc-name", existing.account_name, "Ej: Banco Pichincha");
  const typeSelect = el("select", { id: "acc-type" }, Object.entries(ACCOUNT_TYPE_LABELS).map(([v, l]) =>
    el("option", { value: v, text: l, ...(existing.account_type === v ? { selected: "selected" } : {}) })));
  const institutionInput = textInput("acc-institution", existing.institution, "Ej: Banco Pichincha (opcional)");
  const initialInput = numberInput("acc-initial", existing.initial_balance ?? 0);

  form.appendChild(field("Nombre de la cuenta", nameInput));
  form.appendChild(field("Tipo", typeSelect));
  form.appendChild(field("Institución (opcional)", institutionInput));
  form.appendChild(field("Saldo inicial", initialInput));

  const condBox = el("div", { id: "acc-cond-fields" });
  form.appendChild(condBox);

  function renderConditional() {
    condBox.innerHTML = "";
    if (typeSelect.value === "CREDIT_CARD") {
      condBox.appendChild(field("Límite de crédito", numberInput("acc-limit", existing.credit_limit ?? "")));
      condBox.appendChild(field("Día de corte (1-31)", numberInput("acc-cutoff", existing.cutoff_day ?? "", 1, "1")));
      condBox.appendChild(field("Día de pago (1-31)", numberInput("acc-due", existing.payment_day ?? "", 1, "1")));
      condBox.appendChild(field("Tasa de interés anual % (opcional)", numberInput("acc-rate", existing.annual_interest_rate ?? "")));
    }
  }
  typeSelect.addEventListener("change", renderConditional);
  renderConditional();

  form.appendChild(el("button", { type: "submit", class: "btn btn-primary btn-lg", text: existing.id ? "Guardar cambios" : "Crear cuenta" }));

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!nameInput.value.trim()) { alert("Ingresa un nombre para la cuenta."); return; }
    const record = {
      user_id: window.__userId, account_name: nameInput.value.trim(), account_type: typeSelect.value,
      institution: institutionInput.value.trim(), currency: "USD",
      initial_balance: parseFloat(initialInput.value) || 0, is_active: 1, notes: "",
      created_at: existing.created_at || nowIso(), updated_at: nowIso(),
    };
    let creditLimit = null, cutoffDay = null, paymentDay = null, annualRate = null;
    if (typeSelect.value === "CREDIT_CARD") {
      creditLimit = parseFloat(document.getElementById("acc-limit").value) || 0;
      cutoffDay = parseInt(document.getElementById("acc-cutoff").value, 10) || null;
      paymentDay = parseInt(document.getElementById("acc-due").value, 10) || null;
      annualRate = parseFloat(document.getElementById("acc-rate").value) || 0;
      record.credit_limit = creditLimit;
      record.cutoff_day = cutoffDay;
      record.payment_day = paymentDay;
    }
    if (existing.id) record.id = existing.id;
    const accountId = await FinDB.put("accounts", record);

    // Espejo en credit_cards (tabla dedicada del esquema)
    if (typeSelect.value === "CREDIT_CARD") {
      const allCards = await FinDB.getAll("credit_cards");
      const existingCard = allCards.find((c) => c.account_id === accountId);
      const cardRecord = {
        account_id: accountId, card_name: nameInput.value.trim(), institution: institutionInput.value.trim(),
        credit_limit: creditLimit, cutoff_day: cutoffDay, payment_day: paymentDay,
        annual_interest_rate: annualRate, is_active: 1, notes: "",
        created_at: existingCard ? existingCard.created_at : nowIso(), updated_at: nowIso(),
      };
      if (existingCard) cardRecord.id = existingCard.id;
      await FinDB.put("credit_cards", cardRecord);
    }

    closeModal();
    window.refreshApp();
  });

  return form;
}

// ---------------------------------------------------------------------
// Vehiculo
// ---------------------------------------------------------------------
function vehicleForm(existing) {
  existing = existing || {};
  const form = el("form", { class: "modal-form" });
  const nameInput = textInput("veh-name", existing.name, "Ej: Toyota Hilux");
  const plateInput = textInput("veh-plate", existing.plate, "Placa (opcional)");
  const notesInput = textInput("veh-notes", existing.notes, "Nota (opcional)");
  form.appendChild(field("Nombre", nameInput));
  form.appendChild(field("Placa", plateInput));
  form.appendChild(field("Nota", notesInput));
  form.appendChild(el("button", { type: "submit", class: "btn btn-primary btn-lg", text: existing.id ? "Guardar cambios" : "Agregar vehículo" }));
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!nameInput.value.trim()) { alert("Ingresa un nombre para el vehiculo."); return; }
    const record = { name: nameInput.value.trim(), plate: plateInput.value.trim(), notes: notesInput.value.trim() };
    if (existing.id) record.id = existing.id;
    await FinDB.put("vehicles", record);
    closeModal();
    window.refreshApp();
  });
  return form;
}

// ---------------------------------------------------------------------
// Movimiento (ingreso / gasto / transferencia)
// ---------------------------------------------------------------------
function accountOptions(accounts, selectedId) {
  return accounts.map((a) => el("option", {
    value: a.id, text: `${a.account_name} (${ACCOUNT_TYPE_LABELS[a.account_type]})`,
    ...(selectedId === a.id ? { selected: "selected" } : {}),
  }));
}

function categoryOptions(categories, txType, selectedId) {
  const want = txType === "INCOME" ? "INCOME" : "EXPENSE";
  return categories.filter((c) => c.category_type === want).sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => el("option", { value: c.id, text: `${c.icon || ""} ${c.category_name}`.trim(), ...(selectedId === c.id ? { selected: "selected" } : {}) }));
}

function subcategoryOptions(subcategories, categoryId, selectedId) {
  const opts = [el("option", { value: "", text: "(ninguna)" })];
  subcategories.filter((s) => s.category_id === categoryId).sort((a, b) => a.sort_order - b.sort_order)
    .forEach((s) => opts.push(el("option", { value: s.id, text: s.subcategory_name, ...(selectedId === s.id ? { selected: "selected" } : {}) })));
  return opts;
}

function findCategoryByName(categories, name) {
  return categories.find((c) => c.category_name === name);
}

function transactionForm(state, existing) {
  existing = existing || {};
  const { accounts, categories, subcategories, tags, vehicles } = state;
  const form = el("form", { class: "modal-form" });

  const typeSelect = el("select", { id: "tx-type" }, [
    el("option", { value: "INCOME", text: "Ingreso" }),
    el("option", { value: "EXPENSE", text: "Gasto" }),
    el("option", { value: "TRANSFER", text: "Transferencia" }),
  ]);
  typeSelect.value = existing.transaction_type || "EXPENSE";
  form.appendChild(field("Tipo de movimiento", typeSelect));

  form.appendChild(field("Monto", numberInput("tx-amount", existing.amount ?? "", 0.01)));
  form.appendChild(field("Fecha", dateInput("tx-date", existing.transaction_date)));

  const condBox = el("div", { id: "tx-cond-fields" });
  form.appendChild(condBox);
  form.appendChild(field("Descripción (opcional)", textInput("tx-desc", existing.description, "Ej: Compras del mes")));

  function renderConditional() {
    condBox.innerHTML = "";
    const type = typeSelect.value;

    if (type === "TRANSFER") {
      condBox.appendChild(field("Cuenta origen", el("select", { id: "tx-from" }, accountOptions(accounts, existing.from_account_id))));
      condBox.appendChild(field("Cuenta destino", el("select", { id: "tx-to" }, accountOptions(accounts, existing.to_account_id))));
      return;
    }

    // INCOME o EXPENSE
    condBox.appendChild(field("Cuenta", el("select", { id: "tx-account" }, accountOptions(accounts, existing.account_id))));

    const catSelect = el("select", { id: "tx-cat" }, categoryOptions(categories, type, existing.category_id));
    condBox.appendChild(field("Categoría", catSelect));

    const subBox = el("div", { id: "tx-sub-box" });
    condBox.appendChild(subBox);

    const tagsBox = el("div", { class: "tag-checks" }, (tags || []).map((t) => {
      const checked = (existing.tag_ids || []).includes(t.id);
      const cb = el("input", { type: "checkbox", value: t.id, id: `tx-tag-${t.id}`, ...(checked ? { checked: "checked" } : {}) });
      return el("label", { class: "tag-chip" }, [cb, el("span", { text: t.tag_name })]);
    }));
    condBox.appendChild(field("Etiquetas (opcional)", tagsBox));

    const foodBox = el("div", { id: "tx-food-box" });
    condBox.appendChild(foodBox);

    const cardBox = el("div", { id: "tx-card-box" });
    condBox.appendChild(cardBox);

    if (type === "EXPENSE" && vehicles && vehicles.length) {
      const vehicleSelect = el("select", { id: "tx-vehicle" }, [
        el("option", { value: "", text: "(ninguno)" }),
        ...vehicles.map((v) => el("option", { value: v.id, text: v.name, ...(existing.vehicle_id === v.id ? { selected: "selected" } : {}) })),
      ]);
      condBox.appendChild(field("Vehículo (opcional)", vehicleSelect));
    }

    function renderSub() {
      subBox.innerHTML = "";
      const catId = parseInt(catSelect.value, 10);
      subBox.appendChild(field("Subcategoría (opcional)", el("select", { id: "tx-subcat" }, subcategoryOptions(subcategories, catId, existing.subcategory_id))));

      // Detalle de comida si la categoria es "Alimentacion"
      foodBox.innerHTML = "";
      const cat = categories.find((c) => c.id === catId);
      if (type === "EXPENSE" && cat && cat.category_name === "Alimentación") {
        foodBox.appendChild(field("Tipo de comida (opcional)", textInput("tx-food-type", existing.food_type, "Ej: Comida rápida, Casera...")));
        foodBox.appendChild(field("Momento", el("select", { id: "tx-meal-type" }, ["DESAYUNO", "ALMUERZO", "CENA", "MERIENDA", "OTRO"].map((m) =>
          el("option", { value: m, text: m.charAt(0) + m.slice(1).toLowerCase(), ...(existing.meal_type === m ? { selected: "selected" } : {}) })))));
        foodBox.appendChild(field("Personas (opcional)", numberInput("tx-people", existing.people_count ?? "", 1, "1")));
        foodBox.appendChild(field("Lugar (opcional)", textInput("tx-location", existing.location, "Ej: Restaurante X")));
      }
    }
    catSelect.addEventListener("change", renderSub);
    renderSub();

    function renderCardFields() {
      cardBox.innerHTML = "";
      if (type !== "EXPENSE") return;
      const accId = parseInt(document.getElementById("tx-account").value, 10);
      const acc = accounts.find((a) => a.id === accId);
      if (!acc || acc.account_type !== "CREDIT_CARD") return;

      const paymentSelect = el("select", { id: "tx-payment-type" }, [
        el("option", { value: "CORRIENTE", text: "Corriente (se factura completo este mes)" }),
        el("option", { value: "DIFERIDO", text: "Diferido a cuotas" }),
      ]);
      paymentSelect.value = existing.payment_type || "CORRIENTE";
      cardBox.appendChild(field("Tipo de pago", paymentSelect));

      const instBox = el("div", { id: "tx-installments-box" });
      cardBox.appendChild(instBox);
      function renderInstallments() {
        instBox.innerHTML = "";
        if (paymentSelect.value === "DIFERIDO") {
          instBox.appendChild(field("Número de cuotas", numberInput("tx-installments", existing.installments || 3, 1, "1")));
        }
      }
      paymentSelect.addEventListener("change", renderInstallments);
      renderInstallments();
    }
    document.getElementById("tx-account") && document.getElementById("tx-account").addEventListener("change", renderCardFields);
    setTimeout(renderCardFields, 0);
  }
  typeSelect.addEventListener("change", renderConditional);
  renderConditional();

  form.appendChild(el("button", { type: "submit", class: "btn btn-primary btn-lg", text: existing.id ? "Guardar cambios" : "Guardar movimiento" }));

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const type = typeSelect.value;
    const amount = parseFloat(document.getElementById("tx-amount").value);
    const date = document.getElementById("tx-date").value;
    const description = document.getElementById("tx-desc").value.trim();
    if (!amount || amount <= 0) { alert("Ingresa un monto valido."); return; }
    if (!date) { alert("Ingresa una fecha."); return; }

    if (type === "TRANSFER") {
      const fromId = parseInt(document.getElementById("tx-from").value, 10);
      const toId = parseInt(document.getElementById("tx-to").value, 10);
      if (fromId === toId) { alert("La cuenta origen y destino no pueden ser la misma."); return; }
      const record = { from_account_id: fromId, to_account_id: toId, amount, transfer_date: date, description, reference: "", created_at: nowIso() };
      if (existing.id) record.id = existing.id;
      await FinDB.put("transfers", record);
      closeModal();
      window.refreshApp();
      return;
    }

    const accountId = parseInt(document.getElementById("tx-account").value, 10);
    const categoryId = parseInt(document.getElementById("tx-cat").value, 10);
    const subEl = document.getElementById("tx-subcat");
    const subcategoryId = subEl && subEl.value ? parseInt(subEl.value, 10) : null;

    const record = {
      account_id: accountId, transaction_date: date, transaction_type: type, amount,
      description, category_id: categoryId, subcategory_id: subcategoryId,
      merchant: "", reference: "", is_pending: 0, notes: "",
      created_at: existing.created_at || nowIso(), updated_at: nowIso(),
    };

    const vehicleEl = document.getElementById("tx-vehicle");
    if (vehicleEl && vehicleEl.value) record.vehicle_id = parseInt(vehicleEl.value, 10);

    if (type === "EXPENSE") {
      const acc = accounts.find((a) => a.id === accountId);
      if (acc && acc.account_type === "CREDIT_CARD") {
        const paymentTypeEl = document.getElementById("tx-payment-type");
        record.payment_type = paymentTypeEl ? paymentTypeEl.value : "CORRIENTE";
        if (record.payment_type === "DIFERIDO") {
          const n = parseInt(document.getElementById("tx-installments").value, 10);
          if (!n || n < 1) { alert("Ingresa un numero de cuotas valido."); return; }
          record.installments = n;
        }
      }
    }

    if (existing.id) record.id = existing.id;
    const txId = await FinDB.put("transactions", record);

    // Etiquetas
    const oldLinks = (await FinDB.getAll("transaction_tags")).filter((l) => l.transaction_id === txId);
    for (const link of oldLinks) await FinDB.remove("transaction_tags", link.id);
    const checkedTags = Array.from(form.querySelectorAll('.tag-checks input[type="checkbox"]:checked')).map((cb) => parseInt(cb.value, 10));
    for (const tagId of checkedTags) await FinDB.put("transaction_tags", { transaction_id: txId, tag_id: tagId });

    // Detalle de comida
    const cat = categories.find((c) => c.id === categoryId);
    if (type === "EXPENSE" && cat && cat.category_name === "Alimentación") {
      const existingFood = (await FinDB.getAll("food_expenses")).find((f) => f.transaction_id === txId);
      const foodRecord = {
        transaction_id: txId,
        food_type: (document.getElementById("tx-food-type") || {}).value || "",
        meal_type: (document.getElementById("tx-meal-type") || {}).value || "OTRO",
        people_count: parseInt((document.getElementById("tx-people") || {}).value, 10) || null,
        location: (document.getElementById("tx-location") || {}).value || "",
        notes: "", created_at: nowIso(),
      };
      if (existingFood) foodRecord.id = existingFood.id;
      await FinDB.put("food_expenses", foodRecord);
    }

    closeModal();
    window.refreshApp();
  });

  return form;
}

// ---------------------------------------------------------------------
// Deuda (genera el cronograma de cuotas automaticamente al crearla)
// ---------------------------------------------------------------------
function debtForm(state, existing) {
  existing = existing || {};
  const { accounts, debtInstallments } = state;
  const form = el("form", { class: "modal-form" });

  const myInstallments = existing.id ? (debtInstallments || []).filter((i) => i.debt_id === existing.id) : [];
  const hasPayments = myInstallments.some((i) => (i.paid_amount || 0) > 0);
  const isEditable = !existing.id || !hasPayments;

  form.appendChild(field("Nombre de la deuda", textInput("debt-name", existing.debt_name, "Ej: Préstamo del auto")));
  form.appendChild(field("Acreedor", textInput("debt-creditor", existing.creditor, "Ej: Banco Pichincha")));
  form.appendChild(field("Tipo", el("select", { id: "debt-type" }, Object.entries(DEBT_TYPE_LABELS).map(([v, l]) =>
    el("option", { value: v, text: l, ...(existing.debt_type === v ? { selected: "selected" } : {}) })))));

  const amountInput = numberInput("debt-amount", existing.original_amount ?? "");
  const rateInput = numberInput("debt-rate", existing.interest_rate ?? 0);
  const startInput = dateInput("debt-start", existing.start_date);
  const installmentsInput = numberInput("debt-installments", myInstallments.length || 12, 1, "1");
  if (!isEditable) {
    [amountInput, rateInput, startInput, installmentsInput].forEach((i) => { i.disabled = true; });
  }
  form.appendChild(field("Monto original (principal)", amountInput));
  form.appendChild(field("Tasa de interés anual % (0 si no aplica)", rateInput));
  form.appendChild(field("Número de cuotas", installmentsInput));
  form.appendChild(field("Fecha de inicio", startInput));
  form.appendChild(field("Día de pago mensual (1-31)", numberInput("debt-day", existing.due_day ?? "", 1, "1")));
  form.appendChild(field("Cuenta de pago habitual (opcional)", el("select", { id: "debt-account" },
    [el("option", { value: "", text: "(ninguna)" }), ...accountOptions(accounts, existing.account_id)])));
  form.appendChild(field("Nota", textInput("debt-notes", existing.notes, "")));

  if (existing.id && !isEditable) {
    form.appendChild(el("p", { class: "muted", text: "Ya pagaste al menos una cuota, asi que el monto, tasa, cuotas y fecha de inicio quedan bloqueados (cambiarlos invalidaria el cronograma y los pagos ya hechos). Podes editar el resto." }));
  } else if (existing.id) {
    form.appendChild(el("p", { class: "muted", text: "Todavia no pagaste ninguna cuota: si cambias monto, tasa, cuotas o fecha, el cronograma se vuelve a generar desde cero." }));
  }

  form.appendChild(el("button", { type: "submit", class: "btn btn-primary btn-lg", text: existing.id ? "Guardar cambios" : "Crear deuda y generar cronograma" }));

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const debtName = document.getElementById("debt-name").value.trim();
    const originalAmount = parseFloat(document.getElementById("debt-amount").value);
    const startDate = document.getElementById("debt-start").value;
    if (!debtName || !originalAmount || originalAmount <= 0 || !startDate) {
      alert("Completa nombre, monto original y fecha de inicio."); return;
    }
    const interestRate = parseFloat(document.getElementById("debt-rate").value) || 0;
    const dueDay = parseInt(document.getElementById("debt-day").value, 10) || null;
    const accEl = document.getElementById("debt-account");
    const accountId = accEl.value ? parseInt(accEl.value, 10) : null;

    const record = {
      user_id: window.__userId, debt_name: debtName, creditor: document.getElementById("debt-creditor").value.trim(),
      debt_type: document.getElementById("debt-type").value, original_amount: originalAmount,
      interest_rate: interestRate, due_day: dueDay, start_date: startDate,
      account_id: accountId, is_active: 1, notes: document.getElementById("debt-notes").value.trim(),
      created_at: existing.created_at || nowIso(), updated_at: nowIso(),
    };

    if (existing.id && !isEditable) {
      // Ya hay pagos: NO se toca el cronograma, se preservan monto/cuotas/fecha originales
      record.id = existing.id;
      record.original_amount = existing.original_amount;
      record.interest_rate = existing.interest_rate;
      record.start_date = existing.start_date;
      record.current_balance = existing.current_balance;
      record.minimum_payment = existing.minimum_payment;
      record.end_date = existing.end_date;
      await FinDB.put("debts", record);
    } else {
      // Nueva deuda, o edicion sin pagos: (re)generar el cronograma completo
      const numInstallments = parseInt(document.getElementById("debt-installments").value, 10) || 1;
      const schedule = generateAmortizationSchedule({
        original_amount: originalAmount, interest_rate: interestRate,
        num_installments: numInstallments, start_date: startDate,
      });
      record.current_balance = originalAmount;
      record.minimum_payment = schedule[0].total_amount;
      record.end_date = schedule[schedule.length - 1].due_date;
      if (existing.id) record.id = existing.id;
      const debtId = await FinDB.put("debts", record);
      for (const old of myInstallments) await FinDB.remove("debt_installments", old.id);
      await FinDB.putMany("debt_installments", schedule.map((s) => ({ ...s, debt_id: debtId })));
    }

    closeModal();
    window.refreshApp();
  });

  return form;
}

function debtPaymentForm(state, debt) {
  const { accounts } = state;
  const form = el("form", { class: "modal-form" });
  form.appendChild(el("p", { class: "muted", text: `Saldo actual: ${money(debt.current_balance)}` }));
  form.appendChild(field("Cuenta de pago", el("select", { id: "dp-account" }, accountOptions(accounts, debt.account_id))));
  form.appendChild(field("Monto a pagar", numberInput("dp-amount", debt.minimum_payment || "")));
  form.appendChild(field("Fecha de pago", dateInput("dp-date")));
  form.appendChild(field("Nota (opcional)", textInput("dp-notes", "", "")));
  form.appendChild(el("button", { type: "submit", class: "btn btn-primary btn-lg", text: "Registrar pago" }));

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const amount = parseFloat(document.getElementById("dp-amount").value);
    const date = document.getElementById("dp-date").value;
    const accountId = parseInt(document.getElementById("dp-account").value, 10);
    if (!amount || amount <= 0) { alert("Ingresa un monto valido."); return; }

    const allInstallments = await FinDB.getAll("debt_installments");
    const mine = allInstallments.filter((i) => i.debt_id === debt.id);
    const { updated, principalCovered, interestCovered } = applyPaymentToInstallments(mine, amount);
    await FinDB.putMany("debt_installments", updated);

    const categories = await FinDB.getAll("categories");
    const deudaCat = findCategoryByName(categories, "Deudas");
    const txId = await FinDB.put("transactions", {
      account_id: accountId, transaction_date: date, transaction_type: "EXPENSE", amount,
      description: `Pago deuda: ${debt.debt_name}`, category_id: deudaCat ? deudaCat.id : null, subcategory_id: null,
      merchant: "", reference: "", is_pending: 0, notes: document.getElementById("dp-notes").value.trim(),
      created_at: nowIso(), updated_at: nowIso(),
    });

    await FinDB.put("debt_payments", {
      debt_id: debt.id, transaction_id: txId, payment_date: date, amount,
      principal_amount: principalCovered, interest_amount: interestCovered,
      notes: document.getElementById("dp-notes").value.trim(),
    });

    const newBalance = round2(Math.max(0, debt.current_balance - principalCovered));
    await FinDB.put("debts", { ...debt, current_balance: newBalance, updated_at: nowIso() });

    closeModal();
    window.refreshApp();
  });

  return form;
}

// ---------------------------------------------------------------------
// Impuestos
// ---------------------------------------------------------------------
function taxForm(existing) {
  existing = existing || {};
  const form = el("form", { class: "modal-form" });
  form.appendChild(field("Nombre", textInput("tax-name", existing.tax_name, "Ej: Matrícula vehicular 2026")));
  form.appendChild(field("Tipo", el("select", { id: "tax-type" }, Object.entries(TAX_TYPE_LABELS).map(([v, l]) =>
    el("option", { value: v, text: l, ...(existing.tax_type === v ? { selected: "selected" } : {}) })))));
  form.appendChild(field("Año fiscal", numberInput("tax-year", existing.tax_year || new Date().getFullYear(), 2000, "1")));
  form.appendChild(field("Periodo (opcional, ej: Q1, Anual)", textInput("tax-period", existing.period, "")));
  form.appendChild(field("Monto", numberInput("tax-amount", existing.amount ?? "")));
  form.appendChild(field("Fecha límite", dateInput("tax-due", existing.due_date)));
  form.appendChild(field("Nota", textInput("tax-notes", existing.notes, "")));
  form.appendChild(el("button", { type: "submit", class: "btn btn-primary btn-lg", text: existing.id ? "Guardar cambios" : "Agregar impuesto" }));

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const name = document.getElementById("tax-name").value.trim();
    const amount = parseFloat(document.getElementById("tax-amount").value);
    const dueDate = document.getElementById("tax-due").value;
    if (!name || !amount || amount <= 0 || !dueDate) { alert("Completa nombre, monto y fecha limite."); return; }
    const record = {
      user_id: window.__userId, tax_name: name, tax_type: document.getElementById("tax-type").value,
      tax_year: parseInt(document.getElementById("tax-year").value, 10),
      period: document.getElementById("tax-period").value.trim(), amount, due_date: dueDate,
      paid_amount: existing.paid_amount || 0, status: existing.status || "PENDING",
      payment_transaction_id: existing.payment_transaction_id || null,
      notes: document.getElementById("tax-notes").value.trim(),
      created_at: existing.created_at || nowIso(), updated_at: nowIso(),
    };
    if (existing.id) record.id = existing.id;
    await FinDB.put("taxes", record);
    closeModal();
    window.refreshApp();
  });
  return form;
}

function taxPaymentForm(state, tax) {
  const { accounts } = state;
  const pending = round2(tax.amount - (tax.paid_amount || 0));
  const form = el("form", { class: "modal-form" });
  form.appendChild(el("p", { class: "muted", text: `Pendiente: ${money(pending)}` }));
  form.appendChild(field("Cuenta de pago", el("select", { id: "tp-account" }, accountOptions(accounts))));
  form.appendChild(field("Monto a pagar", numberInput("tp-amount", pending)));
  form.appendChild(field("Fecha de pago", dateInput("tp-date")));
  form.appendChild(el("button", { type: "submit", class: "btn btn-primary btn-lg", text: "Registrar pago" }));

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const amount = parseFloat(document.getElementById("tp-amount").value);
    const date = document.getElementById("tp-date").value;
    const accountId = parseInt(document.getElementById("tp-account").value, 10);
    if (!amount || amount <= 0) { alert("Ingresa un monto valido."); return; }

    const categories = await FinDB.getAll("categories");
    const impCat = findCategoryByName(categories, "Impuestos");
    const txId = await FinDB.put("transactions", {
      account_id: accountId, transaction_date: date, transaction_type: "EXPENSE", amount,
      description: `Pago impuesto: ${tax.tax_name}`, category_id: impCat ? impCat.id : null, subcategory_id: null,
      merchant: "", reference: "", is_pending: 0, notes: "",
      created_at: nowIso(), updated_at: nowIso(),
    });

    const newPaid = round2((tax.paid_amount || 0) + amount);
    await FinDB.put("taxes", {
      ...tax, paid_amount: newPaid, payment_transaction_id: txId,
      status: newPaid >= tax.amount - 0.01 ? "PAID" : "PENDING", updated_at: nowIso(),
    });

    closeModal();
    window.refreshApp();
  });
  return form;
}

// ---------------------------------------------------------------------
// Presupuesto mensual (con lineas por categoria)
// ---------------------------------------------------------------------
function budgetForm(state, existing) {
  existing = existing || {};
  const { categories } = state;
  const expenseCats = categories.filter((c) => c.category_type === "EXPENSE").sort((a, b) => a.sort_order - b.sort_order);
  const form = el("form", { class: "modal-form" });

  const now = new Date();
  form.appendChild(field("Nombre (opcional)", textInput("budget-name", existing.budget_name, "Ej: Presupuesto mensual")));
  form.appendChild(field("Año", numberInput("budget-year", existing.year || now.getFullYear(), 2000, "1")));
  form.appendChild(field("Mes (1-12)", numberInput("budget-month", existing.month || (now.getMonth() + 1), 1, "1")));

  form.appendChild(el("p", { class: "muted", text: "Límite por categoría (dejá en 0 las que no quieras limitar):" }));
  const linesBox = el("div", { id: "budget-lines" });
  expenseCats.forEach((c) => {
    const existingLine = (existing.lines || []).find((l) => l.category_id === c.id);
    linesBox.appendChild(field(`${c.icon || ""} ${c.category_name}`.trim(),
      numberInput(`budget-cat-${c.id}`, existingLine ? existingLine.budget_amount : 0)));
  });
  form.appendChild(linesBox);

  form.appendChild(el("button", { type: "submit", class: "btn btn-primary btn-lg", text: existing.id ? "Guardar cambios" : "Crear presupuesto" }));

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const year = parseInt(document.getElementById("budget-year").value, 10);
    const month = parseInt(document.getElementById("budget-month").value, 10);
    let total = 0;
    const lineValues = expenseCats.map((c) => {
      const v = parseFloat(document.getElementById(`budget-cat-${c.id}`).value) || 0;
      total += v;
      return { category_id: c.id, budget_amount: v };
    });

    const record = {
      user_id: window.__userId, year, month,
      budget_name: document.getElementById("budget-name").value.trim() || `Presupuesto ${monthLabel(`${year}-${String(month).padStart(2, "0")}`)}`,
      total_budget: round2(total), notes: "",
      created_at: existing.created_at || nowIso(), updated_at: nowIso(),
    };
    if (existing.id) record.id = existing.id;
    const budgetId = await FinDB.put("budgets", record);

    const oldLines = (await FinDB.getAll("budget_categories")).filter((l) => l.budget_id === budgetId);
    for (const l of oldLines) await FinDB.remove("budget_categories", l.id);
    for (const l of lineValues) {
      if (l.budget_amount > 0) await FinDB.put("budget_categories", { budget_id: budgetId, category_id: l.category_id, budget_amount: l.budget_amount });
    }

    closeModal();
    window.refreshApp();
  });

  return form;
}

// ---------------------------------------------------------------------
// Meta de ahorro (+ aporte)
// ---------------------------------------------------------------------
function savingsGoalForm(state, existing) {
  existing = existing || {};
  const { accounts } = state;
  const form = el("form", { class: "modal-form" });
  form.appendChild(field("Nombre de la meta", textInput("goal-name", existing.goal_name, "Ej: Fondo de emergencia")));
  form.appendChild(field("Monto objetivo", numberInput("goal-target", existing.target_amount ?? "")));
  form.appendChild(field("Fecha objetivo (opcional)", el("input", { type: "date", id: "goal-date", value: existing.target_date || "" })));
  form.appendChild(field("Cuenta asociada (opcional)", el("select", { id: "goal-account" },
    [el("option", { value: "", text: "(ninguna)" }), ...accountOptions(accounts, existing.account_id)])));
  form.appendChild(field("Prioridad", el("select", { id: "goal-priority" }, ["ALTA", "MEDIA", "BAJA"].map((p) =>
    el("option", { value: p, text: p.charAt(0) + p.slice(1).toLowerCase(), ...(existing.priority === p ? { selected: "selected" } : {}) })))));
  form.appendChild(el("button", { type: "submit", class: "btn btn-primary btn-lg", text: existing.id ? "Guardar cambios" : "Crear meta" }));

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const name = document.getElementById("goal-name").value.trim();
    const target = parseFloat(document.getElementById("goal-target").value);
    if (!name || !target || target <= 0) { alert("Completa nombre y monto objetivo."); return; }
    const accEl = document.getElementById("goal-account");
    const record = {
      user_id: window.__userId, goal_name: name, target_amount: target,
      current_amount: existing.current_amount || 0,
      target_date: document.getElementById("goal-date").value || null,
      account_id: accEl.value ? parseInt(accEl.value, 10) : null,
      priority: document.getElementById("goal-priority").value,
      is_completed: existing.is_completed || 0, notes: "",
      created_at: existing.created_at || nowIso(), updated_at: nowIso(),
    };
    if (existing.id) record.id = existing.id;
    await FinDB.put("savings_goals", record);
    closeModal();
    window.refreshApp();
  });
  return form;
}

function savingsContributionForm(state, goal) {
  const { accounts } = state;
  const form = el("form", { class: "modal-form" });
  form.appendChild(el("p", { class: "muted", text: `Meta: ${money(goal.current_amount)} de ${money(goal.target_amount)}` }));
  form.appendChild(field("Cuenta de origen", el("select", { id: "sc-account" }, accountOptions(accounts))));
  form.appendChild(field("Monto del aporte", numberInput("sc-amount", "")));
  form.appendChild(field("Fecha", dateInput("sc-date")));
  form.appendChild(el("button", { type: "submit", class: "btn btn-primary btn-lg", text: "Registrar aporte" }));

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const amount = parseFloat(document.getElementById("sc-amount").value);
    const date = document.getElementById("sc-date").value;
    const accountId = parseInt(document.getElementById("sc-account").value, 10);
    if (!amount || amount <= 0) { alert("Ingresa un monto valido."); return; }

    const categories = await FinDB.getAll("categories");
    const ahorroCat = findCategoryByName(categories, "Ahorro");
    const txId = await FinDB.put("transactions", {
      account_id: accountId, transaction_date: date, transaction_type: "EXPENSE", amount,
      description: `Aporte a meta: ${goal.goal_name}`, category_id: ahorroCat ? ahorroCat.id : null, subcategory_id: null,
      merchant: "", reference: "", is_pending: 0, notes: "",
      created_at: nowIso(), updated_at: nowIso(),
    });

    await FinDB.put("savings_contributions", { goal_id: goal.id, transaction_id: txId, contribution_date: date, amount, notes: "" });

    const newAmount = round2(goal.current_amount + amount);
    await FinDB.put("savings_goals", { ...goal, current_amount: newAmount, is_completed: newAmount >= goal.target_amount ? 1 : 0, updated_at: nowIso() });

    closeModal();
    window.refreshApp();
  });
  return form;
}
