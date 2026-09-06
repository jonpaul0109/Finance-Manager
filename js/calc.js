/**
 * Motor de calculo: saldos de cuenta, amortizacion de deudas,
 * progreso de presupuestos, vencimientos proximos. Nada se guarda
 * "suelto" -- todo se recalcula siempre desde las transacciones/
 * transferencias/cuotas guardadas, para que nunca se desincronice.
 */
const DEBT_ACCOUNT_TYPES = ["CREDIT_CARD"]; // tipos de "accounts" cuyo saldo es deuda (polaridad invertida)

// -- Saldo de una cuenta (efectivo/banco/tarjeta) ------------------------
function computeAccountBalance(account, transactions, transfers) {
  const isDebt = DEBT_ACCOUNT_TYPES.includes(account.account_type);
  let bal = account.initial_balance || 0;

  transactions.forEach((tx) => {
    if (tx.account_id !== account.id) return;
    if (tx.transaction_type === "INCOME") bal += isDebt ? -tx.amount : tx.amount;
    else if (tx.transaction_type === "EXPENSE") bal += isDebt ? tx.amount : -tx.amount;
  });

  transfers.forEach((tr) => {
    if (tr.from_account_id === account.id) bal += isDebt ? tr.amount : -tr.amount;
    if (tr.to_account_id === account.id) bal += isDebt ? -tr.amount : tr.amount;
  });

  return round2(bal);
}

function computeAllBalances(accounts, transactions, transfers) {
  const out = {};
  accounts.forEach((a) => { out[a.id] = computeAccountBalance(a, transactions, transfers); });
  return out;
}

function computeNetWorth(accounts, balances, debts) {
  let assets = 0, liabilities = 0;
  accounts.forEach((a) => {
    const b = balances[a.id] || 0;
    if (DEBT_ACCOUNT_TYPES.includes(a.account_type)) liabilities += b;
    else assets += b;
  });
  (debts || []).filter((d) => d.is_active).forEach((d) => { liabilities += d.current_balance || 0; });
  return { assets: round2(assets), liabilities: round2(liabilities), net: round2(assets - liabilities) };
}

function computeMonthSummary(transactions, ym) {
  let income = 0, expense = 0;
  transactions.forEach((tx) => {
    if (monthKey(tx.transaction_date) !== ym) return;
    if (tx.transaction_type === "INCOME") income += tx.amount;
    else if (tx.transaction_type === "EXPENSE") expense += tx.amount;
  });
  return { income: round2(income), expense: round2(expense), net: round2(income - expense) };
}

// -- Tarjetas: Corriente vs Diferido, ciclo real de facturacion ----------
function cardBreakdown(accountId, transactions, today) {
  today = today || new Date();
  let diferidoPendingTotal = 0, diferidoPendingCount = 0;
  transactions.forEach((tx) => {
    if (tx.transaction_type !== "EXPENSE" || tx.account_id !== accountId) return;
    if ((tx.payment_type || "CORRIENTE") !== "DIFERIDO") return;
    const n = Math.max(1, parseInt(tx.installments, 10) || 1);
    const elapsed = Math.max(0, monthsBetween(tx.transaction_date, today));
    const per = round2(tx.amount / n);
    const remaining = round2(Math.max(0, tx.amount - per * elapsed));
    if (remaining > 0.01) { diferidoPendingTotal += remaining; diferidoPendingCount += 1; }
  });
  return { diferidoPendingTotal: round2(diferidoPendingTotal), diferidoPendingCount };
}

function cardDeferredDetail(accountId, transactions, categories, today) {
  today = today || new Date();
  const items = [];
  transactions.forEach((tx) => {
    if (tx.transaction_type !== "EXPENSE" || tx.account_id !== accountId) return;
    if ((tx.payment_type || "CORRIENTE") !== "DIFERIDO") return;
    const n = Math.max(1, parseInt(tx.installments, 10) || 1);
    const elapsed = Math.max(0, monthsBetween(tx.transaction_date, today));
    const per = round2(tx.amount / n);
    const remaining = round2(Math.max(0, tx.amount - per * elapsed));
    if (remaining <= 0.01) return;
    const cuotaActual = Math.min(n, elapsed + 1);
    let nextInstallmentDate = null;
    if (elapsed < n) nextInstallmentDate = addMonths(tx.transaction_date, elapsed + 1);
    items.push({
      tx, n, cuotaActual, perInstallment: per, remaining, nextInstallmentDate,
      categoryLabel: categoryName(tx.category_id, categories),
    });
  });
  return items.sort((a, b) => (a.tx.transaction_date || "").localeCompare(b.tx.transaction_date || ""));
}

