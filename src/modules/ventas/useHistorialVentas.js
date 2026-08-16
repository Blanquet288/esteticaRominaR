import { useCallback, useEffect, useMemo, useState } from 'react';
import { toNumber } from '../../services/dashboardService';
import { monthLabel } from '../../services/gastosService';
import {
  deleteVenta,
  fetchEmpleadosMap,
  fetchVentasHistorial,
  groupVentasByDay,
  updateVenta,
} from '../../services/ventasService';

export default function useHistorialVentas() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [ventas, setVentas] = useState([]);
  const [empleados, setEmpleados] = useState({});
  const [openDays, setOpenDays] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [editing, setEditing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [rows, people] = await Promise.all([
        fetchVentasHistorial(year, month),
        fetchEmpleadosMap(),
      ]);
      setVentas(rows);
      setEmpleados(people);
      setOpenDays((current) => {
        const dates = new Set(rows.map((item) => item.fecha));
        const kept = Object.fromEntries(
          Object.entries(current).filter(([fecha]) => dates.has(fecha)),
        );
        if (Object.values(kept).some(Boolean)) return kept;
        return rows[0] ? { [rows[0].fecha]: true } : {};
      });
    } catch (cause) {
      setError(cause?.message || 'No se pudo cargar el historial.');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const days = useMemo(() => groupVentasByDay(ventas, empleados), [ventas, empleados]);

  const highlights = useMemo(() => {
    if (!days.length) return { diaMayor: null, diaMenor: null };
    return days.reduce(
      (acc, day) => ({
        diaMayor: !acc.diaMayor || day.total > acc.diaMayor.total ? day : acc.diaMayor,
        diaMenor: !acc.diaMenor || day.total < acc.diaMenor.total ? day : acc.diaMenor,
      }),
      { diaMayor: null, diaMenor: null },
    );
  }, [days]);

  const shiftMonth = (delta) => {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };

  const toggleDay = (fecha) => {
    setOpenDays((current) => ({ ...current, [fecha]: !current[fecha] }));
  };

  const openEdit = (venta) => {
    setError('');
    setEditing({
      id: venta.id,
      fecha: venta.fecha,
      servicio: venta.servicio,
      cantidad: String(venta.cantidad),
      monto: String(venta.monto),
      comisionMonto: String(venta.comisionMonto),
      esHistorico: venta.esHistorico,
    });
  };

  const closeEdit = useCallback(() => setEditing(null), []);

  const updateEdit = (field, value) => {
    setEditing((current) => ({ ...current, [field]: value }));
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editing.servicio.trim()) {
      setError('Escribe el servicio.');
      return;
    }
    if (toNumber(editing.monto) < 0 || toNumber(editing.comisionMonto) < 0) {
      setError('Los montos no pueden ser negativos.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await updateVenta(editing.id, editing);
      setToast('Venta actualizada.');
      closeEdit();
      await load({ silent: true });
      window.setTimeout(() => setToast(''), 3200);
    } catch (cause) {
      setError(cause?.message || 'No se pudo actualizar la venta.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirmId) return;
    setSaving(true);
    setError('');
    try {
      await deleteVenta(confirmId);
      setConfirmId(null);
      setToast('Venta eliminada.');
      await load({ silent: true });
      window.setTimeout(() => setToast(''), 3200);
    } catch (cause) {
      setError(cause?.message || 'No se pudo eliminar la venta.');
    } finally {
      setSaving(false);
    }
  };

  return {
    year,
    month,
    setYear,
    setMonth,
    shiftMonth,
    label: monthLabel(year, month),
    days,
    diaMayor: highlights.diaMayor,
    diaMenor: highlights.diaMenor,
    openDays,
    toggleDay,
    loading,
    saving,
    error,
    toast,
    setToast,
    editing,
    openEdit,
    closeEdit,
    updateEdit,
    saveEdit,
    confirmId,
    setConfirmId,
    remove,
  };
}
