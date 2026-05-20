import { useMemo, useState } from 'react';
import { Plus, Copy } from 'lucide-react';
import { formatBRL, parseBRL } from '../lib/money.js';
import { calculateSettlement } from '../features/settlement/settlement.js';

const members = [
  { id: 'vini', displayName: 'Vini' },
  { id: 'eliane', displayName: 'Eliane' }
];

const initialRows = [
  { id: '1', description: 'Agua', amount: 120, paidByUserId: 'eliane' },
  { id: '2', description: 'Luz', amount: 260, paidByUserId: 'vini' },
  { id: '3', description: 'Parcela da casa', amount: 1800, paidByUserId: 'vini' },
  { id: '4', description: 'Internet', amount: 110, paidByUserId: 'eliane' },
  { id: '5', description: 'Escola Isis', amount: 1000, paidByUserId: 'eliane' }
];

export function App() {
  const [rows, setRows] = useState(initialRows);
  const settlement = useMemo(() => calculateSettlement(rows, members), [rows]);

  function updateRow(id, field, value) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, [field]: value } : row));
  }

  function addRow() {
    setRows((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        description: '',
        amount: 0,
        paidByUserId: members[0].id
      }
    ]);
  }

  function removeRow(id) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  function copySummary() {
    const text = buildSummaryText(settlement);
    navigator.clipboard?.writeText(text);
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Casa Vini e Eliane</p>
          <h1>Despesas de Maio/2026</h1>
          <p className="muted">Tabela livre para lancar. Calculo fechado para acertar.</p>
        </div>
      </header>

      <section className="summary-grid">
        <SummaryCard label="Total do mes" value={formatBRL(settlement.total)} />
        <SummaryCard label="Parte de cada um" value={formatBRL(settlement.sharePerPerson)} />
        <SummaryCard label="Vini pagou" value={formatBRL(settlement.paidByUser.vini)} />
        <SummaryCard label="Eliane pagou" value={formatBRL(settlement.paidByUser.eliane)} />
      </section>

      <section className="settlement-card">
        <span>Acerto do mes</span>
        <strong>
          {settlement.settlement.amount > 0
            ? `${settlement.settlement.fromDisplayName} transfere ${formatBRL(settlement.settlement.amount)} para ${settlement.settlement.toDisplayName}`
            : 'Ninguem deve nada'}
        </strong>
      </section>

      <section className="sheet-card">
        <div className="sheet-header">
          <h2>Tabela de rateio</h2>
          <div className="actions">
            <button type="button" className="secondary-button" onClick={copySummary}>
              <Copy size={16} />
              Copiar resumo
            </button>
            <button type="button" className="primary-button" onClick={addRow}>
              <Plus size={16} />
              Nova linha
            </button>
          </div>
        </div>

        <div className="table desktop-table">
          <div className="table-row table-head">
            <span>Descricao</span>
            <span>Valor</span>
            <span>Pago por</span>
            <span></span>
          </div>
          {rows.map((row) => (
            <div className="table-row" key={row.id}>
              <input value={row.description} onChange={(event) => updateRow(row.id, 'description', event.target.value)} placeholder="Descricao" />
              <input value={row.amount ? String(row.amount).replace('.', ',') : ''} inputMode="decimal" onChange={(event) => updateRow(row.id, 'amount', parseBRL(event.target.value))} placeholder="0,00" />
              <select value={row.paidByUserId} onChange={(event) => updateRow(row.id, 'paidByUserId', event.target.value)}>
                {members.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}
              </select>
              <button type="button" className="ghost-button" onClick={() => removeRow(row.id)}>Remover</button>
            </div>
          ))}
        </div>

        <div className="mobile-list">
          {rows.map((row) => (
            <article className="mobile-row" key={row.id}>
              <input value={row.description} onChange={(event) => updateRow(row.id, 'description', event.target.value)} placeholder="Descricao" />
              <div className="mobile-row-grid">
                <input value={row.amount ? String(row.amount).replace('.', ',') : ''} inputMode="decimal" onChange={(event) => updateRow(row.id, 'amount', parseBRL(event.target.value))} placeholder="0,00" />
                <select value={row.paidByUserId} onChange={(event) => updateRow(row.id, 'paidByUserId', event.target.value)}>
                  {members.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}
                </select>
              </div>
              <button type="button" className="ghost-button" onClick={() => removeRow(row.id)}>Remover</button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function SummaryCard({ label, value }) {
  return (
    <article className="summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function buildSummaryText(settlement) {
  if (settlement.settlement.amount <= 0) {
    return `Resumo despesas Maio/2026\n\nTotal: ${formatBRL(settlement.total)}\nParte de cada um: ${formatBRL(settlement.sharePerPerson)}\n\nAcerto: ninguem deve nada.`;
  }

  return `Resumo despesas Maio/2026\n\nTotal: ${formatBRL(settlement.total)}\nParte de cada um: ${formatBRL(settlement.sharePerPerson)}\n\nVini pagou: ${formatBRL(settlement.paidByUser.vini)}\nEliane pagou: ${formatBRL(settlement.paidByUser.eliane)}\n\nAcerto:\n${settlement.settlement.fromDisplayName} transfere ${formatBRL(settlement.settlement.amount)} para ${settlement.settlement.toDisplayName}.`;
}
