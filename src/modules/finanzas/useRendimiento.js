import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadConfigMain } from '../../services/configService';
import { monthLabel } from '../../services/gastosService';
import { loadRendimientoMes } from '../../services/rendimientoService';

export default function useRendimiento() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [staff, setStaff] = useState([]);
  const [totals, setTotals] = useState({ bruto: 0, comision: 0, utilidad: 0, servicios: 0 });
  const [hayVentas, setHayVentas] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logo, setLogo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [result, main] = await Promise.all([loadRendimientoMes(year, month), loadConfigMain()]);
      setLogo(main.logoDataUrl || '');
      setStaff(result.staff);
      setTotals(result.totals);
      setHayVentas(result.hayVentas);
      setSelectedId((current) => {
        if (current && result.staff.some((item) => item.id === current)) return current;
        return result.staff.find((item) => item.servicios > 0)?.id || result.staff[0]?.id || '';
      });
    } catch (cause) {
      setError(cause?.message || 'No se pudo cargar el rendimiento.');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = useMemo(
    () => staff.find((item) => item.id === selectedId) || null,
    [staff, selectedId],
  );

  const shiftMonth = (delta) => {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };

  return {
    year,
    month,
    setYear,
    setMonth,
    shiftMonth,
    label: monthLabel(year, month),
    staff,
    totals,
    hayVentas,
    selected,
    selectedId,
    setSelectedId,
    loading,
    error,
    logo,
  };
}
