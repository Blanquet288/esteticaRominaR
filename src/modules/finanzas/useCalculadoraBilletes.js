import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toNumber } from '../../services/dashboardService';
import {
  eliminarCierre,
  finalizeCierre,
  monthKeyFromIndex,
  obtenerHistorialCierres,
  parseMonthKey,
} from '../../services/cierreService';
import {
  emptyCountsForm,
  emptyMonthForms,
  formsFromSaved,
  loadArqueoMes,
  physicalFromCounts,
  saveArqueoMensual,
  splitPacas50,
  summarizeArqueo,
} from '../../services/calculadoraService';

function hasBillCounts(forms) {
  return Object.values(forms || {}).some((form) =>
    Object.values(form || {}).some((value) => String(value).trim() !== ''),
  );
}

export default function useCalculadoraBilletes() {
  const now = new Date();
  const [tab, setTab] = useState('arqueo');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [week, setWeek] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [historialError, setHistorialError] = useState('');
  const [toast, setToast] = useState('');
  const [label, setLabel] = useState('');
  const [config, setConfig] = useState({
    dueno1Nombre: 'Socio 1',
    dueno2Nombre: 'Socio 2',
  });
  const [base, setBase] = useState(null);
  const [saved, setSaved] = useState(null);
  const [weekForms, setWeekForms] = useState(emptyMonthForms);
  const [libreForm, setLibreForm] = useState(emptyCountsForm);
  const [showReparto, setShowReparto] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [historialLoading, setHistorialLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const silentLoad = useRef(false);

  const load = useCallback(async () => {
    const silent = silentLoad.current;
    silentLoad.current = false;
    if (!silent) setLoading(true);
    setError('');
    try {
      const result = await loadArqueoMes(year, month);
      setLabel(result.label);
      setConfig(result.config);
      setBase(result.base);
      setSaved(result.saved);
      setWeekForms((current) => {
        const next = result.weekForms;
        return hasBillCounts(next) || !hasBillCounts(current) ? next : current;
      });
      if (!silent) setShowReparto(false);
    } catch (cause) {
      setError(cause?.message || 'No se pudo cargar el arqueo del mes.');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const loadHistorial = useCallback(async () => {
    setHistorialLoading(true);
    setHistorialError('');
    try {
      setHistorial(await obtenerHistorialCierres());
    } catch (cause) {
      setHistorial([]);
      setHistorialError(cause?.message || 'No se pudo cargar el historial de arqueos.');
    } finally {
      setHistorialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistorial();
  }, [loadHistorial]);

  const changeTab = (next) => {
    if (next === 'historial') {
      setHistorialLoading(true);
      loadHistorial();
    }
    setTab(next);
  };

  const names = useMemo(
    () => ({
      socio1: saved?.reparto?.socio1?.nombre || saved?.meta50?.socio1?.nombre || config.dueno1Nombre,
      socio2: saved?.reparto?.socio2?.nombre || saved?.meta50?.socio2?.nombre || config.dueno2Nombre,
    }),
    [saved, config],
  );

  const snapshot = useMemo(() => {
    if (!base) return null;
    return finalizeCierre({
      base,
      fondoAhorro: toNumber(saved?.totales?.fondoAhorro),
      modalidad: '2_socios',
      names,
      incluirDetalleDiasEnReporte: Boolean(saved?.incluirDetalleDiasEnReporte),
    });
  }, [base, saved, names]);

  const summary = useMemo(
    () => summarizeArqueo(weekForms, snapshot?.cuadrePorSemana),
    [weekForms, snapshot],
  );

  const split = useMemo(() => splitPacas50(weekForms, names), [weekForms, names]);

  const currentExpected = summary.semanas[week - 1]?.teorico || 0;
  const currentPhysical = physicalFromCounts(weekForms[week]);
  const currentDiff = summary.semanas[week - 1]?.diferencia || 0;
  const libreTotal = physicalFromCounts(libreForm);

  const shiftMonth = (delta) => {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };

  const updateWeekCount = (field, value) => {
    setWeekForms((current) => ({
      ...current,
      [week]: { ...current[week], [field]: value },
    }));
  };

  const updateLibreCount = (field, value) => {
    setLibreForm((current) => ({ ...current, [field]: value }));
  };

  const resetLibre = () => setLibreForm(emptyCountsForm());

  const openHistorialMes = (item) => {
    const parsed = parseMonthKey(item.monthKey || item.id || item.mes);
    silentLoad.current = true;
    setLabel(item.label);
    setSaved(item);
    setWeekForms(formsFromSaved(item));
    setShowReparto(true);
    setWeek(1);
    setYear(parsed.year || item.year);
    setMonth(Number.isFinite(parsed.monthIndex) ? parsed.monthIndex : item.monthIndex);
    setTab('arqueo');
  };

  const askDelete = (item) => setConfirmDelete(item);
  const cancelDelete = () => setConfirmDelete(null);

  const remove = async () => {
    if (!confirmDelete) return;
    const monthKey = confirmDelete.monthKey || confirmDelete.id;
    setSaving(true);
    setHistorialError('');
    try {
      await eliminarCierre(monthKey);
      setConfirmDelete(null);
      setToast(`Arqueo de ${confirmDelete.label || monthKey} eliminado.`);
      window.setTimeout(() => setToast(''), 3200);
      if (monthKeyFromIndex(year, month) === monthKey) {
        setWeekForms(emptyMonthForms());
        setSaved(null);
        setShowReparto(false);
      }
      await loadHistorial();
    } catch (cause) {
      setHistorialError(cause?.message || 'No se pudo eliminar el arqueo.');
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (!snapshot) return;
    setSaving(true);
    setError('');
    try {
      const result = await saveArqueoMensual({
        year,
        monthIndex: month,
        snapshot,
        weekForms,
        names,
      });
      setSaved((current) => ({
        ...(current || {}),
        ...result.payload,
        id: monthKeyFromIndex(year, month),
        monthKey: monthKeyFromIndex(year, month),
      }));
      setShowReparto(true);
      setToast(`Arqueo de ${label} actualizado.`);
      window.setTimeout(() => setToast(''), 3200);
      loadHistorial();
    } catch (cause) {
      setError(cause?.message || 'No se pudo guardar el arqueo.');
    } finally {
      setSaving(false);
    }
  };

  return {
    tab,
    setTab: changeTab,
    year,
    month,
    setYear,
    setMonth,
    shiftMonth,
    week,
    setWeek,
    label,
    loading,
    saving,
    error,
    historialError,
    toast,
    setToast,
    saved,
    names,
    snapshot,
    weekForms,
    updateWeekCount,
    currentExpected,
    currentPhysical,
    currentDiff,
    summary,
    split,
    showReparto,
    setShowReparto,
    libreForm,
    updateLibreCount,
    libreTotal,
    resetLibre,
    historial,
    historialLoading,
    openHistorialMes,
    confirmDelete,
    askDelete,
    cancelDelete,
    remove,
    save,
  };
}
