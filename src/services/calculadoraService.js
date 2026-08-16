import { toNumber } from './dashboardService';
import { roundMoney } from './ventasService';
import {
  WEEK_RANGES,
  guardarCierre,
  loadCierreMes,
  monthKeyFromIndex,
  obtenerHistorialCierres,
} from './cierreService';
import billete1000 from '../assets/billetes/billete1000.webp';
import billete500 from '../assets/billetes/billete500.webp';
import billete200 from '../assets/billetes/billete200.webp';
import billete100 from '../assets/billetes/billete100.webp';
import billete50 from '../assets/billetes/billete50.webp';
import billete20 from '../assets/billetes/billete20.webp';

export { WEEK_RANGES };

export const BILL_DENOMS = [
  { value: 1000, label: '$1,000', image: billete1000 },
  { value: 500, label: '$500', image: billete500 },
  { value: 200, label: '$200', image: billete200 },
  { value: 100, label: '$100', image: billete100 },
  { value: 50, label: '$50', image: billete50 },
  { value: 20, label: '$20', image: billete20 },
];

export function emptyCountsForm() {
  return {
    1000: '',
    500: '',
    200: '',
    100: '',
    50: '',
    20: '',
    monedas: '',
  };
}

export function emptyMonthForms() {
  return {
    1: emptyCountsForm(),
    2: emptyCountsForm(),
    3: emptyCountsForm(),
    4: emptyCountsForm(),
  };
}

function billCount(value) {
  return Math.max(0, Math.round(toNumber(value)) || 0);
}

export function parseCounts(form) {
  return {
    1000: billCount(form[1000]),
    500: billCount(form[500]),
    200: billCount(form[200]),
    100: billCount(form[100]),
    50: billCount(form[50]),
    20: billCount(form[20]),
    monedas: Math.max(0, roundMoney(form.monedas)),
  };
}

export function countsToForm(counts = {}) {
  return {
    1000: counts[1000] || counts['1000'] ? String(counts[1000] ?? counts['1000']) : '',
    500: counts[500] || counts['500'] ? String(counts[500] ?? counts['500']) : '',
    200: counts[200] || counts['200'] ? String(counts[200] ?? counts['200']) : '',
    100: counts[100] || counts['100'] ? String(counts[100] ?? counts['100']) : '',
    50: counts[50] || counts['50'] ? String(counts[50] ?? counts['50']) : '',
    20: counts[20] || counts['20'] ? String(counts[20] ?? counts['20']) : '',
    monedas: counts.monedas ? String(counts.monedas) : '',
  };
}

export function toFirestoreCounts(counts = {}) {
  const parsed = parseCounts(counts);
  return {
    monedas: parsed.monedas,
    1000: parsed[1000],
    500: parsed[500],
    200: parsed[200],
    100: parsed[100],
    50: parsed[50],
    20: parsed[20],
  };
}

export function estadoCuadre(diferencia) {
  if (diferencia > 0) return 'Sobrante';
  if (diferencia < 0) return 'Faltante';
  return 'Cuadrado';
}

export function physicalFromCounts(counts) {
  const parsed = parseCounts(counts);
  return roundMoney(
    BILL_DENOMS.reduce((sum, bill) => sum + bill.value * parsed[bill.value], 0) + parsed.monedas,
  );
}

