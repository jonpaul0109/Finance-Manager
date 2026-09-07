/**
 * Renderizado de las 5 vistas: Inicio, Movimientos, Cuentas,
 * Deudas y Obligaciones, Metas (Presupuestos + Ahorro).
 */
function accountName(id, accounts) {
  const a = accounts.find((x) => x.id === id);
  return a ? a.account_name : "(cuenta eliminada)";
}
function categoryName(id, categories) {
  const c = categories.find((x) => x.id === id);
  return c ? `${c.icon || ""} ${c.category_name}`.trim() : "(sin categoría)";
}
function subcategoryName(id, subcategories) {
  if (!id) return "";
  const s = subcategories.find((x) => x.id === id);
  return s ? s.subcategory_name : "";
}
function vehicleName(id, vehicles) {
  const v = (vehicles || []).find((x) => x.id === id);
  return v ? v.name : "";
}
function tagNamesFor(txId, transactionTags, tags) {
  return transactionTags.filter((l) => l.transaction_id === txId)
    .map((l) => (tags.find((t) => t.id === l.tag_id) || {}).tag_name)
    .filter(Boolean);
}
function accountTypeLabel(t) { return ACCOUNT_TYPE_LABELS[t] || t; }

// ---------------------------------------------------------------------
// Inicio
// ---------------------------------------------------------------------
function renderDashboard(container, state) {
  const { accounts, transactions, transfers, categories, debts, debtInstallments, taxes, budgets, budgetCategories } = state;
  container.innerHTML = "";

  const nw = computeNetWorth(accounts, state.balances, debts);
  const ym = todayStr().slice(0, 7);
  const monthSummary = computeMonthSummary(transactions, ym);

  const summary = el("div", { class: "summary-grid" }, [
    el("div", { class: "summary-card" }, [el("span", { class: "muted", text: "Patrimonio neto" }), el("strong", { class: nw.net >= 0 ? "amount-positive" : "amount-negative", text: money(nw.net) })]),
    el("div", { class: "summary-card" }, [el("span", { class: "muted", text: "Ingresos del mes" }), el("strong", { class: "amount-positive", text: money(monthSummary.income) })]),
    el("div", { class: "summary-card" }, [el("span", { class: "muted", text: "Gastos del mes" }), el("strong", { class: "amount-negative", text: money(monthSummary.expense) })]),
    el("div", { class: "summary-card" }, [el("span", { class: "muted", text: "Balance del mes" }), el("strong", { class: monthSummary.net >= 0 ? "amount-positive" : "amount-negative", text: money(monthSummary.net) })]),
  ]);
  container.appendChild(summary);

  // -- alertas de presupuesto del mes actual --
  const now = new Date();
  const currentBudget = budgets.find((b) => b.year === now.getFullYear() && b.month === now.getMonth() + 1);
  if (currentBudget) {
    const prog = budgetProgress(currentBudget, budgetCategories, transactions, categories);
    const alerts = prog.lines.filter((l) => l.over || l.near);
    if (alerts.length) {
      container.appendChild(el("h2", { text: "⚠️ Alertas de presupuesto" }));
      const box = el("div", { class: "alert-list" });
      alerts.forEach((l) => {
        const msg = l.over
          ? `${l.categoryLabel}: te pasaste — ${money(l.spent)} de ${money(l.bc.budget_amount)} (${l.pct}%)`
          : `${l.categoryLabel}: cerca del límite — ${money(l.spent)} de ${money(l.bc.budget_amount)} (${l.pct}%)`;
        box.appendChild(el("div", { class: `alert-item ${l.over ? "alert-danger" : "alert-warn"}`, text: msg }));
      });
      container.appendChild(box);
    }
  }

  // -- proximos vencimientos --
  const upcoming = computeUpcoming(accounts, transactions, debts, debtInstallments, taxes, now);
  container.appendChild(el("h2", { text: "Próximos vencimientos" }));
  if (!upcoming.length) {
    container.appendChild(el("p", { class: "muted", text: "No hay vencimientos próximos." }));
  } else {
    const box = el("div", { class: "sample-list" });
    upcoming.forEach((u) => {
      box.appendChild(el("div", { class: "sample-card" }, [
        el("div", { class: "sample-info" }, [
          el("strong", { text: u.name }),
          el("span", { class: "muted", text: u.detail }),
          el("span", { class: "muted", text: `${u.date} · ${u.daysLabel}` }),
        ]),
      ]));
    });
    container.appendChild(box);
  }

  // -- gasto por categoria este mes --
  container.appendChild(el("h2", { text: "Gasto por categoría (este mes)" }));
  const byCat = {};
  transactions.forEach((tx) => {
    if (tx.transaction_type === "EXPENSE" && monthKey(tx.transaction_date) === ym) {
      byCat[tx.category_id] = (byCat[tx.category_id] || 0) + tx.amount;
    }
  });
  const catEntries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  if (!catEntries.length) {
    container.appendChild(el("p", { class: "muted", text: "Todavía no hay gastos este mes." }));
  } else {
    const maxVal = Math.max(...catEntries.map((e) => e[1]));
    const chartBox = el("div", { class: "chart-box" });
    catEntries.forEach(([catId, amount]) => {
      chartBox.appendChild(barRow(categoryName(parseInt(catId, 10), categories), amount, maxVal));
    });
    container.appendChild(chartBox);
  }
}

