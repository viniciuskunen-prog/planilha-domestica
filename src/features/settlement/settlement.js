export function calculateSettlement(rows, members) {
  const list = Array.isArray(rows) ? rows : [];
  const people = Array.isArray(members) ? members : [];

  const total = list.reduce((sum, row) => sum + toNumber(row.amount), 0);
  const sharePerPerson = people.length > 0 ? total / people.length : 0;

  const paidByUser = {};
  for (const person of people) {
    paidByUser[person.id] = 0;
  }

  for (const row of list) {
    if (!row.paidByUserId) continue;
    paidByUser[row.paidByUserId] = (paidByUser[row.paidByUserId] || 0) + toNumber(row.amount);
  }

  const balances = people.map((person) => {
    const paid = paidByUser[person.id] || 0;
    return {
      userId: person.id,
      displayName: person.displayName,
      paid,
      balance: paid - sharePerPerson
    };
  });

  const sorted = [...balances].sort((a, b) => a.balance - b.balance);
  const debtor = sorted[0];
  const creditor = sorted[sorted.length - 1];

  const amount = debtor && creditor ? Math.max(0, Math.min(Math.abs(debtor.balance), creditor.balance)) : 0;

  return {
    total,
    sharePerPerson,
    paidByUser,
    balances,
    settlement: amount > 0.009
      ? {
          fromUserId: debtor.userId,
          fromDisplayName: debtor.displayName,
          toUserId: creditor.userId,
          toDisplayName: creditor.displayName,
          amount
        }
      : {
          fromUserId: null,
          fromDisplayName: null,
          toUserId: null,
          toDisplayName: null,
          amount: 0
        }
  };
}

function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}
