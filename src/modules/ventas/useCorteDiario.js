import { useEffect, useMemo, useState } from 'react';
import { toNumber } from '../../services/dashboardService';
import {
  computeLine,
  createCorteItem,
  loadVentasSetup,
  parseLocalIsoDate,
  resolveTurnoFromHorario,
  roundMoney,
  saveCorteDiario,
  saveHistoricoDiario,
  toLocalIsoDate,
} from '../../services/ventasService';

export default function useCorteDiario() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [empleados, setEmpleados] = useState([]);
  const [turnos, setTurnos] = useState({});
  const [catalogo, setCatalogo] = useState([]);
  const [fecha, setFecha] = useState(toLocalIsoDate());
  const [idEmpleado, setIdEmpleado] = useState('');
  const [turnoId, setTurnoId] = useState('');
  const [isDescanso, setIsDescanso] = useState(false);
  const [items, setItems] = useState([]);
  const [queryText, setQueryText] = useState('');
  const [categoria, setCategoria] = useState('Todas');
  const [toast, setToast] = useState('');
  const [mode, setMode] = useState('corte');
  const [montoTotal, setMontoTotal] = useState('');
  const [comisionHistorico, setComisionHistorico] = useState('');

  useEffect(() => {
    let cancelled = false;

    loadVentasSetup()
      .then((setup) => {
        if (cancelled) return;
        setEmpleados(setup.empleados);
        setTurnos(setup.turnos);
        setCatalogo(setup.catalogo);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause?.message || 'No se pudo cargar el catálogo de ventas.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const empleado = useMemo(
    () => empleados.find((item) => item.id === idEmpleado) || null,
    [empleados, idEmpleado],
  );

  const turnoNombre = turnos[turnoId] || turnoId;

  useEffect(() => {
    if (!empleado) {
      setTurnoId('');
      setIsDescanso(false);
      return;
    }

    const resolved = resolveTurnoFromHorario(empleado.horarioSemanal, fecha);
    setIsDescanso(resolved.isDescanso);
    setTurnoId(resolved.isDescanso ? '' : resolved.turnoId);
  }, [empleado, fecha]);

  const categorias = useMemo(() => {
    const unique = [...new Set(catalogo.map((item) => item.categoria).filter(Boolean))];
    return ['Todas', ...unique.sort((a, b) => a.localeCompare(b, 'es'))];
  }, [catalogo]);

  const serviciosFiltrados = useMemo(() => {
    const term = queryText.trim().toLowerCase();
    return catalogo.filter((item) => {
      const matchesCategory = categoria === 'Todas' || item.categoria === categoria;
      const matchesTerm =
        !term ||
        item.nombre.toLowerCase().includes(term) ||
        item.categoria.toLowerCase().includes(term);
      return matchesCategory && matchesTerm;
    });
  }, [catalogo, categoria, queryText]);

  const totals = useMemo(
    () =>
      items.reduce(
        (acc, item) => ({
          subtotal: acc.subtotal + toNumber(item.monto),
          comision: acc.comision + toNumber(item.comisionMonto),
          utilidad: acc.utilidad + toNumber(item.utilidadNegocio),
        }),
        { subtotal: 0, comision: 0, utilidad: 0 },
      ),
    [items],
  );

  const diaEtiqueta = parseLocalIsoDate(fecha).toLocaleDateString('es-MX', {
    weekday: 'long',
  });

  const utilidadHistorico = roundMoney(
    toNumber(montoTotal) - toNumber(comisionHistorico),
  );

  const changeMode = (nextMode) => {
    setError('');
    setMode(nextMode);
  };

  const addServicio = (servicio, draft = {}) => {
    setItems((current) => [...current, createCorteItem(servicio, draft)]);
  };

  const updateItem = (localId, field, value) => {
    setItems((current) =>
      current.map((item) => {
        if (item.localId !== localId) return item;

        const next = { ...item };
        const parsed = toNumber(value);

        if (field === 'cantidad') {
          next.cantidad = Math.max(1, Math.round(parsed) || 1);
        } else if (field === 'precioUnitario') {
          next.precioUnitario = parsed;
        } else if (field === 'comisionPct') {
          next.comisionPct = parsed;
        } else if (field === 'comisionMonto' && item.comisionTipo === 'fijo') {
          const qty = next.cantidad || 1;
          next.comisionUnitaria = qty ? parsed / qty : 0;
        } else if (field === 'monto') {
          const qty = next.cantidad || 1;
          next.precioUnitario = qty ? parsed / qty : 0;
        }

        return {
          ...item,
          ...computeLine(next),
        };
      }),
    );
  };

  const changeQuantity = (localId, delta) => {
    setItems((current) =>
      current.map((item) => {
        if (item.localId !== localId) return item;
        const next = {
          ...item,
          cantidad: Math.max(1, (item.cantidad || 1) + delta),
        };
        return { ...item, ...computeLine(next) };
      }),
    );
  };

  const removeItem = (localId) => {
    setItems((current) => current.filter((item) => item.localId !== localId));
  };

  const resetCorte = () => {
    setItems([]);
  };

  const save = async () => {
    setError('');

    if (!idEmpleado) {
      setError('Selecciona una empleada para registrar el corte.');
      return;
    }
    if (!turnoId) {
      setError(
        isDescanso
          ? 'Hoy es descanso. Elige un turno manualmente si vas a registrar el corte.'
          : 'No hay un turno asignado para este día.',
      );
      return;
    }
    if (!items.length) {
      setError('Agrega al menos un servicio al corte.');
      return;
    }

    setSaving(true);
    try {
      await saveCorteDiario({
        fecha,
        idEmpleado,
        turnoId,
        turnoNombre: turnos[turnoId] || turnoId,
        items,
      });
      resetCorte();
      setToast('Corte diario guardado correctamente.');
      window.setTimeout(() => {
        setToast('');
      }, 3200);
    } catch (cause) {
      setError(cause?.message || 'No se pudo guardar el corte diario.');
    } finally {
      setSaving(false);
    }
  };

  const saveHistorico = async () => {
    setError('');

    if (!idEmpleado) {
      setError('Selecciona una empleada para registrar el histórico.');
      return;
    }
    if (!turnoId) {
      setError(
        isDescanso
          ? 'Hoy es descanso. Elige un turno manualmente si vas a registrar el histórico.'
          : 'No hay un turno asignado para este día.',
      );
      return;
    }
    if (toNumber(montoTotal) <= 0) {
      setError('El monto total bruto debe ser mayor a 0.');
      return;
    }
    if (toNumber(comisionHistorico) < 0) {
      setError('La comisión no puede ser negativa.');
      return;
    }

    setSaving(true);
    try {
      await saveHistoricoDiario({
        fecha,
        idEmpleado,
        turnoId,
        turnoNombre: turnos[turnoId] || turnoId,
        montoTotal,
        comisionMonto: comisionHistorico,
      });
      setMontoTotal('');
      setComisionHistorico('');
      setToast('Histórico diario guardado correctamente.');
      window.setTimeout(() => {
        setToast('');
      }, 3200);
    } catch (cause) {
      setError(cause?.message || 'No se pudo guardar el histórico diario.');
    } finally {
      setSaving(false);
    }
  };

  return {
    loading,
    saving,
    error,
    setError,
    empleados,
    turnos,
    fecha,
    setFecha,
    idEmpleado,
    setIdEmpleado,
    empleado,
    turnoId,
    setTurnoId,
    turnoNombre,
    isDescanso,
    items,
    queryText,
    setQueryText,
    categoria,
    setCategoria,
    categorias,
    serviciosFiltrados,
    totals,
    diaEtiqueta,
    toast,
    setToast,
    mode,
    changeMode,
    montoTotal,
    setMontoTotal,
    comisionHistorico,
    setComisionHistorico,
    utilidadHistorico,
    addServicio,
    updateItem,
    changeQuantity,
    removeItem,
    save,
    saveHistorico,
  };
}