function barRow(label, value, maxVal) {
  const pct = maxVal > 0 ? Math.round((value / maxVal) * 100) : 0;
  return el("div", { class: "bar-row" }, [
    el("div", { class: "bar-label" }, [el("span", { text: label }), el("span", { text: money(value) })]),
    el("div", { class: "bar-track" }, [el("div", { class: "bar-fill", style: `width:${pct}%` })]),
  ]);
}

// ---------------------------------------------------------------------
// Movimientos
// ---------------------------------------------------------------------
function renderTransactions(container, state) {
  const { transactions, transfers, accounts, categories, subcategories, tags, transactionTags, foodExpenses, vehicles } = state;
  container.innerHTML = "";

  const combined = [
    ...transactions.map((tx) => ({ kind: "tx", date: tx.transaction_date, data: tx })),
    ...transfers.map((tr) => ({ kind: "transfer", date: tr.transfer_date, data: tr })),
  ].sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.data.id - a.data.id));

  if (!combined.length) {
    container.appendChild(el("p", { class: "muted", text: "Todavía no hay movimientos registrados." }));
    return;
  }

  const list = el("div", { class: "sample-list" });
  combined.forEach((item) => {
    let desc, amountText, amountClass, sub;
    if (item.kind === "transfer") {
      const tr = item.data;
      desc = `Transferencia: ${accountName(tr.from_account_id, accounts)} → ${accountName(tr.to_account_id, accounts)}`;
      amountText = money(tr.amount);
      amountClass = "amount-neutral";
    } else {
      const tx = item.data;
      const isIncome = tx.transaction_type === "INCOME";
      desc = `${categoryName(tx.category_id, categories)}${tx.subcategory_id ? " · " + subcategoryName(tx.subcategory_id, subcategories) : ""} · ${accountName(tx.account_id, accounts)}`;
      if (tx.payment_type === "DIFERIDO") desc += ` · Diferido ${tx.installments}x`;
      if (tx.vehicle_id) desc += ` · 🚗 ${vehicleName(tx.vehicle_id, vehicles)}`;
      const tagList = tagNamesFor(tx.id, transactionTags, tags);
      if (tagList.length) sub = tagList.join(", ");
      amountText = (isIncome ? "+" : "-") + money(tx.amount);
      amountClass = isIncome ? "amount-positive" : "amount-negative";
    }

    const infoChildren = [
      el("strong", { text: item.data.description || desc }),
      el("span", { class: "muted", text: desc }),
      el("span", { class: amountClass, text: `${amountText} · ${item.date}` }),
    ];
    if (sub) infoChildren.push(el("span", { class: "muted", text: "🏷 " + sub }));

    const card = el("div", { class: "sample-card" }, [
      el("div", { class: "sample-info" }, infoChildren),
      el("button", {
        type: "button", class: "btn btn-danger btn-sm", text: "Eliminar",
        onclick: async () => {
          if (!confirm("¿Eliminar este movimiento?")) return;
          if (item.kind === "transfer") {
            await FinDB.remove("transfers", item.data.id);
          } else {
            await FinDB.remove("transactions", item.data.id);
            const links = transactionTags.filter((l) => l.transaction_id === item.data.id);
            for (const l of links) await FinDB.remove("transaction_tags", l.id);
            const food = foodExpenses.find((f) => f.transaction_id === item.data.id);
            if (food) await FinDB.remove("food_expenses", food.id);
          }
          window.refreshApp();
        },
      }),
    ]);
    list.appendChild(card);
  });
  container.appendChild(list);
}

