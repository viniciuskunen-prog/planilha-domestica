const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

export function formatBRL(value) {
  const number = Number(value || 0);
  return brlFormatter.format(number);
}

export function parseBRL(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;

  const normalized = String(value)
    .replace(/\s/g, '')
    .replace('R$', '')
    .replace(/\./g, '')
    .replace(',', '.');

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
