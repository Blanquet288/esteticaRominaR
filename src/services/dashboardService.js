import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from './firebase';

function capitalize(value) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatFechaElegante(date) {
  const weekday = date.toLocaleDateString('es-MX', { weekday: 'long' });
  const month = date.toLocaleDateString('es-MX', { month: 'long' });
  return `${capitalize(weekday)}, ${date.getDate()} de ${capitalize(month)} de ${date.getFullYear()}`;
}

export function formatMoney(value) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function inRange(date, start, end) {
  return Boolean(date) && date >= start && date < end;
}

async function fetchMonthDocs(collectionName, start, end) {
  const colRef = collection(db, collectionName);

  const mapDocs = (snapshot) =>
    snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

  try {
    const ranged = await getDocs(
      query(
        colRef,
        where('fecha', '>=', Timestamp.fromDate(start)),
        where('fecha', '<', Timestamp.fromDate(end)),
      ),
    );
    if (!ranged.empty) return mapDocs(ranged);
  } catch {
    // El índice o el tipo de `fecha` pueden variar en el entorno de pruebas.
  }

  try {
    const ranged = await getDocs(
      query(
        colRef,
        where('fecha', '>=', toIsoDate(start)),
        where('fecha', '<', toIsoDate(end)),
      ),
    );
    if (!ranged.empty) return mapDocs(ranged);
  } catch {
    // Continúa con filtro en cliente.
  }

  const snapshot = await getDocs(colRef);
  return mapDocs(snapshot).filter((item) => inRange(toDate(item.fecha), start, end));
}

async function fetchCatalogMap() {
  const map = {};

  for (const name of ['catalogo', 'servicios']) {
    try {
      const snapshot = await getDocs(collection(db, name));
      snapshot.forEach((item) => {
        const data = item.data();
        map[item.id] = data.nombre || data.servicio || data.titulo || item.id;
      });
      if (snapshot.size) return map;
    } catch {
      // Colección opcional.
    }
  }

  return map;
}

function resolveServiceName(sale, catalog) {
  return (
    sale.servicio ||
    sale.nombreServicio ||
    catalog[sale.idServicio] ||
    sale.idServicio ||
    'Sin clasificar'
  );
}

function buildDailySeries(ventas, now) {
  const lastDay = now.getDate();

  const days = Array.from({ length: lastDay }, (_, index) => ({
    day: index + 1,
    label: String(index + 1),
    total: 0,
  }));

  ventas.forEach((sale) => {
    const date = toDate(sale.fecha);
    if (!date || date.getMonth() !== now.getMonth()) return;
    const bucket = days[date.getDate() - 1];
    if (bucket) bucket.total += toNumber(sale.monto);
  });

  return days;
}

function buildServiceBreakdown(ventas, catalog) {
  const grouped = new Map();

  ventas.forEach((sale) => {
    const name = resolveServiceName(sale, catalog);
    const quantity = toNumber(sale.cantidad) || 1;
    const current = grouped.get(name) || { name, cantidad: 0, monto: 0 };
    current.cantidad += quantity;
    current.monto += toNumber(sale.monto);
    grouped.set(name, current);
  });

  const ranked = [...grouped.values()].sort((a, b) => b.cantidad - a.cantidad);
  const totalServicios = ranked.reduce((sum, item) => sum + item.cantidad, 0);
  const top = ranked.slice(0, 5);
  const rest = ranked.slice(5);
  const restQuantity = rest.reduce((sum, item) => sum + item.cantidad, 0);

  if (restQuantity > 0) {
    top.push({
      name: 'Otros',
      cantidad: restQuantity,
      monto: rest.reduce((sum, item) => sum + item.monto, 0),
    });
  }

  return {
    totalServicios,
    servicios: top.map((item) => ({
      ...item,
      porcentaje: totalServicios ? Math.round((item.cantidad / totalServicios) * 100) : 0,
    })),
  };
}

export async function loadDashboardData(now = new Date(), options = {}) {
  const includeGastos = options.includeGastos !== false;
  const includeAhorro = options.includeAhorro !== false;
  const includeVentas = options.includeVentas !== false;
  const includeCatalog = options.includeCatalog !== false;

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [ventas, gastos, ahorroSnap, catalog] = await Promise.all([
    includeVentas ? fetchMonthDocs('ventas', start, end) : Promise.resolve([]),
    includeGastos ? fetchMonthDocs('gastos', start, end) : Promise.resolve([]),
    includeAhorro ? getDoc(doc(db, 'ahorro', 'main')).catch(() => null) : Promise.resolve(null),
    includeCatalog ? fetchCatalogMap() : Promise.resolve({}),
  ]);

  const totalVentas = ventas.reduce((sum, item) => sum + toNumber(item.monto), 0);
  const totalGastos = gastos.reduce((sum, item) => sum + toNumber(item.monto), 0);
  const ahorroData = ahorroSnap?.exists?.() ? ahorroSnap.data() : {};
  const saldoAhorro = toNumber(ahorroData.saldoActual ?? ahorroData.saldo);
  const { totalServicios, servicios } = buildServiceBreakdown(ventas, catalog);

  return {
    generatedAt: now,
    mesEtiqueta: capitalize(now.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })),
    totalVentas,
    totalGastos,
    balance: totalVentas - totalGastos,
    saldoAhorro,
    totalServicios,
    serieDiaria: buildDailySeries(ventas, now),
    servicios,
    hayMovimientos: ventas.length > 0 || gastos.length > 0,
    hayVentas: ventas.length > 0,
  };
}