// ---------------------------------------------------------------------
// Cuentas + Vehiculos
// ---------------------------------------------------------------------
function renderAccounts(container, state) {
  const { accounts, balances, transactions, transfers, categories, vehicles } = state;
  container.innerHTML = "";

  if (!accounts.length) {
    container.appendChild(el("p", { class: "muted", text: "Todavía no creaste ninguna cuenta." }));
  } else {
    const list = el("div", { class: "sample-list" });
    accounts.forEach((a) => {
      const bal = balances[a.id] || 0;
      const extra = [];
      let deferredDetail = [];
      if (a.account_type === "CREDIT_CARD") {
        const avail = (a.credit_limit || 0) - bal;
        extra.push(`Disponible: ${money(avail)} de ${money(a.credit_limit || 0)}`);
        const nextPay = cardNextPaymentInfo(a, transactions);
        if (nextPay) extra.push(`Próximo pago: ${money(nextPay.amount)} — ${fmtDate(nextPay.date)}`);
        const brk = cardBreakdown(a.id, transactions);
        if (brk.diferidoPendingCount > 0) extra.push(`Diferido pendiente: ${money(brk.diferidoPendingTotal)} en ${brk.diferidoPendingCount} compra(s)`);
        deferredDetail = cardDeferredDetail(a.id, transactions, categories);
      }
      const balTone = a.account_type === "CREDIT_CARD" ? "amount-negative" : "amount-positive";

      const card = el("div", { class: "sample-card" }, [
        el("button", {
          type: "button", class: "sample-info", style: "background:none;border:none;text-align:left;cursor:pointer;",
          onclick: () => openModal("Editar cuenta", accountForm(a)),
        }, [
          el("strong", { text: a.account_name }),
          el("span", { text: accountTypeLabel(a.account_type) + (a.institution ? ` · ${a.institution}` : "") }),
          el("span", { class: balTone, text: money(bal) }),
          ...extra.map((t) => el("span", { class: "muted", text: t })),
          ...deferredDetail.map((it) => el("span", { class: "muted deferred-line", text:
            `↳ ${it.categoryLabel} (${it.tx.transaction_date}) · cuota ${it.cuotaActual}/${it.n}: ${money(it.perInstallment)}/mes` +
            ` · restan ${money(it.remaining)}` + (it.nextInstallmentDate ? ` · próxima ${it.nextInstallmentDate}` : "")
          })),
        ]),
        el("div", { class: "card-actions" }, [
          el("button", { type: "button", class: "btn btn-secondary btn-sm", text: "Editar", onclick: () => openModal("Editar cuenta", accountForm(a)) }),
          el("button", {
            type: "button", class: "btn btn-danger btn-sm", text: "Eliminar",
            onclick: async () => {
              const inUse = transactions.some((t) => t.account_id === a.id) || transfers.some((t) => t.from_account_id === a.id || t.to_account_id === a.id);
              if (inUse) { alert("No se puede eliminar: esta cuenta tiene movimientos registrados. Eliminalos primero."); return; }
              if (confirm("¿Eliminar esta cuenta?")) { await FinDB.remove("accounts", a.id); window.refreshApp(); }
            },
          }),
        ]),
      ]);
      list.appendChild(card);
    });
    container.appendChild(list);
  }

  container.appendChild(el("h2", { text: "🚗 Vehículos" }));
  if (!vehicles.length) {
    container.appendChild(el("p", { class: "muted", text: "Todavía no agregaste ningún vehículo." }));
    return;
  }
  const vlist = el("div", { class: "sample-list" });
  vehicles.forEach((v) => {
    const spend = vehicleSpend(v.id, transactions);
    vlist.appendChild(el("div", { class: "sample-card" }, [
      el("button", {
        type: "button", class: "sample-info", style: "background:none;border:none;text-align:left;cursor:pointer;",
        onclick: () => openModal("Editar vehículo", vehicleForm(v)),
      }, [
        el("strong", { text: v.name }),
        el("span", { text: v.plate || "Sin placa registrada" }),
        el("span", { class: "muted", text: `Gasto este mes: ${money(spend.thisMonth)} · Histórico: ${money(spend.total)}` }),
      ]),
      el("div", { class: "card-actions" }, [
        el("button", { type: "button", class: "btn btn-secondary btn-sm", text: "Editar", onclick: () => openModal("Editar vehículo", vehicleForm(v)) }),
        el("button", {
          type: "button", class: "btn btn-danger btn-sm", text: "Eliminar",
          onclick: async () => {
            if (!confirm("¿Eliminar este vehículo?")) return;
            await FinDB.remove("vehicles", v.id);
            window.refreshApp();
          },
        }),
      ]),
    ]));
  });
  container.appendChild(vlist);
}

