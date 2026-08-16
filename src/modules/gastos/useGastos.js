import { useCallback, useEffect, useMemo, useState } from 'react';
import { toNumber } from '../../services/dashboardService';
import {
  createGasto,
  deleteGasto,
  fetchGastosByMonth,
  monthLabel,
  summarizeGastos,
  updateGasto,
  weekFromDate,
} from '../../services/gastosService';
import { toLocalIsoDate } from '../../services/ventasService';

function emptyForm() {
  const fecha = toLocalIsoDate();
  return {
    fecha,
    concepto: '',
    monto: '',
    categoria: 'Operativo',
    semanaAsignada: weekFromDate(fecha),
  };
}

export default function useGastos() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await fetchGastosByMonth(year, month);
      setGastos(rows);
    } catch (cause) {
      setError(cause?.message || 'No se pudieron cargar los gastos.');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => summarizeGastos(gastos), [gastos]);
  const label = monthLabel(year, month);

  const shiftMonth = (delta) => {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };

  const openCreate = () => {
    setError('');
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (gasto) => {
    setError('');
    setEditingId(gasto.id);
    setForm({
      fecha: gasto.fecha,
      concepto: gasto.concepto,
      monto: String(gasto.monto),
      categoria: gasto.categoria,
      semanaAsignada: gasto.semanaAsignada,
    });
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingId(null);
  }, []);

  const updateForm = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'fecha') {
        next.semanaAsignada = weekFromDate(value);
      }
      return next;
    });
  };

  const save = async () => {
    if (!form.concepto.trim()) {
      setError('Escribe el concepto del gasto.');
      return;
    }
    if (toNumber(form.monto) <= 0) {
      setError('El monto debe ser mayor a 0.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        monto: toNumber(form.monto),
        semanaAsignada: Number(form.semanaAsignada),
      };
      if (editingId) {
        await updateGasto(editingId, payload);
        setToast('Gasto actualizado.');
      } else {
        await createGasto(payload);
        setToast('Gasto registrado.');
      }
      closeModal();

      const [savedYear, savedMonth] = payload.fecha.split('-').map(Number);
      if (savedYear !== year || savedMonth - 1 !== month) {
        setYear(savedYear);
        setMonth(savedMonth - 1);
      } else {
        await load();
      }
      window.setTimeout(() => setToast(''), 3200);
    } catch (cause) {
      setError(cause?.message || 'No se pudo guardar el gasto.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    setSaving(true);
    setError('');
    try {
      await deleteGasto(id);
      setConfirmId(null);
      setToast('Gasto eliminado.');
      await load();
      window.setTimeout(() => setToast(''), 3200);
    } catch (cause) {
      setError(cause?.message || 'No se pudo eliminar el gasto.');
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
    label,
    gastos,
    summary,
    loading,
    saving,
    error,
    toast,
    setToast,
    modalOpen,
    editingId,
    form,
    updateForm,
    openCreate,
    openEdit,
    closeModal,
    save,
    confirmId,
    setConfirmId,
    remove,
  };
}
