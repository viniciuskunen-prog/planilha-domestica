import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, Copy, LogOut, Plus, Trash2 } from 'lucide-react';
import { LoginPage } from '../features/auth/LoginPage.jsx';
import { useAuth } from '../features/auth/useAuth.js';
import { signOut } from '../features/auth/authService.js';
import { useHousehold } from '../features/household/useHousehold.js';
import { useMonthlySheet } from '../features/sheets/useMonthlySheet.js';
import { calculateSettlement } from '../features/settlement/settlement.js';
import { formatBRL, parseBRL } from '../lib/money.js';

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

function getInitialPeriod() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1
  };
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

function moneyInputValue(value) {
  if (!value) return '';
  return String(value).replace('.', ',');
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function getGreetingEmoji() {
  const hour = new Date().getHours();
  if (hour < 12) return '☀️';
  if (hour < 18) return '🌤️';
  return '🌙';
}

function getUserFirstName(user, members) {
  const profileName = members.find((member) => member.id === user?.id)?.displayName;
  const metadataName = user?.user_metadata?.display_name || user?.user_metadata?.name;
  const emailName = user?.email?.split('@')[0];
  const name = profileName || metadataName || emailName || 'usuario';

  return String(name).split(' ')[0];
}

function getMonthVariation(currentTotal, previousTotal) {
  if (!previousTotal || previousTotal <= 0) return null;

  const percent = ((currentTotal - previousTotal) / previousTotal) * 100;

  if (Math.abs(percent) < 0.1) {
    return {
      direction: 'flat',
      label: '0%',
      title: 'Igual ao mes anterior'
    };
  }

  return {
    direction: percent > 0 ? 'up' : 'down',
    label: `${Math.abs(percent).toFixed(0)}%`,
    title: percent > 0 ? 'Acima do mes anterior' : 'Abaixo do mes anterior'
  };
}

function getSettlementText(settlement) {
  if (settlement.settlement.amount <= 0) return 'Ninguem deve nada';

  return `${settlement.settlement.fromDisplayName} deve ${formatBRL(settlement.settlement.amount)} para ${settlement.settlement.toDisplayName}`;
}

export function ConnectedApp() {
  const auth = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState(getInitialPeriod);
  const [expandedRowId, setExpandedRowId] = useState(null);

  const householdState = useHousehold(auth.user);
  const fallbackPaidByUserId = householdState.members[0]?.id || auth.user?.id || null;

  const sheetState = useMonthlySheet({
    household: householdState.household,
    period: selectedPeriod,
    user: auth.user,
    fallbackPaidByUserId,
    editingRowId: expandedRowId
  });

  const rows = sheetState.rows || [];
  const members = householdState.members || [];
  const userFirstName = getUserFirstName(auth.user, members);
  const previousPeriod = shiftPeriod(selectedPeriod, -1);
  const canCopyPreviousStructure = rows.length === 0 && sheetState.previousRows.length > 0 && !sheetState.copyingStructure;
  const settlement = useMemo(() => calculateSettlement(rows, members), [rows, members]);
  const previousSettlement = useMemo(() => calculateSettlement(sheetState.previousRows || [], members), [sheetState.previousRows, members]);
  const monthVariation = getMonthVariation(settlement.total, previousSettlement.total);

  if (auth.loading) {
    return <LoadingScreen text="Carregando sessao" description="Validando seu acesso e preparando o app." />;
  }

  if (!auth.isConfigured) {
    return <ConfigMissingScreen />;
  }

  if (!auth.user) {
    return <LoginPage />;
  }

  if (householdState.loading) {
    return <LoadingScreen text="Carregando casa" description="Buscando o espaco compartilhado e os membros." />;
  }

  if (!householdState.household) {
    return <NoHouseholdScreen />;
  }

  function goToPreviousMonth() {
    setExpandedRowId(null);
    setSelectedPeriod((current) => shiftPeriod(current, -1));
  }

  function goToNextMonth() {
    setExpandedRowId(null);
    setSelectedPeriod((current) => shiftPeriod(current, 1));
  }

  function copySummary() {
    const text = buildSummaryText(settlement, selectedPeriod, members);
    navigator.clipboard?.writeText(text);
  }

  async function finishRow(row) {
    await sheetState.saveRow(row.id, 'description', String(row.description || '').trim());
    await sheetState.saveRow(row.id, 'amount', parseBRL(row.amount));
    setExpandedRowId(null);
  }

  async function addMobileRow() {
    const newRow = await sheetState.addRow();
    if (newRow?.id) {
      setExpandedRowId(newRow.id);
    }
  }

  return (
    <main className="app-shell">
      <header className="hero app-hero-with-action">
        <div>
          <p className="eyebrow">Rateio de contas conjuntas</p>
          <p className="hero-greeting">{getGreeting()},</p>
          <h1>{userFirstName}! <span className="hero-emoji" aria-hidden="true">{getGreetingEmoji()}</span></h1>
          <p className="muted">Registre aqui as despesas pagas por voce</p>
        </div>
        <button type="button" className="secondary-button signout-button" onClick={signOut} aria-label="Sair">
          <LogOut size={16} />
          <span>Sair</span>
        </button>
      </header>

      <section className="month-card" aria-label="Seletor de mes">
        <button type="button" className="icon-button" onClick={goToPreviousMonth} aria-label="Mes anterior">
          <ChevronLeft size={20} />
        </button>
        <strong>{getPeriodLabel(selectedPeriod)}</strong>
        <button type="button" className="icon-button" onClick={goToNextMonth} aria-label="Proximo mes">
          <ChevronRight size={20} />
        </button>
      </section>

      {sheetState.loading && <LoadingInline text="Carregando mes..." />}
      {sheetState.copyingStructure && <LoadingInline text="Copiando estrutura..." />}
      {sheetState.error && <ErrorInline text={sheetState.error.message} />}

      {rows.length === 0 && !sheetState.loading && (
        <section className="empty-month-card">
          <div>
            <strong>{getPeriodLabel(selectedPeriod)} esta vazio.</strong>
            <p>Copie a estrutura de {getPeriodLabel(previousPeriod)} com valores zerados ou comece do zero.</p>
          </div>
          <div className="actions">
            <button type="button" className="secondary-button" onClick={sheetState.copyPreviousStructure} disabled={!canCopyPreviousStructure}>
              Copiar {getPeriodLabel(previousPeriod)}
            </button>
            <button type="button" className="primary-button" onClick={addMobileRow}>
              <Plus size={16} />
              Comecar vazio
            </button>
          </div>
        </section>
      )}

      <section className="summary-grid compact-summary">
        <SummaryCard label="Total" value={formatBRL(settlement.total)} variation={monthVariation} />
        <SummaryCard label="Metade" value={formatBRL(settlement.sharePerPerson)} />
        {members.map((member) => (
          <SummaryCard key={member.id} label={member.displayName} value={formatBRL(settlement.paidByUser[member.id])} />
        ))}
      </section>

      <section className="settlement-card">
        <span>Acerto do mes</span>
        <strong>{getSettlementText(settlement)}</strong>
      </section>

      <section className="sheet-card">
        <div className="sheet-header">
          <h2>Rateio</h2>
          <div className="actions sheet-actions">
            <button type="button" className="secondary-button" onClick={copySummary}>
              <Copy size={16} />
              Copiar
            </button>
            <button type="button" className="primary-button desktop-add-button" onClick={sheetState.addRow}>
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
              <input
                value={row.description}
                onChange={(event) => sheetState.updateRow(row.id, 'description', event.target.value)}
                onBlur={(event) => sheetState.saveRow(row.id, 'description', event.target.value.trim())}
                placeholder="Descricao"
              />
              <input
                value={moneyInputValue(row.amount)}
                inputMode="decimal"
                onChange={(event) => sheetState.updateRow(row.id, 'amount', event.target.value)}
                onBlur={(event) => sheetState.saveRow(row.id, 'amount', parseBRL(event.target.value))}
                placeholder="0,00"
              />
              <select value={row.paidByUserId || fallbackPaidByUserId || ''} onChange={(event) => sheetState.updateAndSaveRow(row.id, 'paidByUserId', event.target.value)}>
                {members.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}
              </select>
              <button type="button" className="ghost-button" onClick={() => sheetState.removeRow(row.id)}>Remover</button>
            </div>
          ))}
        </div>

        <div className="mobile-list">
          {rows.map((row) => {
            const isExpanded = expandedRowId === row.id;
            const payer = members.find((member) => member.id === row.paidByUserId);

            return (
              <article className={`mobile-row ${isExpanded ? 'is-expanded' : 'is-collapsed'}`} key={row.id}>
                {!isExpanded && (
                  <button type="button" className="collapsed-row" onClick={() => setExpandedRowId(row.id)}>
                    <span>{row.description || 'Sem descricao'}</span>
                    <strong>{formatBRL(parseBRL(row.amount))}</strong>
                    <em>{payer?.displayName || 'Sem pagador'}</em>
                  </button>
                )}

                {isExpanded && (
                  <>
                    <div className="mobile-row-top">
                      <input
                        className="description-input"
                        value={row.description}
                        onChange={(event) => sheetState.updateRow(row.id, 'description', event.target.value)}
                        onBlur={(event) => sheetState.saveRow(row.id, 'description', event.target.value.trim())}
                        placeholder="Descricao"
                      />
                      <button type="button" className="delete-button" onClick={() => sheetState.removeRow(row.id)} aria-label="Remover linha">
                        <Trash2 size={17} />
                      </button>
                    </div>

                    <div className="mobile-row-grid">
                      <label>
                        <span>Valor</span>
                        <input
                          value={moneyInputValue(row.amount)}
                          inputMode="decimal"
                          onChange={(event) => sheetState.updateRow(row.id, 'amount', event.target.value)}
                          onBlur={(event) => sheetState.saveRow(row.id, 'amount', parseBRL(event.target.value))}
                          placeholder="0,00"
                        />
                      </label>

                      <div className="payer-toggle" aria-label="Pago por">
                        {members.map((member) => (
                          <button
                            key={member.id}
                            type="button"
                            className={row.paidByUserId === member.id ? 'active' : ''}
                            onClick={() => sheetState.updateAndSaveRow(row.id, 'paidByUserId', member.id)}
                          >
                            {member.displayName}
                          </button>
                        ))}
                      </div>

                      <button type="button" className="primary-button finish-row-button" onClick={() => finishRow(row)}>
                        <Check size={16} />
                        Concluir
                      </button>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <button type="button" className="mobile-fab" onClick={addMobileRow} aria-label="Adicionar nova linha">
        <Plus size={22} />
      </button>
    </main>
  );
}

function SummaryCard({ label, value, variation }) {
  return (
    <article className="summary-card">
      <span>{label}</span>
      <div className="summary-value-row">
        <strong>{value}</strong>
        {variation && <MonthVariationBadge variation={variation} />}
      </div>
    </article>
  );
}

function MonthVariationBadge({ variation }) {
  const symbol = variation.direction === 'up' ? '↗' : variation.direction === 'down' ? '↘' : '—';

  return (
    <span className={`month-variation ${variation.direction}`} title={variation.title}>
      {symbol} {variation.label}
    </span>
  );
}

function LoadingScreen({ text, description }) {
  return (
    <main className="loading-screen">
      <section className="loading-card">
        <div className="loading-mark" aria-hidden="true" />
        <p className="eyebrow">Planilha Domestica</p>
        <h1>{text}</h1>
        <p className="muted">{description}</p>
        <div className="loading-skeleton" aria-hidden="true">
          <span className="loading-line medium" />
          <span className="loading-line" />
          <span className="loading-line short" />
        </div>
      </section>
    </main>
  );
}

function LoadingInline({ text }) {
  return <p className="inline-status">{text}</p>;
}

function ErrorInline({ text }) {
  return <p className="inline-status error">{text}</p>;
}

function ConfigMissingScreen() {
  return (
    <main className="login-shell">
      <section className="login-card">
        <p className="eyebrow">Configuracao pendente</p>
        <h1>Supabase nao configurado</h1>
        <p className="muted">Crie o arquivo .env local com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.</p>
      </section>
    </main>
  );
}

function NoHouseholdScreen() {
  return (
    <main className="login-shell">
      <section className="login-card">
        <p className="eyebrow">Espaco nao encontrado</p>
        <h1>Usuario sem casa vinculada</h1>
        <p className="muted">Crie o household inicial e vincule este usuario em household_members.</p>
        <button type="button" className="secondary-button" onClick={signOut}>Sair</button>
      </section>
    </main>
  );
}

function buildSummaryText(settlement, period, members) {
  const label = getPeriodLabel(period);
  const paidLines = members.map((member) => `${member.displayName} pagou: ${formatBRL(settlement.paidByUser[member.id])}`).join('\n');

  if (settlement.settlement.amount <= 0) {
    return `Resumo despesas ${label}\n\nTotal: ${formatBRL(settlement.total)}\nParte de cada um: ${formatBRL(settlement.sharePerPerson)}\n\n${paidLines}\n\nAcerto: ninguem deve nada.`;
  }

  return `Resumo despesas ${label}\n\nTotal: ${formatBRL(settlement.total)}\nParte de cada um: ${formatBRL(settlement.sharePerPerson)}\n\n${paidLines}\n\nAcerto:\n${settlement.settlement.fromDisplayName} deve ${formatBRL(settlement.settlement.amount)} para ${settlement.settlement.toDisplayName}.`;
}
