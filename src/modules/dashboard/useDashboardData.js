import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { loadDashboardData } from '../../services/dashboardService';

export default function useDashboardData() {
  const { hasPermission, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const flags = useMemo(
    () => ({
      kpiVentas: hasPermission('dash_kpi_ventas'),
      kpiGastos: hasPermission('dash_kpi_gastos'),
      kpiBalance: hasPermission('dash_kpi_balance'),
      kpiAhorro: hasPermission('dash_kpi_ahorro'),
      graficaVentas: hasPermission('dash_grafica_ventas'),
      servicios: hasPermission('dash_servicios'),
    }),
    [hasPermission],
  );

  useEffect(() => {
    if (authLoading) return undefined;

    let cancelled = false;
    setLoading(true);

    loadDashboardData(new Date(), {
      includeVentas: flags.kpiVentas || flags.kpiBalance || flags.graficaVentas || flags.servicios,
      includeGastos: flags.kpiGastos || flags.kpiBalance,
      includeAhorro: flags.kpiAhorro,
      includeCatalog: flags.servicios,
    })
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError('');
        }
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause?.message || 'No se pudo cargar el dashboard.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, flags]);

  return { loading: authLoading || loading, error, data, flags };
}