// ---------------------------------------------------------------------
// Deudas y Obligaciones (Deudas + Impuestos)
// ---------------------------------------------------------------------
function renderDebts(container, state) {
  const { debts, debtInstallments, taxes } = state;
  container.innerHTML = "";

  container.appendChild(el("h2", { text: "💰 Deudas" }));
  const activeDebts = debts.filter((d) => d.is_active);
  if (!activeDebts.length) {
    container.appendChild(el("p", { class: "muted", text: "No tenés deudas registradas." }));
  } else {
    const list = el("div", { class: "sample-list" });
    activeDebts.forEach((d) => {
      const prog = debtProgress(d, debtInstallments);
      const isPaidOff = prog.paidCount >= prog.totalCount && prog.totalCount > 0;
      const card = el("div", { class: "sample-card" }, [
        el("button", {
          type: "button", class: "sample-info", style: "background:none;border:none;text-align:left;cursor:pointer;",
          onclick: () => openModal("Editar deuda", debtForm(state, d)),
        }, [
          el("strong", { text: d.debt_name }),
          el("span", { text: `${DEBT_TYPE_LABELS[d.debt_type] || d.debt_type}${d.creditor ? " · " + d.creditor : ""}` }),
          el("span", { class: "amount-negative", text: money(d.current_balance) }),
          el("span", { class: "muted", text: `Cuota: ${money(d.minimum_payment)} · Pagadas: ${prog.paidCount}/${prog.totalCount} (${prog.pctPaid}%)` }),
          ...(isPaidOff ? [el("span", { class: "muted", text: "✅ Deuda saldada" })] :
            [el("span", { class: "muted", text: `Próxima cuota: ${money(prog.nextAmount)} — ${prog.nextDueDate}` })]),
        ]),
        el("div", { class: "card-actions" }, [
          ...(isPaidOff ? [] : [el("button", { type: "button", class: "btn btn-secondary btn-sm", text: "Pagar cuota", onclick: () => openModal(`Pagar: ${d.debt_name}`, debtPaymentForm(state, d)) })]),
          el("button", { type: "button", class: "btn btn-secondary btn-sm", text: "Editar", onclick: () => openModal("Editar deuda", debtForm(state, d)) }),
          el("button", {
            type: "button", class: "btn btn-danger btn-sm", text: "Eliminar",
            onclick: async () => {
              if (!confirm("¿Eliminar esta deuda y su cronograma de cuotas?")) return;
              await FinDB.remove("debts", d.id);
              const insts = debtInstallments.filter((i) => i.debt_id === d.id);
              for (const i of insts) await FinDB.remove("debt_installments", i.id);
              const pays = (await FinDB.getAll("debt_payments")).filter((p) => p.debt_id === d.id);
              for (const p of pays) await FinDB.remove("debt_payments", p.id);
              window.refreshApp();
            },
          }),
        ]),
      ]);
      list.appendChild(card);
    });
    container.appendChild(list);
  }

  // -- Tarjetas de credito: deuda actual + corriente vs diferido -----------
  container.appendChild(el("h2", { text: "💳 Tarjetas de Crédito" }));
  const cards = (state.accounts || []).filter((a) => a.account_type === "CREDIT_CARD" && a.is_active !== 0);
  if (!cards.length) {
    container.appendChild(el("p", { class: "muted", text: "No tenés tarjetas de crédito registradas." }));
  } else {
    const clist = el("div", { class: "sample-list" });
    cards.forEach((a) => {
      const bal = state.balances[a.id] || 0;
      const nextPay = cardNextPaymentInfo(a, state.transactions);
      const brk = cardBreakdown(a.id, state.transactions);
      const detail = cardDeferredDetail(a.id, state.transactions, state.categories);
      const ccard = el("div", { class: "sample-card" }, [
        el("button", {
          type: "button", class: "sample-info", style: "background:none;border:none;text-align:left;cursor:pointer;",
          onclick: () => openModal("Editar cuenta", accountForm(a)),
        }, [
          el("strong", { text: a.account_name }),
          el("span", { class: "amount-negative", text: `Deuda total: ${money(bal)}` }),
          ...(nextPay ? [el("span", { class: "muted", text: `Próximo pago: ${money(nextPay.amount)} — ${fmtDate(nextPay.date)}` })] : []),
          ...(brk.diferidoPendingCount > 0 ? [el("span", { class: "muted", text: `Diferido pendiente: ${money(brk.diferidoPendingTotal)} en ${brk.diferidoPendingCount} compra(s)` })] : []),
          ...detail.map((it) => el("span", { class: "muted deferred-line", text:
            `↳ ${it.categoryLabel} (${it.tx.transaction_date}) · cuota ${it.cuotaActual}/${it.n}: ${money(it.perInstallment)}/mes` +
            ` · restan ${money(it.remaining)}` + (it.nextInstallmentDate ? ` · próxima ${fmtDate(it.nextInstallmentDate)}` : "")
          })),
        ]),
        el("div", { class: "card-actions" }, [
          el("button", {
            type: "button", class: "btn btn-secondary btn-sm", text: "+ Registrar compra",
            onclick: () => openModal(`Gasto con ${a.account_name}`, transactionForm(state, { account_id: a.id, transaction_type: "EXPENSE" })),
          }),
          el("button", {
            type: "button", class: "btn btn-secondary btn-sm", text: "Registrar pago",
            onclick: () => openModal(`Pagar ${a.account_name}`, transactionForm(state, { transaction_type: "TRANSFER", to_account_id: a.id })),
          }),
          el("button", { type: "button", class: "btn btn-secondary btn-sm", text: "Editar", onclick: () => openModal("Editar cuenta", accountForm(a)) }),
          el("button", {
            type: "button", class: "btn btn-danger btn-sm", text: "Eliminar",
            onclick: async () => {
              const inUse = state.transactions.some((t) => t.account_id === a.id) || state.transfers.some((t) => t.from_account_id === a.id || t.to_account_id === a.id);
              if (inUse) { alert("No se puede eliminar: esta tarjeta tiene movimientos registrados. Eliminalos primero (desde Movimientos)."); return; }
              if (confirm(`¿Eliminar la tarjeta ${a.account_name}?`)) { await FinDB.remove("accounts", a.id); window.refreshApp(); }
            },
          }),
        ]),
      ]);
      clist.appendChild(ccard);
    });
    container.appendChild(clist);
  }

  container.appendChild(el("h2", { text: "🧾 Impuestos" }));
  if (!taxes.length) {
    container.appendChild(el("p", { class: "muted", text: "No tenés impuestos registrados." }));
    return;
  }
  const tlist = el("div", { class: "sample-list" });
  taxes.sort((a, b) => (a.due_date || "").localeCompare(b.due_date || "")).forEach((t) => {
    const pending = round2(t.amount - (t.paid_amount || 0));
    const tcard = el("div", { class: "sample-card" }, [
      el("button", {
        type: "button", class: "sample-info", style: "background:none;border:none;text-align:left;cursor:pointer;",
        onclick: () => openModal("Editar impuesto", taxForm(t)),
      }, [
        el("strong", { text: t.tax_name }),
        el("span", { text: `${TAX_TYPE_LABELS[t.tax_type] || t.tax_type} · ${t.tax_year}${t.period ? " · " + t.period : ""}` }),
        el("span", { class: t.status === "PAID" ? "amount-positive" : "amount-negative", text: `${money(t.amount)} · ${TAX_STATUS_LABELS[t.status] || t.status}` }),
        el("span", { class: "muted", text: `Vence: ${t.due_date}${t.status !== "PAID" ? ` · Pendiente: ${money(pending)}` : ""}` }),
      ]),
      el("div", { class: "card-actions" }, [
        ...(t.status !== "PAID" ? [el("button", { type: "button", class: "btn btn-secondary btn-sm", text: "Pagar", onclick: () => openModal(`Pagar: ${t.tax_name}`, taxPaymentForm(state, t)) })] : []),
        el("button", { type: "button", class: "btn btn-secondary btn-sm", text: "Editar", onclick: () => openModal("Editar impuesto", taxForm(t)) }),
        el("button", {
          type: "button", class: "btn btn-danger btn-sm", text: "Eliminar",
          onclick: async () => { if (confirm("¿Eliminar este impuesto?")) { await FinDB.remove("taxes", t.id); window.refreshApp(); } },
        }),
      ]),
    ]);
    tlist.appendChild(tcard);
  });
  container.appendChild(tlist);
}

