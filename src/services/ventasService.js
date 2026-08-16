import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { toDate, toNumber } from './dashboardService';
import { normalizarTipoComisionServicio } from '../utils/helpers';

const DAY_KEYS = {
  0: ['domingo', 'dom', 'sunday', 'sun', '0'],
  1: ['lunes', 'lun', 'monday', 'mon', '1'],
  2: ['martes', 'mar', 'tuesday', 'tue', '2'],
  3: ['miercoles', 'miércoles', 'mie', 'wednesday', 'wed', '3'],
  4: ['jueves', 'jue', 'thursday', 'thu', '4'],
  5: ['viernes', 'vie', 'friday', 'fri', '5'],
  6: ['sabado', 'sábado', 'sab', 'saturday', 'sat', '6'],
};

export function toLocalIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalIsoDate(value) {
  const [year, month, day] = String(value || '').split('-').map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

export function roundMoney(value) {
  return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
}

export function normalizeCommissionType(value) {
  return normalizarTipoComisionServicio(value);
}

export function congelarComisionVenta({
  monto,
  cantidad = 1,
  tipoComision = 'porcentaje',
  comisionDefecto = 0,
}) {
  const tipo = normalizarTipoComisionServicio(tipoComision);
  const qty = Math.max(1, Math.round(toNumber(cantidad)) || 1);
  const total = roundMoney(monto);
  const defecto = toNumber(comisionDefecto);
  const comisionMonto =
    tipo === 'monto_fijo'
      ? roundMoney(defecto * qty)
      : roundMoney((total * defecto) / 100);
  const comisionPct =
    tipo === 'monto_fijo'
      ? total > 0
        ? Math.round((comisionMonto / total) * 10000) / 100
        : 0
      : defecto;

  return {
    comisionTipo: tipo,
    comisionPct,
    comisionMonto,
    utilidadNegocio: roundMoney(total - comisionMonto),
  };
}

export function computeLine({
  cantidad = 1,
  precioUnitario = 0,
  comisionTipo = 'porcentaje',
  comisionPct = 0,
  comisionUnitaria = 0,
}) {
  const qty = Math.max(1, Math.round(toNumber(cantidad)) || 1);
  const unit = roundMoney(precioUnitario);
  const monto = roundMoney(unit * qty);
  const tipo = normalizarTipoComisionServicio(comisionTipo);
  const defecto = tipo === 'monto_fijo' ? comisionUnitaria : comisionPct;
  const frozen = congelarComisionVenta({
    monto,
    cantidad: qty,
    tipoComision: tipo,
    comisionDefecto: defecto,
  });

  return {
    cantidad: qty,
    precioUnitario: unit,
    monto,
    comisionTipo: frozen.comisionTipo,
    comisionPct: frozen.comisionPct,
    comisionUnitaria: tipo === 'monto_fijo' ? roundMoney(comisionUnitaria) : 0,
    comisionMonto: frozen.comisionMonto,
    utilidadNegocio: frozen.utilidadNegocio,
  };
}

export function resolveTurnoFromHorario(horarioSemanal, fechaIso) {
  const date = parseLocalIsoDate(fechaIso);
  const day = date.getDay();

  if (!horarioSemanal) {
    return { turnoId: '', isDescanso: false };
  }

  if (Array.isArray(horarioSemanal)) {
    return normalizeTurnoValue(horarioSemanal[day]);
  }

  for (const key of DAY_KEYS[day]) {
    if (horarioSemanal[key] !== undefined && horarioSemanal[key] !== null) {
      return normalizeTurnoValue(horarioSemanal[key]);
    }
  }

  return { turnoId: '', isDescanso: false };
}

function normalizeTurnoValue(value) {
  if (value && typeof value === 'object') {
    const turnoId = String(value.turnoId || value.id || '');
    return {
      turnoId,
      isDescanso: turnoId === '__descanso__' || value.descanso === true,
    };
  }

  const turnoId = String(value || '');
  const isDescanso =
    turnoId === '__descanso__' || turnoId.toLowerCase() === 'descanso';

  return { turnoId: isDescanso ? '' : turnoId, isDescanso };
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
    if (typeof value === 'string') {
      map[id] = value;
      return;
    }
    if (value && typeof value === 'object') {
      const turnoId = String(value.id || value.turnoId || id);
      map[turnoId] = value.nombre || value.turnoNombre || value.label || turnoId;
    }
  });

  return map;
}

