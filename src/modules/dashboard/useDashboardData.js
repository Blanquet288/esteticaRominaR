import { useEffect, useState } from 'react';
import { loadDashboardData } from '../../services/dashboardService';

export default function useDashboardData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;

    loadDashboardData()
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
  }, []);

  return { loading, error, data };
}