function cardCycle(account, today) {
  today = today || new Date();
  const cutoffDay = account.cutoff_day;
  if (!cutoffDay) return null;
  const t = stripTime(today);
  const thisCutoff = new Date(today.getFullYear(), today.getMonth(), cutoffDay);
  let cycleStart, cycleEnd;
  if (t <= thisCutoff) {
    cycleEnd = thisCutoff;
    cycleStart = new Date(cycleEnd);
    cycleStart.setMonth(cycleStart.getMonth() - 1);
    cycleStart.setDate(cycleStart.getDate() + 1);
  } else {
    cycleEnd = new Date(thisCutoff);
    cycleEnd.setMonth(cycleEnd.getMonth() + 1);
    cycleStart = new Date(thisCutoff);
    cycleStart.setDate(cycleStart.getDate() + 1);
  }
  return { cycleStart, cycleEnd };
}

function cardNextPaymentInfo(account, transactions, today) {
  today = today || new Date();
  const cycle = cardCycle(account, today);
  if (!cycle) return null;
  const { cycleStart, cycleEnd } = cycle;

  let payDate = new Date(cycleEnd.getFullYear(), cycleEnd.getMonth(), account.payment_day || cycleEnd.getDate());
  if (payDate <= cycleEnd) payDate.setMonth(payDate.getMonth() + 1);

  let amount = 0;
  transactions.forEach((tx) => {
    if (tx.transaction_type !== "EXPENSE" || tx.account_id !== account.id) return;
    const d = new Date(tx.transaction_date + "T00:00:00");
    const paymentType = tx.payment_type || "CORRIENTE";
    if (paymentType === "CORRIENTE") {
      if (d >= cycleStart && d <= cycleEnd) amount += tx.amount;
    } else {
      const n = Math.max(1, parseInt(tx.installments, 10) || 1);
      const per = round2(tx.amount / n);
      for (let k = 0; k < n; k++) {
        const instDate = new Date(d);
        instDate.setMonth(instDate.getMonth() + k);
        if (instDate >= cycleStart && instDate <= cycleEnd) { amount += per; break; }
      }
    }
  });
  return { amount: round2(amount), date: fmtDate(payDate) };
}

// -- Deudas: cronograma de amortizacion (sistema frances si hay interes,
// cuotas iguales de capital si no) --------------------------------------
function generateAmortizationSchedule({ original_amount, interest_rate, num_installments, start_date }) {
  const n = Math.max(1, parseInt(num_installments, 10) || 1);
  const rate = (interest_rate || 0) / 100 / 12; // tasa mensual
  const schedule = [];
  let balance = original_amount;

  let paymentTotal;
  if (rate > 0) {
    paymentTotal = (original_amount * rate) / (1 - Math.pow(1 + rate, -n));
  }

  for (let i = 1; i <= n; i++) {
    const dueDate = addMonths(start_date, i);
    let interestAmt, principalAmt, totalAmt;
    if (rate > 0) {
      interestAmt = round2(balance * rate);
      totalAmt = round2(paymentTotal);
      principalAmt = round2(totalAmt - interestAmt);
    } else {
      principalAmt = round2(original_amount / n);
      interestAmt = 0;
      totalAmt = principalAmt;
    }
    // ultima cuota: ajustar centavos para que cierre exacto
    if (i === n) {
      principalAmt = round2(balance);
      totalAmt = round2(principalAmt + interestAmt);
    }
    balance = round2(balance - principalAmt);
    schedule.push({
      installment_number: i, due_date: dueDate,
      principal_amount: principalAmt, interest_amount: interestAmt, total_amount: totalAmt,
      paid_amount: 0, status: "pending", payment_date: null, transaction_id: null, notes: "",
    });
  }
  return schedule;
}

// Aplica un pago a las cuotas pendientes (la mas antigua primero).
// Devuelve las cuotas modificadas y el total de capital/interes cubierto.
function applyPaymentToInstallments(installments, amount) {
  let remaining = amount;
  let principalCovered = 0, interestCovered = 0;
  const sorted = [...installments].sort((a, b) => a.installment_number - b.installment_number);
  const updated = [];

  for (const inst of sorted) {
    if (remaining <= 0.001 || inst.status === "paid") { updated.push(inst); continue; }
    const owed = round2(inst.total_amount - inst.paid_amount);
    const applied = Math.min(owed, remaining);
    const newPaid = round2(inst.paid_amount + applied);
    const fracPrincipal = inst.total_amount > 0 ? inst.principal_amount / inst.total_amount : 1;
    principalCovered += round2(applied * fracPrincipal);
    interestCovered += round2(applied * (1 - fracPrincipal));
    remaining = round2(remaining - applied);
    updated.push({
      ...inst, paid_amount: newPaid,
      status: newPaid >= inst.total_amount - 0.01 ? "paid" : (newPaid > 0 ? "partial" : "pending"),
      payment_date: todayStr(),
    });
  }
  return { updated, principalCovered: round2(principalCovered), interestCovered: round2(interestCovered), leftover: remaining };
}

