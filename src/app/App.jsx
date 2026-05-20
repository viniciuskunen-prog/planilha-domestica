import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Plus } from 'lucide-react';
import { formatBRL, parseBRL } from '../lib/money.js';
import { calculateSettlement } from '../features/settlement/settlement.js';

const members = [
  { id: 'vini', displayName: 'Vini' },
  { id: 'eliane', displayName: 'Eliane' }
];

const monthNames = [
  'Janeiro',
  'Fevereiro',
  'Marco',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
];

const initialPeriod = { year: 2026, month: 5 };

const initialRows = [
  { id: '1', description: 'Agua', amount: 120, paidByUserId: 'eliane' },
  { id: '2', description: 'Luz', amount: 260, paidByUserId: 'vini' },
  { id: '3', description: 'Parcela da casa', amount: 1800, paidByUserId: 'vini' },
  { id: '4', description: 'Internet', amount: 110, paidByUserId: 'eliane' },
  { id: '5', description: 'Escola Isis', amount: 1000, paidByUserId: 'eliane' }
];

function getPeriodKey(period) {
  return `${period.year}-${String(period.month).padStart(2, '0')}`;
}

function getPeriodLabel(period) {
  return `${monthNames[period.month - 1]}/${period.year}`;
}

function shiftPeriod(period, offset) {
  const date = new Date(period.year, period.month - 1 + offset, 1);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1
  };
}

function cloneStructure(rows) {
  return rows.map((row, index) => ({
    id: crypto.randomUUID(),
    description: row.description,
    amount: 0,
    paidByUserId: row.paidByUserId || members[0].id,
    position: index
  }));
}

export function App() {
  const [selectedPeriod, setSelectedPeriod] = useState(initialPeriod);
  const [sheets, setSheets] = useState({
    [getPeriodKey(initialPeriod)]: initialRows
  });

  const currentKey = getPeriodKey(selectedPeriod);
  const rows = sheets[currentKey] || [];
  const previousPeriod = shiftPeriod(selectedPeriod, -1);
  const previousRows = sheets[getPeriodKey(previousPeriod)] || [];
  const settlement = useMemo(() => calculateSettlement(rows, members), [rows]);

  function setCurrentRows(nextRows) {
    setSheets((current) => ({
      ...current,
      [currentKey]: nextRows
    }));
  }

  function goToPreviousMonth() {
    setSelectedPeriod((current) => shiftPeriod(current, -1));
  }

  function goToNextMonth() {
    setSelectedPeriod((current) => shiftPeriod(current, 1));
  }

  function updateRow(id, field, value) {
    setCurrentRows(rows.map((row) => row.id === id ? { ...row, [field]: value } : row));
  }

  function addRow() {
    setCurrentRows([
      ...rows,
      {
        id: crypto.randomUUID(),
        description: '',
        amount: 0,
        paidByUserId: members[0].id,
        position: rows.length
      }
    ]);
  }

  function removeRow(id) {
    setCurrentRows(rows.filter((row) => row.id !== id));
  }

  function copyPreviousStructure() {
    if (previousRows.length === 0) return;
    setCurrentRows(cloneStructure(previousRows));
  }

  function copySummary() {
    const text = buildSummaryText(settlement, selectedPeriod);
    navigator.clipboard?.writeText(text);
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Casa Vini e Eliane</p>
          <h1>Despesas de {getPeriodLabel(selectedPeriod)}</h1>
          <p className="muted">Tabela livre para lancar. Calculo fechado para acertar.</p>
        </div>
      </header>

      <section className="month-card">
        <button type="button" className="secondary-button" onClick={goToPreviousMonth}>
          <ChevronLeft size={16} />
          Mes anterior
        </button>
        <strong>{getPeriodLabel(selectedPeriod)}</strong>
        <button type="button" className="secondary-button" onClick={goToNextMonth}>
          Proximo mes
          <ChevronRight size={16} />
        </button>
      </section>

      {rows.length === 0 && (
        <section className="empty-month-card">
          <div>
            <strong>{getPeriodLabel(selectedPeriod)} ainda esta vazio.</strong>
            <p>Comece uma tabela nova ou copie apenas as descricoes do mes anterior com valores zerados.</p>
          </div>
          <div className="actions">
            <button type="button" className="secondary-button" onClick={copyPreviousStructure} disabled={previousRows.length === 0}>
              Copiar estrutura de {getPeriodLabel(previousPeriod)}
            </button>
            <button type="button" className="primary-button" onClick={addRow}>
              <Plus size={16} />
              Comecar vazio
            </button>
          </div>
        </section>
      )}

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

function buildSummaryText(settlement, period) {
  const label = getPeriodLabel(period);

  if (settlement.settlement.amount <= 0) {
    return `Resumo despesas ${label}\n\nTotal: ${formatBRL(settlement.total)}\nParte de cada um: ${formatBRL(settlement.sharePerPerson)}\n\nAcerto: ninguem deve nada.`;
  }

  return `Resumo despesas ${label}\n\nTotal: ${formatBRL(settlement.total)}\nParte de cada um: ${formatBRL(settlement.sharePerPerson)}\n\nVini pagou: ${formatBRL(settlement.paidByUser.vini)}\nEliane pagou: ${formatBRL(settlement.paidByUser.eliane)}\n\nAcerto:\n${settlement.settlement.fromDisplayName} transfere ${formatBRL(settlement.settlement.amount)} para ${settlement.settlement.toDisplayName}.`;
}
