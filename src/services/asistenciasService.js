import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from './firebase';

export const TIPOS_ASISTENCIA = [
  { id: 'falta', label: 'Falta' },
  { id: 'permiso', label: 'Permiso' },
  { id: 'retardo', label: 'Retardo' },
];

export function monthKeyFromFecha(fecha) {
  return String(fecha || '').slice(0, 7);
}

export function emptyAsistenciaResumen() {
  return { faltas: 0, permisos: 0, retardos: 0, inasistencias: 0, total: 0 };
}

export function summarizeAsistencias(rows) {
  return rows.reduce((acc, item) => {
    if (item.tipo === 'falta') acc.faltas += 1;
    if (item.tipo === 'permiso') acc.permisos += 1;
    if (item.tipo === 'retardo') acc.retardos += 1;
    if (item.tipo === 'falta' || item.tipo === 'permiso') acc.inasistencias += 1;
    acc.total += 1;
    return acc;
  }, emptyAsistenciaResumen());
}

function mapAsistencia(item) {
  const data = item.data();
  return {
    id: item.id,
    fecha: String(data.fecha || '').slice(0, 10),
    idEmpleado: String(data.idEmpleado || ''),
    tipo: data.tipo === 'permiso' || data.tipo === 'retardo' ? data.tipo : 'falta',
    motivo: data.motivo || '',
    mes: data.mes || monthKeyFromFecha(data.fecha),
  };
}

export async function registrarAsistencia({ fecha, idEmpleado, tipo, motivo }) {
  const fechaIso = String(fecha || '').slice(0, 10);
  await addDoc(collection(db, 'asistencias'), {
    fecha: fechaIso,
    idEmpleado: String(idEmpleado || ''),
    tipo: tipo === 'permiso' || tipo === 'retardo' ? tipo : 'falta',
    motivo: String(motivo || '').trim(),
    mes: monthKeyFromFecha(fechaIso),
    ts: serverTimestamp(),
  });
}

export async function eliminarAsistencia(id) {
  await deleteDoc(doc(db, 'asistencias', id));
}

export async function fetchAsistenciasByMonth(year, monthIndex) {
  const mes = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  const colRef = collection(db, 'asistencias');

  try {
    const snapshot = await getDocs(query(colRef, where('mes', '==', mes)));
    if (!snapshot.empty) return snapshot.docs.map(mapAsistencia);
  } catch {
    // Índice o campo ausente; filtra en cliente.
  }

  const snapshot = await getDocs(colRef);
  return snapshot.docs.map(mapAsistencia).filter((item) => item.mes === mes);
}

export function groupAsistenciasByEmpleado(rows) {
  const map = new Map();
  rows.forEach((item) => {
    const list = map.get(item.idEmpleado) || [];
    list.push(item);
    map.set(item.idEmpleado, list);
  });
  return map;
}
