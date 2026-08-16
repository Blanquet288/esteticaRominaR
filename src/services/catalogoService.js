import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { toNumber } from './dashboardService';
import { normalizeCommissionType, roundMoney } from './ventasService';

export const CATEGORIAS_COMUNES = [
  'Cortes',
  'Tintes',
  'Uñas',
  'Tratamientos',
  'Peinados',
  'Depilación',
  'Maquillaje',
  'General',
];

function mapServicio(item) {
  const data = item.data();
  return {
    id: item.id,
    nombre: data.nombre || data.servicio || data.titulo || 'Servicio',
    precioBase: toNumber(data.precioBase),
    comisionDefecto: toNumber(data.comisionDefecto),
    tipoComision: normalizeCommissionType(data.tipoComision),
    categoria: data.categoria || 'General',
    imagen: data.imagen || data.foto || data.imageUrl || '',
  };
}

function payloadFromForm(data) {
  return {
    nombre: String(data.nombre || '').trim(),
    precioBase: roundMoney(Number(data.precioBase)),
    comisionDefecto: roundMoney(Number(data.comisionDefecto)),
    tipoComision: normalizeCommissionType(data.tipoComision),
    categoria: String(data.categoria || 'General').trim() || 'General',
    imagen: String(data.imagen || '').trim(),
  };
}

export function obtenerServicios(onData, onError) {
  return onSnapshot(
    collection(db, 'catalogo'),
    (snapshot) => {
      const rows = snapshot.docs
        .map(mapServicio)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      onData(rows);
    },
    (cause) => {
      onError?.(cause);
    },
  );
}

export async function crearServicio(data) {
  const payload = payloadFromForm(data);
  const ref = await addDoc(collection(db, 'catalogo'), payload);
  return ref.id;
}

export async function actualizarServicio(id, data) {
  await updateDoc(doc(db, 'catalogo', id), payloadFromForm(data));
}

export async function eliminarServicio(id) {
  await deleteDoc(doc(db, 'catalogo', id));
}
