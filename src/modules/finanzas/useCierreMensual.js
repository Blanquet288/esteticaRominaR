import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toNumber } from '../../services/dashboardService';
import {
  eliminarCierre,
  finalizeCierre,
  loadCierreMes,
  monthKeyFromIndex,
  saveCierreMensual,
} from '../../services/cierreService';

function parseMonthParam(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  if (!year || month < 0 || month > 11) return null;
  return { year, month };
}

export default function useCierreMensual() {
  const [searchParams] = useSearchParams();
  const fromUrl = parseMonthParam(searchParams.get('mes'));
  const now = new Date();
  const [year, setYear] = useState(fromUrl?.year ?? now.getFullYear());
  const [month, setMonth] = useState(fromUrl?.month ?? now.getMonth());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [label, setLabel] = useState('');
  const [config, setConfig] = useState({
    nombreEmpresa: 'Estética Romina',
    dueno1Nombre: 'Socio 1',
    dueno2Nombre: 'Socio 2',
    logoDataUrl: '',
  });
  const [base, setBase] = useState(null);
  const [saved, setSaved] = useState(null);
  const [hayMovimientos, setHayMovimientos] = useState(false);
  const [fondoAhorro, setFondoAhorro] = useState('0');
  const [modalidad, setModalidad] = useState('2_socios');
  const [incluirDetalle, setIncluirDetalle] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [mostrarDetalleDiario, setMostrarDetalleDiario] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await loadCierreMes(year, month);
      setLabel(result.label);
      setConfig(result.config);
      setBase(result.base);
      setSaved(result.saved);
      setHayMovimientos(result.hayMovimientos);
      setFondoAhorro(String(result.saved?.totales?.fondoAhorro ?? 0));
      setModalidad(result.saved?.reparto?.modalidad === '1_socio' ? '1_socio' : '2_socios');
      setIncluirDetalle(Boolean(result.saved?.incluirDetalleDiasEnReporte));
    } catch (cause) {
      setError(cause?.message || 'No se pudo cargar el cierre del mes.');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const next = parseMonthParam(searchParams.get('mes'));
    if (!next) return;
    setYear(next.year);
    setMonth(next.month);
  }, [searchParams]);

  const names = useMemo(
    () => ({
      socio1: saved?.reparto?.socio1?.nombre || config.dueno1Nombre,
      socio2: saved?.reparto?.socio2?.nombre || config.dueno2Nombre,
    }),
    [saved, config],
  );

  const snapshot = useMemo(() => {
    if (!base) return null;
    return finalizeCierre({
      base,
      fondoAhorro: toNumber(fondoAhorro),
      modalidad,
      names,
      incluirDetalleDiasEnReporte: incluirDetalle,
    });
  }, [base, fondoAhorro, modalidad, names, incluirDetalle]);

  const shiftMonth = (delta) => {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };

  const save = async () => {
    if (!snapshot) return;
    setSaving(true);
    setError('');
    try {
      await saveCierreMensual({ year, monthIndex: month, snapshot });
      setSaved({
        ...snapshot,
        mes: String(month + 1).padStart(2, '0'),
        anio: year,
      });
      setToast(`Cierre de ${label} guardado.`);
      window.setTimeout(() => setToast(''), 3200);
    } catch (cause) {
      setError(cause?.message || 'No se pudo guardar el cierre.');
    } finally {
      setSaving(false);
    }
  };

  const print = () => {
    window.print();
  };

  const canDelete = confirmText.trim() === 'ELIMINAR';

  const askDelete = (item) => {
    setConfirmText('');
    setConfirmDelete(item);
  };

  const cancelDelete = () => {
    setConfirmText('');
    setConfirmDelete(null);
  };

  const remove = async () => {
    if (!confirmDelete || confirmText.trim() !== 'ELIMINAR') return;
    const monthKey = confirmDelete.monthKey || confirmDelete.id || monthKeyFromIndex(year, month);
    setSaving(true);
    setError('');
    try {
      await eliminarCierre(monthKey);
      if (monthKey === monthKeyFromIndex(year, month)) {
        setSaved(null);
        setFondoAhorro('0');
        setModalidad('2_socios');
        setIncluirDetalle(false);
      }
      setConfirmText('');
      setConfirmDelete(null);
      setToast('Cierre mensual eliminado correctamente');
      window.setTimeout(() => setToast(''), 3200);
    } catch (cause) {
      setError(cause?.message || 'No se pudo eliminar el cierre.');
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
    config,
    loading,
    saving,
    error,
    toast,
    setToast,
    saved,
    hayMovimientos,
    fondoAhorro,
    setFondoAhorro,
    modalidad,
    setModalidad,
    incluirDetalle,
    setIncluirDetalle,
    snapshot,
    save,
    print,
    confirmDelete,
    confirmText,
    setConfirmText,
    canDelete,
    askDelete,
    cancelDelete,
    remove,
    mostrarDetalleDiario,
    setMostrarDetalleDiario,
    monthKey: monthKeyFromIndex(year, month),
  };
}
