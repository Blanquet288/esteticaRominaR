import { useCallback, useEffect, useState } from 'react';
import { toNumber } from '../../services/dashboardService';
import { obtenerAhorro, registrarMovimiento } from '../../services/ahorroService';
import { toLocalIsoDate } from '../../services/ventasService';

function emptyForm(tipo = 'deposito') {
  return {
    tipo,
    fecha: toLocalIsoDate(),
    monto: '',
    motivo: '',
  };
}

export default function useAhorro() {
  const [saldoActual, setSaldoActual] = useState(0);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const unsubscribe = obtenerAhorro(
      (data) => {
        setSaldoActual(data.saldoActual);
        setHistorial(data.historial);
        setLoading(false);
        setError('');
      },
      (cause) => {
        setError(cause?.message || 'No se pudo cargar el fondo de ahorro.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const openModal = (tipo) => {
    setError('');
    setForm(emptyForm(tipo));
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setForm(emptyForm());
  }, []);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const exceedsSaldo =
    form.tipo === 'retiro' && toNumber(form.monto) > saldoActual && toNumber(form.monto) > 0;

  const save = async () => {
    if (toNumber(form.monto) <= 0) {
      setError('El monto debe ser mayor a 0.');
      return;
    }
    if (!form.motivo.trim()) {
      setError('Escribe el motivo del movimiento.');
      return;
    }
    if (exceedsSaldo) {
      setError('No puedes retirar más del saldo disponible.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await registrarMovimiento(form);
      setToast(form.tipo === 'retiro' ? 'Retiro registrado.' : 'Depósito registrado.');
      closeModal();
      window.setTimeout(() => setToast(''), 3200);
    } catch (cause) {
      setError(cause?.message || 'No se pudo registrar el movimiento.');
    } finally {
      setSaving(false);
    }
  };

  return {
    saldoActual,
    historial,
    loading,
    saving,
    error,
    toast,
    setToast,
    modalOpen,
    form,
    exceedsSaldo,
    openModal,
    closeModal,
    updateForm,
    save,
  };
}
