/**
 * Renderizado de las 4 vistas: Inicio (dashboard), Movimientos,
 * Cuentas, Presupuestos.
 */
function accountName(id, accounts) {
  const a = accounts.find((x) => x.id === id);
  return a ? a.name : "(cuenta eliminada)";
}
function categoryName(id, categories) {
  const c = categories.find((x) => x.id === id);
  return c ? c.name : "(sin categoría)";
}

// ---------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------
function renderDashboard(container, state) {
  const { accounts, transactions, categories, budgets, balances } = state;
  container.innerHTML = "";

  const nw = computeNetWorth(accounts, balances);
  const ym = todayStr().slice(0, 7);
  const monthSummary = computeMonthSummary(transactions, ym);

  // -- tarjetas de resumen --
  const cardsRow = el("div", { class: "kpi-grid" }, [
    kpiCard("Disponible (efectivo + banco)", money(nw.liquid), nw.liquid >= 0 ? "ok" : "danger"),
    kpiCard("Deuda total", money(nw.debt), "danger"),
    kpiCard("Por cobrar", money(nw.receivable), "ok"),
    kpiCard("Patrimonio neto", money(nw.net), nw.net >= 0 ? "ok" : "danger"),
  ]);
  container.appendChild(cardsRow);

  container.appendChild(el("h2", { text: "Este mes" }));
  const monthRow = el("div", { class: "kpi-grid" }, [
    kpiCard("Ingresos", money(monthSummary.income), "ok"),
    kpiCard("Gastos", money(monthSummary.expense), "danger"),
    kpiCard("Balance", money(monthSummary.balance), monthSummary.balance >= 0 ? "ok" : "danger"),
  ]);
  container.appendChild(monthRow);

  // -- alertas de presupuesto --
  const budgetProgress = computeBudgetProgress(budgets, monthSummary);
  const alertBudgets = budgetProgress.filter((b) => b.over || b.near);
  if (alertBudgets.length) {
    container.appendChild(el("h2", { text: "⚠ Alertas de presupuesto" }));
    const box = el("div", { class: "alert-list" });
    alertBudgets.forEach((b) => {
      const catName = categoryName(b.category_id, categories);
      const msg = b.over
        ? `${catName}: te pasaste — ${money(b.spent)} de ${money(b.limit_amount)} (${b.pct}%)`
        : `${catName}: cerca del límite — ${money(b.spent)} de ${money(b.limit_amount)} (${b.pct}%)`;
      box.appendChild(el("div", { class: `alert-item ${b.over ? "alert-danger" : "alert-warn"}`, text: msg }));
    });
    container.appendChild(box);
  }

  // -- proximos vencimientos --
  const upcoming = computeUpcoming(accounts, balances);
  container.appendChild(el("h2", { text: "Próximos vencimientos" }));
  if (!upcoming.length) {
    container.appendChild(el("p", { class: "muted", text: "No hay vencimientos próximos." }));
  } else {
    const box = el("div", { class: "sample-list" });
    upcoming.forEach((u) => {
      box.appendChild(el("div", { class: "sample-card" }, [
        el("div", { class: "sample-info" }, [
          el("strong", { text: u.name }),
          el("span", { text: u.detail }),
          el("span", { class: "muted", text: u.daysLabel }),
        ]),
      ]));
    });
    container.appendChild(box);
  }

  // -- gasto por categoria (mes actual) --
  container.appendChild(el("h2", { text: "Gasto por categoría (este mes)" }));
  const catBox = el("div", {});
  const items = Object.entries(monthSummary.byCategory)
    .map(([catId, val]) => ({ label: categoryName(parseInt(catId, 10), categories), value: val }))
    .sort((a, b) => b.value - a.value);
  renderBarList(catBox, items, { formatValue: money, emptyText: "Todavía no registraste gastos este mes." });
  container.appendChild(catBox);
}