function formatBillLine(value, cantidad) {
  const noun = cantidad === 1 ? 'billete' : 'billetes';
  return `${cantidad} ${noun} de ${new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function formatPackItems(items) {
  if (!items.length) return 'sin efectivo';
  return items
    .map((item) =>
      item.value === 'monedas'
        ? `${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(item.cantidad)} en monedas`
        : formatBillLine(item.value, item.cantidad),
    )
    .join(', ');
}

function packItemsFromCounts(counts) {
  const items = [];
  BILL_DENOMS.forEach((bill) => {
    const cantidad = billCount(counts[bill.value]);
    if (cantidad > 0) {
      items.push({
        value: bill.value,
        cantidad,
        subtotal: roundMoney(bill.value * cantidad),
      });
    }
  });
  const monedas = Math.max(0, roundMoney(counts.monedas));
  if (monedas > 0) {
    items.push({ value: 'monedas', cantidad: monedas, subtotal: monedas });
  }
  return items;
}

function emptyPartnerCounts() {
  return {
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    monedas: 0,
  };
}

export function splitPacas50(weekForms, names) {
  const weeks = WEEK_RANGES.map((meta) => ({
    ...meta,
    counts: parseCounts(weekForms[meta.semana] || emptyCountsForm()),
    fisico: physicalFromCounts(weekForms[meta.semana] || emptyCountsForm()),
  }));

  const totalFisico = roundMoney(weeks.reduce((sum, week) => sum + week.fisico, 0));
  const meta = roundMoney(totalFisico / 2);
  let assigned = 0;

  const socio1Pacas = [];
  const socio2Pacas = [];

  weeks.forEach((week) => {
    const take = emptyPartnerCounts();
    const rest = emptyPartnerCounts();

    BILL_DENOMS.forEach((bill) => {
      const available = week.counts[bill.value];
      const need = Math.max(0, roundMoney(meta - assigned));
      const canTake = Math.min(available, Math.floor((need + 1e-9) / bill.value));
      take[bill.value] = canTake;
      rest[bill.value] = available - canTake;
      assigned = roundMoney(assigned + canTake * bill.value);
    });

    const coins = week.counts.monedas;
    const needCoins = Math.max(0, roundMoney(meta - assigned));
    const takeCoins = Math.min(coins, needCoins);
    take.monedas = takeCoins;
    rest.monedas = roundMoney(coins - takeCoins);
    assigned = roundMoney(assigned + takeCoins);

    const items1 = packItemsFromCounts(take);
    const items2 = packItemsFromCounts(rest);
    socio1Pacas.push({
      semana: week.semana,
      rango: week.rango,
      counts: take,
      items: items1,
      texto: formatPackItems(items1),
      monto: physicalFromCounts(take),
    });
    socio2Pacas.push({
      semana: week.semana,
      rango: week.rango,
      counts: rest,
      items: items2,
      texto: formatPackItems(items2),
      monto: physicalFromCounts(rest),
    });
  });

  const socio1Monto = assigned;
  const socio2Monto = roundMoney(totalFisico - socio1Monto);

  const lineFor = (pacas) =>
    pacas
      .filter((paca) => paca.items.length)
      .map((paca) => `Semana ${paca.semana} (${paca.texto})`)
      .join(', ') || 'sin efectivo en las pacas';

  return {
    totalFisico,
    meta,
    semanas: weeks,
    socio1: {
      nombre: names.socio1 || 'Socio 1',
      monto: socio1Monto,
      pacas: socio1Pacas,
      instruccion: `Tome de las pacas: ${lineFor(socio1Pacas)}`,
    },
    socio2: {
      nombre: names.socio2 || 'Socio 2',
      monto: socio2Monto,
      pacas: socio2Pacas,
      instruccion: `Remanente automático: ${lineFor(socio2Pacas)}`,
    },
  };
}

export function summarizeArqueo(weekForms, cuadrePorSemana) {
  const splitReady = WEEK_RANGES.map((meta) => {
    const teorico = toNumber(cuadrePorSemana?.[meta.semana - 1]?.balance);
    const fisico = physicalFromCounts(weekForms[meta.semana]);
    return {
      semana: meta.semana,
      rango: meta.rango,
      teorico,
      fisico,
      diferencia: roundMoney(fisico - teorico),
    };
  });

  const totalFisico = roundMoney(splitReady.reduce((sum, week) => sum + week.fisico, 0));
  const totalTeorico = roundMoney(splitReady.reduce((sum, week) => sum + week.teorico, 0));

  return {
    semanas: splitReady,
    totalFisico,
    totalTeorico,
    diferenciaMes: roundMoney(totalFisico - totalTeorico),
  };
}

export function formsFromSaved(saved) {
  const forms = emptyMonthForms();
  const desglose = saved?.desglose;
  if (!desglose) return forms;

  [1, 2, 3, 4].forEach((semana) => {
    const source = desglose[`semana${semana}`];
    if (source && typeof source === 'object') {
      forms[semana] = countsToForm(source);
    }
  });

  const legacy = Array.isArray(desglose.semanas) ? desglose.semanas : Array.isArray(desglose) ? desglose : [];
  legacy.forEach((week) => {
    const semana = Number(week?.semana);
    if (semana < 1 || semana > 4) return;
    const source = week?.counts && typeof week.counts === 'object' ? week.counts : week;
    forms[semana] = countsToForm(source);
  });

  return forms;
}

export async function loadArqueoMes(year, monthIndex) {
  const result = await loadCierreMes(year, monthIndex);
  return {
    ...result,
    weekForms: formsFromSaved(result.saved),
  };
}

function tomaFromPacas(pacas) {
  const toma = {};
  [1, 2, 3, 4].forEach((semana) => {
    const paca = pacas.find((item) => item.semana === semana);
    toma[`semana${semana}`] = toFirestoreCounts(paca?.counts || emptyPartnerCounts());
  });
  return toma;
}

export async function saveArqueoMensual({ year, monthIndex, snapshot, weekForms, names }) {
  const monthKey = monthKeyFromIndex(year, monthIndex);
  const summary = summarizeArqueo(weekForms, snapshot.cuadrePorSemana);
  const split = splitPacas50(weekForms, names);
  const objetivo = roundMoney(summary.totalFisico / 2);

  const desglose = {};
  const cuadrePorSemana = {};
  WEEK_RANGES.forEach((meta, index) => {
    const key = `semana${meta.semana}`;
    const week = summary.semanas[index];
    desglose[key] = toFirestoreCounts(weekForms[meta.semana]);
    cuadrePorSemana[key] = {
      esperadoSistema: week.teorico,
      totalFisico: week.fisico,
      diferencia: week.diferencia,
      estado: estadoCuadre(week.diferencia),
    };
  });

  const payload = {
    mes: monthKey,
    fecha: `${monthKey}-01`,
    totalFisico: summary.totalFisico,
    totalTeoricoSistema: summary.totalTeorico,
    diferencia: summary.diferenciaMes,
    desglose,
    cuadrePorSemana,
    reparto: {
      socio1: {
        nombre: split.socio1.nombre,
        monto: split.socio1.monto,
        toma: tomaFromPacas(split.socio1.pacas),
      },
      socio2: {
        nombre: split.socio2.nombre,
        monto: split.socio2.monto,
        toma: tomaFromPacas(split.socio2.pacas),
      },
    },
    meta50: {
      objetivoA: objetivo,
      objetivoB: roundMoney(summary.totalFisico - objetivo),
    },
  };

  await guardarCierre(monthKey, payload);
  return { payload, summary, split };
}

export async function fetchCierresHistorial() {
  return obtenerHistorialCierres();
}
