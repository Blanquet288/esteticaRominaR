import { useCallback, useEffect, useState } from 'react';
import { fetchConfigMain } from '../../services/cierreService';
import { loadReporteAnual } from '../../services/reporteAnualService';

const emptyTotals = { ventas: 0, comisiones: 0, gastos: 0, gananciaNeta: 0 };

export default function useReporteAnual() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [months, setMonths] = useState([]);
  const [totals, setTotals] = useState(emptyTotals);
  const [mesEstrella, setMesEstrella] = useState(null);
  const [mesMenor, setMesMenor] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [topColaboradora, setTopColaboradora] = useState(null);
  const [hayMovimientos, setHayMovimientos] = useState(false);
  const [config, setConfig] = useState({
    nombreEmpresa: 'Estética Romina',
    dueno1Nombre: 'Socia 1',
    dueno2Nombre: 'Socia 2',
    logoDataUrl: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [result, main] = await Promise.all([loadReporteAnual(year), fetchConfigMain()]);
      setConfig(main);
      setMonths(result.months);
      setTotals(result.totals);
      setMesEstrella(result.mesEstrella);
      setMesMenor(result.mesMenor);
      setRanking(result.ranking);
      setTopColaboradora(result.topColaboradora);
      setHayMovimientos(result.hayMovimientos);
    } catch (cause) {
      setError(cause?.message || 'No se pudo cargar el reporte anual.');
      setMonths([]);
      setTotals(emptyTotals);
      setMesEstrella(null);
      setMesMenor(null);
      setRanking([]);
      setTopColaboradora(null);
      setHayMovimientos(false);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  const shiftYear = (delta) => {
    setYear((current) => current + delta);
  };

  return {
    year,
    setYear,
    shiftYear,
    loading,
    error,
    months,
    totals,
    mesEstrella,
    mesMenor,
    ranking,
    topColaboradora,
    hayMovimientos,
    config,
  };
}
