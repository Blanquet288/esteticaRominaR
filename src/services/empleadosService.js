import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { toNumber } from './dashboardService';
import { roundMoney } from './ventasService';

export const ROLES_EMPLEADO = ['Estilista', 'Manicurista', 'Auxiliar', 'Administrador'];

export const DIAS_SEMANA = [
  { key: 'lunes', label: 'Lunes', short: 'Lun' },
  { key: 'martes', label: 'Martes', short: 'Mar' },
  { key: 'miercoles', label: 'Miércoles', short: 'Mié' },
  { key: 'jueves', label: 'Jueves', short: 'Jue' },
  { key: 'viernes', label: 'Viernes', short: 'Vie' },
  { key: 'sabado', label: 'Sábado', short: 'Sáb' },
  { key: 'domingo', label: 'Domingo', short: 'Dom' },
];

const DAY_ALIASES = {
  lunes: ['lunes', 'lun', 'monday', 'mon', '1'],
  martes: ['martes', 'mar', 'tuesday', 'tue', '2'],
  miercoles: ['miercoles', 'miércoles', 'mie', 'wednesday', 'wed', '3'],
  jueves: ['jueves', 'jue', 'thursday', 'thu', '4'],
  viernes: ['viernes', 'vie', 'friday', 'fri', '5'],
  sabado: ['sabado', 'sábado', 'sab', 'saturday', 'sat', '6'],
  domingo: ['domingo', 'dom', 'sunday', 'sun', '0'],
};

export const DESCANSO_ID = '__descanso__';

export function horarioVacio() {
  return {
    lunes: DESCANSO_ID,
    martes: DESCANSO_ID,
    miercoles: DESCANSO_ID,
    jueves: DESCANSO_ID,
    viernes: DESCANSO_ID,
    sabado: DESCANSO_ID,
    domingo: DESCANSO_ID,
  };
}

function normalizeRol(value) {
  const match = ROLES_EMPLEADO.find(
    (rol) => rol.toLowerCase() === String(value || '').toLowerCase(),
  );
  return match || 'Estilista';
}

function normalizeTurnoId(value) {
  if (value && typeof value === 'object') {
    const turnoId = String(value.turnoId || value.id || '');
    if (value.descanso === true || turnoId === DESCANSO_ID) return DESCANSO_ID;
    return turnoId || DESCANSO_ID;
  }

  const turnoId = String(value || '').trim();
  if (!turnoId || turnoId.toLowerCase() === 'descanso' || turnoId === DESCANSO_ID) {
    return DESCANSO_ID;
  }
  return turnoId;
}

export function normalizeHorario(raw) {
  const horario = horarioVacio();
  if (!raw) return horario;

  if (Array.isArray(raw)) {
    const order = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    order.forEach((key, index) => {
      horario[key] = normalizeTurnoId(raw[index]);
    });
    return horario;
  }

  DIAS_SEMANA.forEach(({ key }) => {
    for (const alias of DAY_ALIASES[key]) {
      if (raw[alias] !== undefined && raw[alias] !== null) {
        horario[key] = normalizeTurnoId(raw[alias]);
        break;
      }
    }
  });

  return horario;
}

function parseTurnosDocument(data) {
  const map = {};
  if (!data) return map;

  const source = Array.isArray(data.lista)
    ? Object.fromEntries(data.lista.map((item) => [item.id || item.turnoId, item]))
    : data.turnos || data.items || data;

  Object.entries(source).forEach(([id, value]) => {
    if (['updatedAt', 'createdAt', 'ts', 'id', 'lista', 'turnos', 'items'].includes(id)) {
      return;
    }
    if (id === DESCANSO_ID) return;
    if (typeof value === 'string') {
      map[id] = value;
      return;
    }
    if (value && typeof value === 'object') {
      const turnoId = String(value.id || value.turnoId || id);
      if (turnoId === DESCANSO_ID) return;
      map[turnoId] = value.nombre || value.turnoNombre || value.label || turnoId;
    }
  });

  return map;
}

function mapEmpleado(item) {
  const data = item.data();
  return {
    id: item.id,
    nombre: data.nombre || '',
    rol: normalizeRol(data.rol),
    telefono: data.telefono || '',
    direccion: data.direccion || '',
    comisionDefecto: toNumber(data.comisionDefecto),
    horarioSemanal: normalizeHorario(data.horarioSemanal),
  };
}

function payloadFromForm(data) {
  return {
    nombre: String(data.nombre || '').trim(),
    rol: normalizeRol(data.rol),
    telefono: String(data.telefono || '').trim(),
    direccion: String(data.direccion || '').trim(),
    comisionDefecto: roundMoney(Number(data.comisionDefecto) || 0),
    horarioSemanal: normalizeHorario(data.horarioSemanal),
  };
}

export function turnoLabel(turnoId, turnos) {
  if (!turnoId || turnoId === DESCANSO_ID) return 'Descanso';
  return turnos[turnoId] || turnoId;
}

export function resumenHorario(horario, turnos) {
  const groups = [];

  DIAS_SEMANA.forEach((day) => {
    const value = horario?.[day.key] || DESCANSO_ID;
    const last = groups[groups.length - 1];
    if (last && last.value === value) {
      last.end = day.short;
      return;
    }
    groups.push({ start: day.short, end: day.short, value });
  });

  return groups.map((group) => ({
    label: group.start === group.end ? group.start : `${group.start}–${group.end}`,
    turno: turnoLabel(group.value, turnos),
    isDescanso: group.value === DESCANSO_ID,
  }));
}

export function telefonoHref(telefono) {
  const digits = String(telefono || '').replace(/\D/g, '');
  return digits ? `tel:+${digits.length === 10 ? `52${digits}` : digits}` : '';
}

export function whatsappHref(telefono) {
  const digits = String(telefono || '').replace(/\D/g, '');
  if (!digits) return '';
  const full = digits.length === 10 ? `52${digits}` : digits;
  return `https://wa.me/${full}`;
}

export async function obtenerTurnos() {
  try {
    const snap = await getDoc(doc(db, 'config', 'turnos'));
    return parseTurnosDocument(snap.exists() ? snap.data() : {});
  } catch {
    return {};
  }
}

export function obtenerEmpleados(onData, onError) {
  return onSnapshot(
    collection(db, 'empleados'),
    (snapshot) => {
      const rows = snapshot.docs
        .map(mapEmpleado)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      onData(rows);
    },
    (cause) => onError?.(cause),
  );
}

export async function crearEmpleado(data) {
  const ref = await addDoc(collection(db, 'empleados'), payloadFromForm(data));
  return ref.id;
}

export async function actualizarEmpleado(id, data) {
  await updateDoc(doc(db, 'empleados', id), payloadFromForm(data));
}

export async function eliminarEmpleado(id) {
  await deleteDoc(doc(db, 'empleados', id));
}
