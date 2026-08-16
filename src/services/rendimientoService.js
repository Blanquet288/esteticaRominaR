import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { db } from './firebase';
import {
  emptyAsistenciaResumen,
  fetchAsistenciasByMonth,
  groupAsistenciasByEmpleado,
  summarizeAsistencias,
} from './asistenciasService';
import { toDate, toNumber } from './dashboardService';
import { monthBounds } from './gastosService';
import { toLocalIsoDate } from './ventasService';

function toFechaIso(value) {
  const raw = String(value || '');
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const date = toDate(value);
  return date ? toLocalIsoDate(date) : '';
}

function initials(nombre) {
  const parts = String(nombre || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'E';
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

async function fetchVentasByMonth(year, monthIndex) {
  const { start, end } = monthBounds(year, monthIndex);
  const startDate = new Date(year, monthIndex, 1);
  const endDate = new Date(year, monthIndex + 1, 1);
  const colRef = collection(db, 'ventas');

  const mapDocs = (snapshot) =>
    snapshot.docs.map((item) => {
      const data = item.data();
      return {
        id: item.id,
        fecha: toFechaIso(data.fecha),
        idEmpleado: String(data.idEmpleado || ''),
        servicio: data.servicio || 'Sin clasificar',
        cantidad: Math.max(1, Math.round(toNumber(data.cantidad)) || 1),
        monto: toNumber(data.monto),
        comisionMonto: toNumber(data.comisionMonto),
        utilidadNegocio: toNumber(
          data.utilidadNegocio ?? toNumber(data.monto) - toNumber(data.comisionMonto),
        ),
      };
    });

  try {
    const snapshot = await getDocs(
      query(colRef, where('fecha', '>=', start), where('fecha', '<', end)),
    );
    if (!snapshot.empty) return mapDocs(snapshot);
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
    if (!snapshot.empty) return mapDocs(snapshot);
  } catch {
    // Continúa con filtro local.
  }

  const snapshot = await getDocs(colRef);
  return mapDocs(snapshot).filter((item) => item.fecha >= start && item.fecha < end);
}

function emptyStaff(empleado) {
  return {
    id: empleado.id,
    nombre: empleado.nombre || 'Sin nombre',
    rol: empleado.rol || 'Estilista',
    telefono: empleado.telefono || '',
    inicial: initials(empleado.nombre),
    bruto: 0,
    comision: 0,
    utilidad: 0,
    servicios: 0,
    estrella: null,
    desglose: [],
    ...emptyAsistenciaResumen(),
  };
}

function buildDesglose(ventas) {
  const grouped = new Map();

  ventas.forEach((sale) => {
    const name = sale.servicio || 'Sin clasificar';
    const current = grouped.get(name) || { name, cantidad: 0, monto: 0, comision: 0 };
    current.cantidad += sale.cantidad;
    current.monto += sale.monto;
    current.comision += sale.comisionMonto;
    grouped.set(name, current);
  });

  return [...grouped.values()].sort((a, b) => b.cantidad - a.cantidad || b.monto - a.monto);
}

export async function loadRendimientoMes(year, monthIndex) {
  const [empleadosSnap, ventas, asistencias] = await Promise.all([
    getDocs(collection(db, 'empleados')),
    fetchVentasByMonth(year, monthIndex),
    fetchAsistenciasByMonth(year, monthIndex),
  ]);
  const asistenciasByEmp = groupAsistenciasByEmpleado(asistencias);

  const empleados = empleadosSnap.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter((item) => item.activo !== false)
    .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'));

  const byStaff = new Map(empleados.map((item) => [item.id, emptyStaff(item)]));

  ventas.forEach((sale) => {
    const id = sale.idEmpleado || '__sin_asignar__';
    if (!byStaff.has(id)) {
      byStaff.set(
        id,
        emptyStaff({
          id,
          nombre: id === '__sin_asignar__' ? 'Sin asignar' : 'Empleada',
          rol: '—',
        }),
      );
    }

    const row = byStaff.get(id);
    row.bruto += sale.monto;
    row.comision += sale.comisionMonto;
    row.utilidad += sale.utilidadNegocio;
    row.servicios += sale.cantidad;
    row._ventas = row._ventas || [];
    row._ventas.push(sale);
  });

  const staff = [...byStaff.values()].map((row) => {
    const desglose = buildDesglose(row._ventas || []);
    const porCantidad = [...desglose].sort((a, b) => b.cantidad - a.cantidad)[0] || null;
    const resumen = summarizeAsistencias(asistenciasByEmp.get(row.id) || []);
    delete row._ventas;
    return {
      ...row,
      ...resumen,
      desglose,
      estrella: porCantidad
        ? { name: porCantidad.name, cantidad: porCantidad.cantidad, monto: porCantidad.monto }
        : null,
    };
  });

  const withSales = staff.filter((item) => item.servicios > 0);
  const ranked = [...withSales].sort((a, b) => b.bruto - a.bruto);
  const withoutSales = staff.filter((item) => item.servicios === 0);

  const totals = ranked.reduce(
    (acc, item) => ({
      bruto: acc.bruto + item.bruto,
      comision: acc.comision + item.comision,
      utilidad: acc.utilidad + item.utilidad,
      servicios: acc.servicios + item.servicios,
    }),
    { bruto: 0, comision: 0, utilidad: 0, servicios: 0 },
  );

  return {
    staff: [...ranked, ...withoutSales],
    totals,
    hayVentas: ranked.length > 0,
  };
}
