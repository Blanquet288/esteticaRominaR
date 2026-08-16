import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { toDate, toNumber } from './dashboardService';
import { roundMoney, toLocalIsoDate } from './ventasService';

export const GASTO_CATEGORIAS = ['Fijo', 'Operativo'];

export function weekFromDate(fechaIso) {
  const day = Number(String(fechaIso).split('-')[2] || 1);
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

export function monthBounds(year, monthIndex) {
  const start = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
  const next = new Date(year, monthIndex + 1, 1);
  const end = toLocalIsoDate(next);
  return { start, end };
}

export function monthLabel(year, monthIndex) {
  const date = new Date(year, monthIndex, 1);
  const month = date.toLocaleDateString('es-MX', { month: 'long' });
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${year}`;
}

function normalizeCategoria(value) {
  const raw = String(value || '').toLowerCase();
  return raw === 'fijo' || raw === 'fixed' ? 'Fijo' : 'Operativo';
}

function toFechaIso(value) {
  const raw = String(value || '');
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const date = toDate(value);
  return date ? toLocalIsoDate(date) : '';
}

function mapGasto(item) {
  const data = item.data();
  return {
    id: item.id,
    fecha: toFechaIso(data.fecha),
    concepto: data.concepto || '',
    monto: toNumber(data.monto),
    categoria: normalizeCategoria(data.categoria),
    semanaAsignada: Math.min(4, Math.max(1, Number(data.semanaAsignada) || 1)),
  };
}

function sortByFechaDesc(rows) {
  return rows.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
}

export async function fetchGastosByMonth(year, monthIndex) {
  const { start, end } = monthBounds(year, monthIndex);
  const startDate = new Date(year, monthIndex, 1);
  const endDate = new Date(year, monthIndex + 1, 1);
  const colRef = collection(db, 'gastos');

  try {
    const snapshot = await getDocs(
      query(colRef, where('fecha', '>=', start), where('fecha', '<', end)),
    );
    if (!snapshot.empty) return sortByFechaDesc(snapshot.docs.map(mapGasto));
  } catch {
    // Índice o tipo de `fecha` distinto; prueba Timestamp o filtro local.
  }

  try {
    const snapshot = await getDocs(
      query(
        colRef,
        where('fecha', '>=', Timestamp.fromDate(startDate)),
        where('fecha', '<', Timestamp.fromDate(endDate)),
      ),
    );
    if (!snapshot.empty) return sortByFechaDesc(snapshot.docs.map(mapGasto));
  } catch {
    // Continúa con filtro en cliente.
  }

  const snapshot = await getDocs(colRef);
  return sortByFechaDesc(
    snapshot.docs
      .map(mapGasto)
      .filter((item) => item.fecha >= start && item.fecha < end),
  );
}

export function summarizeGastos(gastos) {
  const weeks = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let fijos = 0;
  let operativos = 0;

  gastos.forEach((item) => {
    const amount = toNumber(item.monto);
    if (item.categoria === 'Fijo') fijos += amount;
    else operativos += amount;
    weeks[item.semanaAsignada] += amount;
  });

  return {
    total: fijos + operativos,
    fijos,
    operativos,
    weeks,
  };
}

export async function createGasto(payload) {
  const ref = await addDoc(collection(db, 'gastos'), {
    fecha: payload.fecha,
    concepto: payload.concepto.trim(),
    monto: roundMoney(payload.monto),
    categoria: normalizeCategoria(payload.categoria),
    semanaAsignada: Number(payload.semanaAsignada),
  });
  return ref.id;
}

export async function updateGasto(id, payload) {
  await updateDoc(doc(db, 'gastos', id), {
    fecha: payload.fecha,
    concepto: payload.concepto.trim(),
    monto: roundMoney(payload.monto),
    categoria: normalizeCategoria(payload.categoria),
    semanaAsignada: Number(payload.semanaAsignada),
  });
}

export async function deleteGasto(id) {
  await deleteDoc(doc(db, 'gastos', id));
}
