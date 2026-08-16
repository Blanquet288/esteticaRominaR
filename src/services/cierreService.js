import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { loadConfigMain } from './configService';
import { toNumber } from './dashboardService';
import { fetchGastosByMonth, monthLabel, weekFromDate } from './gastosService';
import {
  fetchEmpleadosMap,
  fetchVentasHistorial,
  formatDiaHistorial,
  roundMoney,
} from './ventasService';

export { loadConfigMain as fetchConfigMain };

export const WEEK_RANGES = [
  { semana: 1, rango: 'Día 1 al 7' },
  { semana: 2, rango: 'Día 8 al 14' },
  { semana: 3, rango: 'Día 15 al 21' },
  { semana: 4, rango: 'Día 22 al fin de mes' },
];

export function monthDocParts(year, monthIndex) {
  const mes = String(monthIndex + 1).padStart(2, '0');
  return { anio: year, mes, id: `${year}-${mes}` };
}

function emptyWeek(meta) {
  return {
    semana: meta.semana,
    rango: meta.rango,
    ventas: 0,
    comisiones: 0,
    neto: 0,
    gastos: 0,
    balance: 0,
  };
}

export function computeCierreBase({ ventas, gastos, empleados }) {
  const weeks = WEEK_RANGES.map(emptyWeek);
  const byEmployee = new Map();
  const byDay = new Map();
  let ventasBrutas = 0;
  let comisionesPagadas = 0;
  let gastosFijos = 0;
  let gastosOperativos = 0;

  ventas.forEach((venta) => {
    const monto = roundMoney(venta.monto);
    const comision = roundMoney(venta.comisionMonto);
    const utilidad = roundMoney(
      venta.utilidadNegocio ?? monto - comision,
    );
    const weekIndex = weekFromDate(venta.fecha) - 1;
    const week = weeks[weekIndex];
    week.ventas = roundMoney(week.ventas + monto);
    week.comisiones = roundMoney(week.comisiones + comision);

    ventasBrutas += monto;
    comisionesPagadas += comision;

    const employeeId = venta.idEmpleado || 'sin-asignar';
    if (!byEmployee.has(employeeId)) {
      const person = empleados[employeeId];
      byEmployee.set(employeeId, {
        idEmpleado: employeeId,
        nombre: person?.nombre || 'Sin asignar',
        totalGenerado: 0,
        comisionTotal: 0,
        utilidadAportada: 0,
      });
    }
    const employee = byEmployee.get(employeeId);
    employee.totalGenerado = roundMoney(employee.totalGenerado + monto);
    employee.comisionTotal = roundMoney(employee.comisionTotal + comision);
    employee.utilidadAportada = roundMoney(employee.utilidadAportada + utilidad);

    if (!byDay.has(venta.fecha)) {
      byDay.set(venta.fecha, {
        fecha: venta.fecha,
        label: formatDiaHistorial(venta.fecha),
        rows: new Map(),
      });
    }
    const day = byDay.get(venta.fecha);
    if (!day.rows.has(employeeId)) {
      day.rows.set(employeeId, {
        idEmpleado: employeeId,
        nombre: employee.nombre,
        generado: 0,
        comision: 0,
        utilidad: 0,
      });
    }
    const row = day.rows.get(employeeId);
    row.generado = roundMoney(row.generado + monto);
    row.comision = roundMoney(row.comision + comision);
    row.utilidad = roundMoney(row.utilidad + utilidad);
  });

  gastos.forEach((gasto) => {
    const amount = roundMoney(gasto.monto);
    const week = weeks[(gasto.semanaAsignada || 1) - 1];
    week.gastos = roundMoney(week.gastos + amount);
    if (gasto.categoria === 'Fijo') gastosFijos += amount;
    else gastosOperativos += amount;
  });

  weeks.forEach((week) => {
    week.neto = roundMoney(week.ventas - week.comisiones);
    week.balance = roundMoney(week.neto - week.gastos);
  });

  const netoNegocio = roundMoney(ventasBrutas - comisionesPagadas);
  const totalGastos = roundMoney(gastosFijos + gastosOperativos);

  return {
    cuadrePorSemana: weeks,
    desgloseEmpleados: [...byEmployee.values()].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es'),
    ),
    dias: [...byDay.values()]
      .map((day) => ({
        ...day,
        rows: [...day.rows.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
      }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    gastos: [...gastos].sort(
      (a, b) =>
        String(a.categoria).localeCompare(String(b.categoria), 'es') ||
        String(a.fecha).localeCompare(String(b.fecha)),
    ),
    baseTotales: {
      ventasBrutas: roundMoney(ventasBrutas),
      comisionesPagadas: roundMoney(comisionesPagadas),
      netoNegocio,
      gastosFijos: roundMoney(gastosFijos),
      gastosOperativos: roundMoney(gastosOperativos),
      totalGastos,
    },
  };
}

export function buildReparto(utilidadNeta, modalidad, names) {
  const pot = roundMoney(utilidadNeta);
  const socio1Nombre = names.socio1 || 'Socio 1';
  const socio2Nombre = names.socio2 || 'Socio 2';

  if (modalidad === '1_socio') {
    return {
      modalidad: '1_socio',
      socio1: { nombre: socio1Nombre, monto: pot },
      socio2: { nombre: socio2Nombre, monto: 0 },
    };
  }

  const half = roundMoney(pot / 2);
  return {
    modalidad: '2_socios',
    socio1: { nombre: socio1Nombre, monto: half },
    socio2: { nombre: socio2Nombre, monto: roundMoney(pot - half) },
  };
}

export function finalizeCierre({
  base,
  fondoAhorro,
  modalidad,
  names,
  incluirDetalleDiasEnReporte,
}) {
  const ahorro = Math.max(0, roundMoney(fondoAhorro));
  const utilidadNeta = roundMoney(base.baseTotales.netoNegocio - base.baseTotales.totalGastos - ahorro);
  const totales = {
    ...base.baseTotales,
    utilidadNeta,
    fondoAhorro: ahorro,
    totalReparto: utilidadNeta,
  };

  return {
    totales,
    cuadrePorSemana: base.cuadrePorSemana,
    desgloseEmpleados: base.desgloseEmpleados,
    dias: base.dias,
    gastos: base.gastos || [],
    reparto: buildReparto(utilidadNeta, modalidad, names),
    incluirDetalleDiasEnReporte: Boolean(incluirDetalleDiasEnReporte),
  };
}

export async function loadCierreMes(year, monthIndex) {
  const { anio, mes, id } = monthDocParts(year, monthIndex);
  const [ventas, gastos, empleados, config, savedSnap] = await Promise.all([
    fetchVentasHistorial(year, monthIndex),
    fetchGastosByMonth(year, monthIndex),
    fetchEmpleadosMap(),
    loadConfigMain(),
    getDoc(doc(db, 'cierres_mensuales', id)),
  ]);

  const saved = savedSnap.exists() ? savedSnap.data() : null;
  const base = computeCierreBase({ ventas, gastos, empleados });

  return {
    anio,
    mes,
    id,
    label: monthLabel(year, monthIndex),
    config,
    saved,
    base,
    hayMovimientos: ventas.length > 0 || gastos.length > 0,
  };
}

export async function saveCierreMensual({
  year,
  monthIndex,
  snapshot,
  extras = {},
}) {
  const { anio, mes, id } = monthDocParts(year, monthIndex);
  const payload = {
    mes,
    anio,
    totales: snapshot.totales,
    cuadrePorSemana: snapshot.cuadrePorSemana,
    desgloseEmpleados: snapshot.desgloseEmpleados,
    reparto: snapshot.reparto,
    incluirDetalleDiasEnReporte: Boolean(snapshot.incluirDetalleDiasEnReporte),
    guardadoEn: serverTimestamp(),
    ...extras,
  };

  await setDoc(doc(db, 'cierres_mensuales', `${anio}-${mes}`), payload, { merge: true });
  return { id, payload };
}

export function monthKeyFromIndex(year, monthIndex) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

export function parseMonthKey(monthKey) {
  const match = String(monthKey || '').match(/^(\d{4})-(\d{2})$/);
  const year = Number(match?.[1]) || 0;
  const monthIndex = Math.min(11, Math.max(0, (Number(match?.[2]) || 1) - 1));
  return { year, monthIndex, id: match ? `${match[1]}-${match[2]}` : String(monthKey || '') };
}

function teoricoFromCierre(data) {
  if (data?.totalTeoricoSistema != null) return toNumber(data.totalTeoricoSistema);
  if (data?.desglose?.totalTeorico != null) return toNumber(data.desglose.totalTeorico);
  const weeks = data?.cuadrePorSemana;
  if (weeks && !Array.isArray(weeks)) {
    return [1, 2, 3, 4].reduce(
      (sum, index) => sum + toNumber(weeks[`semana${index}`]?.esperadoSistema),
      0,
    );
  }
  if (Array.isArray(weeks) && weeks.length) {
    return weeks.reduce((sum, week) => sum + toNumber(week.balance ?? week.esperadoSistema), 0);
  }
  return toNumber(data?.totales?.netoNegocio) - toNumber(data?.totales?.totalGastos);
}

export async function obtenerHistorialCierres() {
  const snapshot = await getDocs(collection(db, 'cierres_mensuales'));
  return snapshot.docs
    .map((item) => {
      const data = item.data() || {};
      const monthKey = data.mes || item.id;
      const parsed = parseMonthKey(monthKey);
      const totalFisico = Number(data.totalFisico) || Number(data.totales?.fisicoTotal) || 0;
      const totalTeoricoSistema = Number(data.totalTeoricoSistema) || teoricoFromCierre(data);
      const diferencia =
        data.diferencia != null && data.diferencia !== ''
          ? Number(data.diferencia) || 0
          : Number(data.totales?.diferenciaMes) || totalFisico - totalTeoricoSistema;
      const ventasTotales = toNumber(data.totales?.ventasBrutas);
      const gastosTotales = toNumber(data.totales?.totalGastos);
      const gananciaNeta = toNumber(
        data.totales?.utilidadNeta ??
          data.totales?.netoNegocio - data.totales?.totalGastos ??
          0,
      );
      const totalRepartido = toNumber(
        data.totales?.totalReparto ??
          (toNumber(data.reparto?.socio1?.monto) + toNumber(data.reparto?.socio2?.monto)) ??
          totalFisico,
      );
      return {
        ...data,
        id: item.id,
        monthKey,
        totalFisico,
        totalTeoricoSistema,
        diferencia,
        ventasTotales,
        gastosTotales,
        gananciaNeta,
        totalRepartido,
        guardadoEn: data.guardadoEn || data.actualizadoEn || data.creadoEn || null,
        year: parsed.year,
        monthIndex: parsed.monthIndex,
        label: monthLabel(parsed.year, parsed.monthIndex),
      };
    })
    .sort((a, b) => String(b.monthKey || b.id).localeCompare(String(a.monthKey || a.id)));
}

export async function obtenerCierrePorMes(monthKey) {
  const snapshot = await getDoc(doc(db, 'cierres_mensuales', monthKey));
  if (!snapshot.exists()) return null;
  const data = snapshot.data() || {};
  return { id: snapshot.id, monthKey: data.mes || snapshot.id, ...data };
}

export async function guardarCierre(monthKey, data) {
  const ref = doc(db, 'cierres_mensuales', monthKey);
  const existing = await getDoc(ref);
  await setDoc(
    ref,
    {
      ...data,
      actualizadoEn: serverTimestamp(),
      creadoEn: existing.exists() ? existing.data()?.creadoEn || serverTimestamp() : serverTimestamp(),
    },
    { merge: true },
  );
  return monthKey;
}

export async function eliminarCierre(monthKey) {
  await deleteDoc(doc(db, 'cierres_mensuales', monthKey));
}