function debtProgress(debt, installments) {
  const mine = installments.filter((i) => i.debt_id === debt.id);
  const total = mine.length;
  const paid = mine.filter((i) => i.status === "paid").length;
  const next = mine.filter((i) => i.status !== "paid").sort((a, b) => a.installment_number - b.installment_number)[0];
  return {
    totalCount: total, paidCount: paid,
    pctPaid: total ? round2((paid / total) * 100) : 0,
    nextDueDate: next ? next.due_date : null,
    nextAmount: next ? round2(next.total_amount - next.paid_amount) : 0,
  };
}

// -- Presupuestos ---------------------------------------------------------
function categorySpendForMonth(categoryId, transactions, year, month) {
  const ym = `${year}-${String(month).padStart(2, "0")}`;
  let total = 0;
  transactions.forEach((tx) => {
    if (tx.transaction_type === "EXPENSE" && tx.category_id === categoryId && monthKey(tx.transaction_date) === ym) {
      total += tx.amount;
    }
  });
  return round2(total);
}

function budgetProgress(budget, budgetCategories, transactions, categories) {
  const lines = budgetCategories.filter((bc) => bc.budget_id === budget.id).map((bc) => {
    const spent = categorySpendForMonth(bc.category_id, transactions, budget.year, budget.month);
    const pct = bc.budget_amount > 0 ? round2((spent / bc.budget_amount) * 100) : 0;
    return {
      bc, spent, pct,
      categoryLabel: categoryName(bc.category_id, categories),
      over: spent > bc.budget_amount,
      near: !((spent > bc.budget_amount)) && pct >= 80,
    };
  });
  const totalSpent = round2(lines.reduce((s, l) => s + l.spent, 0));
  return { lines, totalSpent, totalBudget: budget.total_budget || 0 };
}

// -- Vehiculos --------------------------------------------------------------
function vehicleSpend(vehicleId, transactions) {
  const today = todayStr();
  const thisMonthKey = monthKey(today);
  let total = 0, thisMonth = 0;
  transactions.forEach((tx) => {
    if (tx.transaction_type !== "EXPENSE" || tx.vehicle_id !== vehicleId) return;
    total += tx.amount;
    if (monthKey(tx.transaction_date) === thisMonthKey) thisMonth += tx.amount;
  });
  return { total: round2(total), thisMonth: round2(thisMonth) };
}

// -- Proximos vencimientos: tarjetas + cuotas de deuda + impuestos -------
function computeUpcoming(accounts, transactions, debts, debtInstallments, taxes, today) {
  today = today || new Date();
  const out = [];

  accounts.forEach((a) => {
    if (a.account_type === "CREDIT_CARD" && a.payment_day) {
      const info = cardNextPaymentInfo(a, transactions, today);
      if (info) {
        const d = daysUntil(info.date, today);
        if (d <= 30) out.push({ name: a.account_name, detail: `Pago de tarjeta: ${money(info.amount)}`, date: info.date, daysLabel: daysLabel(d), kind: "card" });
      }
    }
  });

  debts.filter((d) => d.is_active).forEach((d) => {
    const pending = debtInstallments.filter((i) => i.debt_id === d.id && i.status !== "paid")
      .sort((a, b) => a.installment_number - b.installment_number)[0];
    if (pending) {
      const days = daysUntil(pending.due_date, today);
      if (days <= 30) out.push({ name: d.debt_name, detail: `Cuota ${pending.installment_number}: ${money(pending.total_amount - pending.paid_amount)}`, date: pending.due_date, daysLabel: daysLabel(days), kind: "debt" });
    }
  });

  taxes.filter((t) => t.status !== "PAID").forEach((t) => {
    const days = daysUntil(t.due_date, today);
    if (days <= 30) out.push({ name: t.tax_name, detail: `Impuesto: ${money(t.amount - (t.paid_amount || 0))}`, date: t.due_date, daysLabel: daysLabel(days), kind: "tax" });
  });

  return out.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
}