export async function loadVentasSetup() {
  const [empleadosSnap, turnosSnap, catalogoSnap] = await Promise.all([
    getDocs(collection(db, 'empleados')),
    getDoc(doc(db, 'config', 'turnos')).catch(() => null),
    getDocs(collection(db, 'catalogo')),
  ]);

  const empleados = empleadosSnap.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter((item) => item.activo !== false)
    .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'));

  const turnos = parseTurnosDocument(turnosSnap?.exists?.() ? turnosSnap.data() : {});

  const catalogo = catalogoSnap.docs
    .map((item) => {
      const data = item.data();
      return {
        id: item.id,
        nombre: data.nombre || data.servicio || data.titulo || 'Servicio',
        precioBase: toNumber(data.precioBase),
        comisionDefecto: toNumber(data.comisionDefecto),
        tipoComision: normalizarTipoComisionServicio(data.tipoComision),
        categoria: data.categoria || 'General',
        imagen: data.imagen || data.foto || data.imageUrl || '',
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  return { empleados, turnos, catalogo };
}

export function createDraftFromServicio(servicio) {
  const tipo = normalizarTipoComisionServicio(servicio.tipoComision);
  const defecto = toNumber(servicio.comisionDefecto);

  return {
    servicio,
    cantidad: 1,
    precioUnitario: toNumber(servicio.precioBase),
    comisionTipo: tipo,
    comisionPct: tipo === 'porcentaje' ? defecto : 0,
    comisionUnitaria: tipo === 'monto_fijo' ? defecto : 0,
  };
}

export function previewDraft(draft) {
  return computeLine(draft);
}

export function createCorteItem(servicio, draft = {}) {
  const tipo = normalizarTipoComisionServicio(draft.comisionTipo || servicio.tipoComision);
  const computed = computeLine({
    cantidad: draft.cantidad ?? 1,
    precioUnitario: draft.precioUnitario ?? servicio.precioBase,
    comisionTipo: tipo,
    comisionPct: draft.comisionPct ?? (tipo === 'porcentaje' ? servicio.comisionDefecto : 0),
    comisionUnitaria:
      draft.comisionUnitaria ?? (tipo === 'monto_fijo' ? servicio.comisionDefecto : 0),
  });

  return {
    localId: crypto.randomUUID(),
    idServicio: servicio.id,
    servicio: servicio.nombre,
    categoria: servicio.categoria,
    ...computed,
  };
}

export async function saveCorteDiario({
  fecha,
  idEmpleado,
  turnoId,
  turnoNombre,
  items,
}) {
  const batch = writeBatch(db);

  items.forEach((item) => {
    const frozen = computeLine(item);
    const ref = doc(collection(db, 'ventas'));
    batch.set(ref, {
      fecha,
      idEmpleado,
      servicio: item.servicio,
      idServicio: item.idServicio,
      cantidad: frozen.cantidad,
      monto: frozen.monto,
      comisionTipo: frozen.comisionTipo,
      comisionPct: frozen.comisionPct,
      comisionMonto: frozen.comisionMonto,
      utilidadNegocio: frozen.utilidadNegocio,
      turnoId,
      turnoNombre,
      ts: serverTimestamp(),
    });
  });

  await batch.commit();
}

export async function saveHistoricoDiario({
  fecha,
  idEmpleado,
  turnoId,
  turnoNombre,
  montoTotal,
  comisionMonto,
}) {
  const monto = roundMoney(montoTotal);
  const comision = roundMoney(comisionMonto);

  await addDoc(collection(db, 'ventas'), {
    fecha,
    idEmpleado,
    servicio: 'Histórico Diario',
    idServicio: '',
    cantidad: 1,
    monto,
    montoEsBruto: true,
    tipo: 'historico_diario',
    comisionTipo: 'monto_fijo',
    comisionPct: 0,
    comisionMonto: comision,
    utilidadNegocio: roundMoney(monto - comision),
    turnoId,
    turnoNombre,
    ts: serverTimestamp(),
  });
}

function toFechaIso(value) {
  const raw = String(value || '');
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const date = toDate(value);
  return date ? toLocalIsoDate(date) : '';
}

function capitalize(value) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatDiaHistorial(fechaIso) {
  const date = parseLocalIsoDate(fechaIso);
  const weekday = date.toLocaleDateString('es-MX', { weekday: 'long' });
  const month = date.toLocaleDateString('es-MX', { month: 'long' });
  return `${capitalize(weekday)} ${date.getDate()} de ${capitalize(month)}`;
}

export function formatDiaCorto(fechaIso) {
  const date = parseLocalIsoDate(fechaIso);
  const weekday = date.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '');
  const month = date.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '');
  return `${capitalize(weekday)} ${String(date.getDate()).padStart(2, '0')} ${capitalize(month)}`;
}

function mapVentaHistorial(item) {
  const data = item.data();
  const tipo = String(data.tipo || '').toLowerCase();
  return {
    id: item.id,
    fecha: toFechaIso(data.fecha),
    idEmpleado: String(data.idEmpleado || ''),
    servicio: data.servicio || 'Sin clasificar',
    idServicio: data.idServicio || '',
    cantidad: Math.max(1, Math.round(toNumber(data.cantidad)) || 1),
    monto: toNumber(data.monto),
    comisionMonto: toNumber(data.comisionMonto),
    utilidadNegocio: toNumber(
      data.utilidadNegocio ?? toNumber(data.monto) - toNumber(data.comisionMonto),
    ),
    turnoId: data.turnoId || '',
    turnoNombre: data.turnoNombre || '',
    tipo,
    esHistorico: tipo === 'historico_diario' || data.montoEsBruto === true,
  };
}

export async function fetchVentasHistorial(year, monthIndex) {
  const start = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
  const end = toLocalIsoDate(new Date(year, monthIndex + 1, 1));
  const startDate = new Date(year, monthIndex, 1);
  const endDate = new Date(year, monthIndex + 1, 1);
  const colRef = collection(db, 'ventas');

  const sortDesc = (rows) =>
    rows.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || b.id.localeCompare(a.id));

  try {
    const snapshot = await getDocs(
      query(colRef, where('fecha', '>=', start), where('fecha', '<', end)),
    );
    if (!snapshot.empty) return sortDesc(snapshot.docs.map(mapVentaHistorial));
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
    if (!snapshot.empty) return sortDesc(snapshot.docs.map(mapVentaHistorial));
  } catch {
    // Continúa con filtro local.
  }

  const snapshot = await getDocs(colRef);
  return sortDesc(
    snapshot.docs
      .map(mapVentaHistorial)
      .filter((item) => item.fecha >= start && item.fecha < end),
  );
}