function kpiCard(label, value, tone) {
  return el("div", { class: `kpi-card kpi-${tone || ""}` }, [
    el("div", { class: "kpi-label", text: label }),
    el("div", { class: "kpi-value", text: value }),
  ]);
}

function computeUpcoming(accounts, balances) {
  const today = new Date();
  const out = [];
  accounts.forEach((a) => {
    if (a.type === "credit_card" && a.due_day) {
      const due = nextCardDueDate(a, today);
      const d = daysUntil(due, today);
      if (d <= 30) out.push({ name: a.name, detail: `Pago de tarjeta: ${money(balances[a.id])}`, date: due, daysLabel: daysLabel(d) });
    }
    if (a.type === "loan_debt" && a.start_date) {
      const prog = loanProgress(a, balances[a.id]);
      if (prog.nextDueDate) {
        const d = daysUntil(prog.nextDueDate, today);
        if (d <= 30) out.push({ name: a.name, detail: `Cuota estimada: ${money(prog.installment_amount)}`, date: prog.nextDueDate, daysLabel: daysLabel(d) });
      }
    }
  });
  return out.sort((a, b) => a.date - b.date);
}
function daysLabel(d) {
  if (d < 0) return `Vencido hace ${Math.abs(d)} día(s)`;
  if (d === 0) return "Vence hoy";
  if (d === 1) return "Vence mañana";
  return `Vence en ${d} días`;
}

// ---------------------------------------------------------------------
// Movimientos
// ---------------------------------------------------------------------
function renderTransactions(container, state) {
  const { accounts, transactions, categories } = state;
  container.innerHTML = "";

  const sorted = [...transactions].sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.id - a.id);
  const list = el("div", { class: "sample-list" });

  if (!sorted.length) {
    list.appendChild(el("p", { class: "muted", text: "Todavía no registraste movimientos." }));
  }

  sorted.forEach((tx) => {
    const isExpense = tx.type === "expense";
    const isIncome = tx.type === "income";
    let desc, amountText, amountClass;
    if (isIncome) {
      desc = `${categoryName(tx.category_id, categories)} → ${accountName(tx.to_account_id, accounts)}`;
      amountText = "+" + money(tx.amount);
      amountClass = "amount-positive";
    } else if (isExpense) {
      desc = `${categoryName(tx.category_id, categories)} · ${accountName(tx.from_account_id, accounts)}`;
      amountText = "-" + money(tx.amount);
      amountClass = "amount-negative";
    } else {
      desc = `${accountName(tx.from_account_id, accounts)} → ${accountName(tx.to_account_id, accounts)}`;
      amountText = money(tx.amount);
      amountClass = "amount-neutral";
    }

    const card = el("div", { class: "sample-card" }, [
      el("button", {
        type: "button", class: "sample-info", style: "background:none;border:none;text-align:left;cursor:pointer;",
        onclick: () => openTransactionEdit(state, tx),
      }, [
        el("strong", { text: `${amountText}` , class: amountClass }),
        el("span", { text: desc }),
        el("span", { class: "muted", text: `${tx.date}${tx.note ? " · " + tx.note : ""}` }),
      ]),
      el("button", {
        type: "button", class: "btn btn-danger btn-sm", text: "Eliminar",
        onclick: async () => { if (confirm("¿Eliminar este movimiento?")) { await FinDB.remove("transactions", tx.id); window.refreshApp(); } },
      }),
    ]);
    list.appendChild(card);
  });

  container.appendChild(list);
}

function openTransactionEdit(state, tx) {
  openModal("Editar movimiento", transactionForm(state, tx));
}

