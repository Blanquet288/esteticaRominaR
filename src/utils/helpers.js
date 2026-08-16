export function normalizarTipoComisionServicio(raw) {
  const s = String(raw || '')
    .toLowerCase()
    .trim();
  if (s === 'monto_fijo' || s === 'montofijo' || s === 'fijo') return 'monto_fijo';
  return 'porcentaje';
}

export function esComisionMontoFijo(raw) {
  return normalizarTipoComisionServicio(raw) === 'monto_fijo';
}