export async function fetchEmpleadosMap() {
  const snapshot = await getDocs(collection(db, 'empleados'));
  const map = {};
  snapshot.forEach((item) => {
    const data = item.data();
    map[item.id] = {
      id: item.id,
      nombre: data.nombre || 'Empleada',
      rol: data.rol || '',
    };
  });
  return map;
}

export function groupVentasByDay(ventas, empleados) {
  const days = new Map();

  ventas.forEach((venta) => {
    if (!days.has(venta.fecha)) {
      days.set(venta.fecha, {
        fecha: venta.fecha,
        label: formatDiaHistorial(venta.fecha),
        total: 0,
        groups: new Map(),
      });
    }

    const day = days.get(venta.fecha);
    day.total += venta.monto;
    const groupKey = `${venta.idEmpleado}::${venta.turnoId || venta.turnoNombre || 'sin-turno'}`;

    if (!day.groups.has(groupKey)) {
      const empleado = empleados[venta.idEmpleado];
      day.groups.set(groupKey, {
        key: groupKey,
        idEmpleado: venta.idEmpleado,
        nombre: empleado?.nombre || 'Sin asignar',
        rol: empleado?.rol || '',
        turnoNombre: venta.turnoNombre || 'Sin turno',
        items: [],
        bruto: 0,
        comision: 0,
        utilidad: 0,
      });
    }

    const group = day.groups.get(groupKey);
    group.items.push(venta);
    group.bruto += venta.monto;
    group.comision += venta.comisionMonto;
    group.utilidad += venta.utilidadNegocio;
  });

  return [...days.values()]
    .map((day) => ({
      ...day,
      colaboradoras: day.groups.size,
      groups: [...day.groups.values()].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, 'es'),
      ),
    }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export async function updateVenta(id, payload) {
  const monto = roundMoney(payload.monto);
  const comision = roundMoney(payload.comisionMonto);
  await updateDoc(doc(db, 'ventas', id), {
    fecha: payload.fecha,
    servicio: String(payload.servicio || '').trim(),
    cantidad: Math.max(1, Math.round(toNumber(payload.cantidad)) || 1),
    monto,
    comisionMonto: comision,
    utilidadNegocio: roundMoney(monto - comision),
  });
}

export async function deleteVenta(id) {
  await deleteDoc(doc(db, 'ventas', id));
}