// ---------------------------------------------------------------------
// Cuentas
// ---------------------------------------------------------------------
function renderAccounts(container, state) {
  const { accounts, balances, transactions } = state;
  container.innerHTML = "";

  if (!accounts.length) {
    container.appendChild(el("p", { class: "muted", text: "Todavía no creaste ninguna cuenta." }));
    return;
  }

  const list = el("div", { class: "sample-list" });
  accounts.forEach((a) => {
    const bal = balances[a.id] || 0;
    const extra = [];
    if (a.type === "credit_card") {
      const avail = (a.credit_limit || 0) - bal;
      extra.push(`Disponible: ${money(avail)} de ${money(a.credit_limit || 0)}`);
      const due = nextCardDueDate(a);
      if (due) extra.push(`Próximo pago: ${fmtDate(due)}`);
    } else if (a.type === "loan_debt" || a.type === "loan_credit") {
      const prog = loanProgress(a, bal);
      extra.push(`Cuota: ${money(prog.installment_amount)} · Pagadas: ${prog.paidCount}/${prog.num_installments} (${prog.pctPaid}%)`);
      if (prog.nextDueDate) extra.push(`Próxima: ${fmtDate(prog.nextDueDate)}`);
    }

    const balTone = (a.type === "credit_card" || a.type === "loan_debt") ? "amount-negative" : (a.type === "loan_credit" ? "amount-neutral" : "amount-positive");

    const card = el("div", { class: "sample-card" }, [
      el("button", {
        type: "button", class: "sample-info", style: "background:none;border:none;text-align:left;cursor:pointer;",
        onclick: () => openModal("Editar cuenta", accountForm(a)),
      }, [
        el("strong", { text: a.name }),
        el("span", { text: accountTypeLabel(a.type) }),
        el("span", { class: balTone, text: money(bal) }),
        ...extra.map((t) => el("span", { class: "muted", text: t })),
      ]),
      el("button", {
        type: "button", class: "btn btn-danger btn-sm", text: "Eliminar",
        onclick: async () => {
          const inUse = transactions.some((t) => t.from_account_id === a.id || t.to_account_id === a.id);
          if (inUse) { alert("No se puede eliminar: esta cuenta tiene movimientos registrados. Eliminalos primero."); return; }
          if (confirm("¿Eliminar esta cuenta?")) { await FinDB.remove("accounts", a.id); window.refreshApp(); }
        },
      }),
    ]);
    list.appendChild(card);
  });
  container.appendChild(list);
}

// ---------------------------------------------------------------------
// Presupuestos
// ---------------------------------------------------------------------
function renderBudgets(container, state) {
  const { categories, budgets, transactions } = state;
  container.innerHTML = "";

  const ym = todayStr().slice(0, 7);
  const monthSummary = computeMonthSummary(transactions, ym);
  const progress = computeBudgetProgress(budgets, monthSummary);

  if (!progress.length) {
    container.appendChild(el("p", { class: "muted", text: "Todavía no creaste ningún presupuesto." }));
    return;
  }

  const list = el("div", { class: "sample-list" });
  progress.forEach((b) => {
    const catName = categoryName(b.category_id, categories);
    const track = el("div", { class: "bar-track", style: "flex:1;" });
    const fill = el("div", { class: `bar-fill ${b.over ? "bar-danger" : b.near ? "bar-warn" : ""}`, style: `width:${Math.min(100, b.pct)}%` });
    track.appendChild(fill);

    const card = el("div", { class: "sample-card budget-card" }, [
      el("button", {
        type: "button", class: "sample-info", style: "background:none;border:none;text-align:left;cursor:pointer;flex:1;",
        onclick: () => openModal("Editar presupuesto", budgetForm(state, b)),
      }, [
        el("strong", { text: catName }),
        el("span", { text: `${money(b.spent)} de ${money(b.limit_amount)} (${b.pct}%)` }),
        track,
      ]),
      el("button", {
        type: "button", class: "btn btn-danger btn-sm", text: "Eliminar",
        onclick: async () => { if (confirm("¿Eliminar este presupuesto?")) { await FinDB.remove("budgets", b.id); window.refreshApp(); } },
      }),
    ]);
    list.appendChild(card);
  });
  container.appendChild(list);
}