// ---------------------------------------------------------------------
// Metas: Presupuestos + Ahorro
// ---------------------------------------------------------------------
function renderGoals(container, state) {
  const { budgets, budgetCategories, transactions, categories, savingsGoals } = state;
  container.innerHTML = "";

  const now = new Date();
  const currentBudget = budgets.find((b) => b.year === now.getFullYear() && b.month === now.getMonth() + 1);

  container.appendChild(el("h2", { text: "🎯 Presupuesto del mes" }));
  if (!currentBudget) {
    container.appendChild(el("p", { class: "muted", text: "Todavía no creaste un presupuesto para este mes." }));
  } else {
    const prog = budgetProgress(currentBudget, budgetCategories, transactions, categories);
    container.appendChild(el("p", { class: "muted", text: `Total: ${money(prog.totalSpent)} de ${money(prog.totalBudget)}` }));
    const list = el("div", { class: "sample-list" });
    prog.lines.forEach((l) => {
      list.appendChild(el("div", { class: "sample-card" }, [
        el("div", { class: "sample-info" }, [
          el("strong", { text: l.categoryLabel }),
          el("span", { class: l.over ? "amount-negative" : "muted", text: `${money(l.spent)} de ${money(l.bc.budget_amount)} (${l.pct}%)` }),
          progressBar(l.pct, l.over),
        ]),
      ]));
    });
    container.appendChild(list);
    container.appendChild(el("button", { type: "button", class: "btn btn-secondary", style: "margin-top:8px;", text: "Editar presupuesto de este mes",
      onclick: () => openModal("Editar Presupuesto", budgetForm(state, { ...currentBudget, lines: budgetCategories.filter((bc) => bc.budget_id === currentBudget.id) })) }));
  }

  container.appendChild(el("h2", { text: "🏦 Metas de ahorro" }));
  if (!savingsGoals.length) {
    container.appendChild(el("p", { class: "muted", text: "Todavía no creaste ninguna meta de ahorro." }));
    return;
  }
  const glist = el("div", { class: "sample-list" });
  savingsGoals.forEach((g) => {
    const pct = g.target_amount > 0 ? Math.min(100, round2((g.current_amount / g.target_amount) * 100)) : 0;
    const gcard = el("div", { class: "sample-card" }, [
      el("button", {
        type: "button", class: "sample-info", style: "background:none;border:none;text-align:left;cursor:pointer;",
        onclick: () => openModal("Editar meta", savingsGoalForm(state, g)),
      }, [
        el("strong", { text: g.goal_name + (g.is_completed ? " ✅" : "") }),
        el("span", { class: "muted", text: `${money(g.current_amount)} de ${money(g.target_amount)} (${pct}%)${g.target_date ? " · antes de " + g.target_date : ""}` }),
        progressBar(pct, false),
      ]),
      el("div", { class: "card-actions" }, [
        el("button", { type: "button", class: "btn btn-secondary btn-sm", text: "+ Aportar", onclick: () => openModal(`Aportar: ${g.goal_name}`, savingsContributionForm(state, g)) }),
        el("button", { type: "button", class: "btn btn-secondary btn-sm", text: "Editar", onclick: () => openModal("Editar meta", savingsGoalForm(state, g)) }),
        el("button", {
          type: "button", class: "btn btn-danger btn-sm", text: "Eliminar",
          onclick: async () => {
            if (!confirm("¿Eliminar esta meta de ahorro?")) return;
            await FinDB.remove("savings_goals", g.id);
            const contribs = (await FinDB.getAll("savings_contributions")).filter((c) => c.goal_id === g.id);
            for (const c of contribs) await FinDB.remove("savings_contributions", c.id);
            window.refreshApp();
          },
        }),
      ]),
    ]);
    glist.appendChild(gcard);
  });
  container.appendChild(glist);
}
