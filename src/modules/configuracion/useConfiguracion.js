import { useCallback, useEffect, useState } from 'react';
import {
  createTurnoId,
  emptyConfigMain,
  loadConfigMain,
  loadTurnosLista,
  readLogoFile,
  saveConfigLogo,
  saveConfigMain,
  saveTurnosLista,
} from '../../services/configService';

function emptyTurno(orden = 1) {
  return {
    id: '',
    nombre: '',
    descripcion: '',
    orden: String(orden),
  };
}

export default function useConfiguracion() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [empresa, setEmpresa] = useState(emptyConfigMain);
  const [logo, setLogo] = useState('');
  const [turnos, setTurnos] = useState([]);
  const [turnoModal, setTurnoModal] = useState(false);
  const [turnoForm, setTurnoForm] = useState(emptyTurno);
  const [editingTurnoId, setEditingTurnoId] = useState('');
  const [confirmTurnoId, setConfirmTurnoId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [main, lista] = await Promise.all([loadConfigMain(), loadTurnosLista()]);
      setEmpresa({
        nombreEmpresa: main.nombreEmpresa,
        ticketMensaje: main.ticketMensaje,
        dueno1Nombre: main.dueno1Nombre,
        dueno2Nombre: main.dueno2Nombre,
      });
      setLogo(main.logoDataUrl || '');
      setTurnos(lista);
    } catch (cause) {
      setError(cause?.message || 'No se pudo cargar la configuración.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateEmpresa = (field, value) => {
    setEmpresa((current) => ({ ...current, [field]: value }));
  };

  const saveEmpresa = async () => {
    if (!empresa.nombreEmpresa.trim()) {
      setError('Escribe el nombre de la empresa.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await saveConfigMain(empresa);
      setToast('Datos de la empresa guardados.');
      window.setTimeout(() => setToast(''), 3200);
    } catch (cause) {
      setError(cause?.message || 'No se pudieron guardar los datos.');
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file) => {
    setError('');
    try {
      const dataUrl = await readLogoFile(file);
      setSaving(true);
      await saveConfigLogo(dataUrl);
      setLogo(dataUrl);
      setToast('Logo actualizado para reportes.');
      window.setTimeout(() => setToast(''), 3200);
    } catch (cause) {
      setError(cause?.message || 'No se pudo guardar el logo.');
    } finally {
      setSaving(false);
    }
  };

  const removeLogo = async () => {
    setSaving(true);
    setError('');
    try {
      await saveConfigLogo('');
      setLogo('');
      setToast('Logo eliminado.');
      window.setTimeout(() => setToast(''), 3200);
    } catch (cause) {
      setError(cause?.message || 'No se pudo quitar el logo.');
    } finally {
      setSaving(false);
    }
  };

  const openCreateTurno = () => {
    setError('');
    setEditingTurnoId('');
    setTurnoForm(emptyTurno(turnos.length + 1));
    setTurnoModal(true);
  };

  const openEditTurno = (turno) => {
    setError('');
    setEditingTurnoId(turno.id);
    setTurnoForm({
      id: turno.id,
      nombre: turno.nombre,
      descripcion: turno.descripcion,
      orden: String(turno.orden),
    });
    setTurnoModal(true);
  };

  const closeTurnoModal = () => {
    setTurnoModal(false);
    setEditingTurnoId('');
  };

  const updateTurnoForm = (field, value) => {
    setTurnoForm((current) => ({ ...current, [field]: value }));
  };

  const persistTurnos = async (next) => {
    const saved = await saveTurnosLista(next);
    setTurnos(saved);
  };

  const saveTurno = async () => {
    if (!turnoForm.nombre.trim()) {
      setError('Escribe el nombre del turno.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const nextItem = {
        id: editingTurnoId || createTurnoId(turnoForm.nombre),
        nombre: turnoForm.nombre.trim(),
        descripcion: turnoForm.descripcion.trim(),
        orden: Number(turnoForm.orden) || turnos.length + 1,
      };
      const next = editingTurnoId
        ? turnos.map((item) => (item.id === editingTurnoId ? nextItem : item))
        : [...turnos, nextItem];
      await persistTurnos(next);
      closeTurnoModal();
      setToast(editingTurnoId ? 'Turno actualizado.' : 'Turno creado.');
      window.setTimeout(() => setToast(''), 3200);
    } catch (cause) {
      setError(cause?.message || 'No se pudo guardar el turno.');
    } finally {
      setSaving(false);
    }
  };

  const removeTurno = async () => {
    if (!confirmTurnoId) return;
    setSaving(true);
    setError('');
    try {
      await persistTurnos(turnos.filter((item) => item.id !== confirmTurnoId));
      setConfirmTurnoId('');
      setToast('Turno eliminado.');
      window.setTimeout(() => setToast(''), 3200);
    } catch (cause) {
      setError(cause?.message || 'No se pudo eliminar el turno.');
    } finally {
      setSaving(false);
    }
  };

  return {
    loading,
    saving,
    error,
    toast,
    setToast,
    empresa,
    updateEmpresa,
    saveEmpresa,
    logo,
    uploadLogo,
    removeLogo,
    turnos,
    turnoModal,
    turnoForm,
    editingTurnoId,
    updateTurnoForm,
    openCreateTurno,
    openEditTurno,
    closeTurnoModal,
    saveTurno,
    confirmTurnoId,
    setConfirmTurnoId,
    removeTurno,
  };
}
