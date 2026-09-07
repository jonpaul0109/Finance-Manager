/**
 * Motor de calculo financiero. Todo se deriva de los movimientos
 * (transactions) -- no hay saldos "guardados" que puedan desincronizarse.
 *
 * Tipos de cuenta: cash, bank, credit_card, loan_debt (yo debo),
 * loan_credit (me deben).
 *
 * Tipos de movimiento: income, expense, transfer.
 *
 * Reglas de polaridad para "transfer" (from_account_id -> to_account_id):
 *   - Lado FROM:
 *       cash/bank/loan_credit  -> balance -amount (sale plata / cobro reduce lo que me deben)
 *       credit_card/loan_debt  -> balance +amount (uso esa cuenta como origen = te prestan mas)
 *   - Lado TO:
 *       cash/bank/loan_credit  -> balance +amount (entra plata / prestas = aumenta lo que te deben)
 *       credit_card/loan_debt  -> balance -amount (pagas la tarjeta/prestamo = reduce deuda)
 */

const DEBT_TYPES = ["credit_card", "loan_debt"];

function computeAccountBalance(account, transactions) {
  let bal = account.initial_balance || 0;
  const isDebtType = DEBT_TYPES.includes(account.type);

  for (const tx of transactions) {
    if (tx.type === "income" && tx.to_account_id === account.id) {
      bal += tx.amount;
    } else if (tx.type === "expense" && tx.from_account_id === account.id) {
      bal += isDebtType ? tx.amount : -tx.amount;
    } else if (tx.type === "transfer") {
      if (tx.from_account_id === account.id) {
        bal += isDebtType ? tx.amount : -tx.amount;
      }
      if (tx.to_account_id === account.id) {
        bal += isDebtType ? -tx.amount : tx.amount;
      }
    }
  }
  return round2(bal);
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function computeAllBalances(accounts, transactions) {
  const map = {};
  accounts.forEach((a) => { map[a.id] = computeAccountBalance(a, transactions); });
  return map;
}

// -- Totales de patrimonio -------------------------------------------
function computeNetWorth(accounts, balances) {
  let liquid = 0, debt = 0, receivable = 0;
  accounts.forEach((a) => {
    const b = balances[a.id] || 0;
    if (a.type === "cash" || a.type === "bank") liquid += b;
    else if (a.type === "credit_card" || a.type === "loan_debt") debt += b;
    else if (a.type === "loan_credit") receivable += b;
  });
  return {
    liquid: round2(liquid),
    debt: round2(debt),
    receivable: round2(receivable),
    net: round2(liquid + receivable - debt),
  };
}

// -- Resumen del mes ---------------------------------------------------
function monthKey(dateStr) {
  return (dateStr || "").slice(0, 7); // "YYYY-MM"
}

function computeMonthSummary(transactions, ym) {
  let income = 0, expense = 0;
  const byCategory = {}; // category_id -> total gastado
  transactions.forEach((tx) => {
    if (monthKey(tx.date) !== ym) return;
    if (tx.type === "income") income += tx.amount;
    if (tx.type === "expense") {
      expense += tx.amount;
      byCategory[tx.category_id] = (byCategory[tx.category_id] || 0) + tx.amount;
    }
  });
  return { income: round2(income), expense: round2(expense), balance: round2(income - expense), byCategory };
}

// -- Presupuestos --------------------------------------------------------
function computeBudgetProgress(budgets, monthSummary) {
  return budgets.map((b) => {
    const spent = round2(monthSummary.byCategory[b.category_id] || 0);
    const pct = b.limit_amount > 0 ? round2((spent / b.limit_amount) * 100) : 0;
    return { ...b, spent, pct, over: spent > b.limit_amount, near: pct >= 90 && spent <= b.limit_amount };
  });
}

// -- Prestamos: cuota estimada + progreso + proximo vencimiento --------
function loanSchedule(account) {
  const principal = account.initial_balance || 0;
  const n = account.num_installments || 1;
  const installmentAmount = round2(principal / n);
  const start = account.start_date ? new Date(account.start_date + "T00:00:00") : null;
  return { principal, num_installments: n, installment_amount: installmentAmount, start };
}

function loanProgress(account, remainingBalance) {
  const { principal, num_installments, installment_amount } = loanSchedule(account);
  if (!principal) return { paidCount: 0, num_installments, installment_amount, pctPaid: 0, nextDueDate: null };
  const paidAmount = round2(principal - remainingBalance);
  const paidCount = installment_amount > 0 ? Math.min(num_installments, Math.round(paidAmount / installment_amount)) : 0;
  const pctPaid = round2((paidAmount / principal) * 100);
  const nextDueDate = nextLoanDueDate(account, paidCount);
  return { paidCount, num_installments, installment_amount, pctPaid, nextDueDate };
}

function nextLoanDueDate(account, paidCount) {
  if (!account.start_date) return null;
  if (paidCount >= (account.num_installments || 0)) return null;
  const d = new Date(account.start_date + "T00:00:00");
  d.setMonth(d.getMonth() + paidCount + 1);
  return d;
}

// -- Tarjetas: proxima fecha de pago -------------------------------------
function nextCardDueDate(account, today) {
  today = today || new Date();
  const dueDay = account.due_day;
  if (!dueDay) return null;
  const d = new Date(today.getFullYear(), today.getMonth(), dueDay);
  if (d < stripTime(today)) d.setMonth(d.getMonth() + 1);
  return d;
}

function stripTime(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysUntil(date, today) {
  today = stripTime(today || new Date());
  const target = stripTime(date);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function fmtDate(d) {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
