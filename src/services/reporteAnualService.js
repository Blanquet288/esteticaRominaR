import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { db } from './firebase';
import { toDate, toNumber } from './dashboardService';
import { fetchEmpleadosMap, roundMoney, toLocalIsoDate } from './ventasService';

export const MONTHS_LONG = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export const MONTHS_SHORT = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

function toFechaIso(value) {
  const raw = String(value || '');
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const date = toDate(value);
  return date ? toLocalIsoDate(date) : '';
}

function yearBounds(year) {
  return {
    start: `${year}-01-01`,
    end: `${year + 1}-01-01`,
    startDate: new Date(year, 0, 1),
    endDate: new Date(year + 1, 0, 1),
  };
}

function monthIndexFromFecha(fechaIso) {
  const month = Number(String(fechaIso).slice(5, 7));
  return month >= 1 && month <= 12 ? month - 1 : -1;
}

async function fetchYearDocs(collectionName, year, mapDoc) {
  const { start, end, startDate, endDate } = yearBounds(year);
  const colRef = collection(db, collectionName);

  const inYear = (item) => item.fecha >= start && item.fecha < end;

  try {
    const snapshot = await getDocs(
      query(colRef, where('fecha', '>=', start), where('fecha', '<', end)),
    );
    if (!snapshot.empty) return snapshot.docs.map(mapDoc);
  } catch {
    // Tipo de fecha o índice distinto.
  }

  try {
    const snapshot = await getDocs(
      query(
        colRef,
        where('fecha', '>=', Timestamp.fromDate(startDate)),
        where('fecha', '<', Timestamp.fromDate(endDate)),
      ),
    );
    if (!snapshot.empty) return snapshot.docs.map(mapDoc);
  } catch {
    // Continúa con filtro en cliente.
  }

  const snapshot = await getDocs(colRef);
  return snapshot.docs.map(mapDoc).filter(inYear);
}

function mapVenta(item) {
  const data = item.data();
  return {
    id: item.id,
    fecha: toFechaIso(data.fecha),
    idEmpleado: String(data.idEmpleado || ''),
    monto: toNumber(data.monto),
    comisionMonto: toNumber(data.comisionMonto),
  };
}

function mapGasto(item) {
  const data = item.data();
  return {
    id: item.id,
    fecha: toFechaIso(data.fecha),
    monto: toNumber(data.monto),
  };
}

function emptyMonth(year, monthIndex) {
  return {
    year,
    monthIndex,
    monthKey: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
    label: MONTHS_LONG[monthIndex],
    short: MONTHS_SHORT[monthIndex],
    ventas: 0,
    comisiones: 0,
    gastos: 0,
    gananciaNeta: 0,
  };
}

export async function loadReporteAnual(year) {
  const [ventas, gastos, empleados] = await Promise.all([
    fetchYearDocs('ventas', year, mapVenta),
    fetchYearDocs('gastos', year, mapGasto),
    fetchEmpleadosMap(),
  ]);

  const months = Array.from({ length: 12 }, (_, monthIndex) => emptyMonth(year, monthIndex));

  ventas.forEach((venta) => {
    const index = monthIndexFromFecha(venta.fecha);
    if (index < 0) return;
    months[index].ventas = roundMoney(months[index].ventas + venta.monto);
    months[index].comisiones = roundMoney(months[index].comisiones + venta.comisionMonto);
  });

  gastos.forEach((gasto) => {
    const index = monthIndexFromFecha(gasto.fecha);
    if (index < 0) return;
    months[index].gastos = roundMoney(months[index].gastos + gasto.monto);
  });

  months.forEach((month) => {
    month.gananciaNeta = roundMoney(month.ventas - month.comisiones - month.gastos);
  });

  const totals = months.reduce(
    (acc, month) => ({
      ventas: roundMoney(acc.ventas + month.ventas),
      comisiones: roundMoney(acc.comisiones + month.comisiones),
      gastos: roundMoney(acc.gastos + month.gastos),
      gananciaNeta: roundMoney(acc.gananciaNeta + month.gananciaNeta),
    }),
    { ventas: 0, comisiones: 0, gastos: 0, gananciaNeta: 0 },
  );

  const withSales = months.filter((month) => month.ventas > 0);
  const mesEstrella = withSales.reduce(
    (best, month) => (!best || month.ventas > best.ventas ? month : best),
    null,
  );
  const mesMenor = withSales.reduce(
    (worst, month) => (!worst || month.ventas < worst.ventas ? month : worst),
    null,
  );

  const byEmployee = new Map();
  ventas.forEach((venta) => {
    const id = venta.idEmpleado || 'sin-asignar';
    if (!byEmployee.has(id)) {
      const person = empleados[id];
      byEmployee.set(id, {
        id,
        nombre: person?.nombre || 'Sin asignar',
        rol: person?.rol || '',
        ventas: 0,
        comisiones: 0,
        servicios: 0,
      });
    }
    const row = byEmployee.get(id);
    row.ventas = roundMoney(row.ventas + venta.monto);
    row.comisiones = roundMoney(row.comisiones + venta.comisionMonto);
    row.servicios += 1;
  });

  const ranking = [...byEmployee.values()]
    .filter((item) => item.ventas > 0)
    .sort((a, b) => b.ventas - a.ventas || b.servicios - a.servicios)
    .map((item, index) => ({
      ...item,
      puesto: index + 1,
      aportePct: totals.ventas ? Math.round((item.ventas / totals.ventas) * 100) : 0,
    }));

  return {
    year,
    months,
    totals,
    mesEstrella,
    mesMenor,
    ranking,
    topColaboradora: ranking[0] || null,
    hayMovimientos: ventas.length > 0 || gastos.length > 0,
  };
}
