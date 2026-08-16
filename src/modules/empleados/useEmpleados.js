import { useCallback, useEffect, useMemo, useState } from 'react';
import { toNumber } from '../../services/dashboardService';
import { registrarAsistencia, TIPOS_ASISTENCIA } from '../../services/asistenciasService';
import {
  actualizarEmpleado,
  crearEmpleado,
  DIAS_SEMANA,
  eliminarEmpleado,
  horarioVacio,
  obtenerEmpleados,
  obtenerTurnos,
} from '../../services/empleadosService';
import { toLocalIsoDate } from '../../services/ventasService';

function emptyForm() {
  return {
    nombre: '',
    rol: 'Estilista',
    telefono: '',
    direccion: '',
    comisionDefecto: '',
    horarioSemanal: horarioVacio(),
  };
}

export default function useEmpleados() {
  const [empleados, setEmpleados] = useState([]);
  const [turnos, setTurnos] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [queryText, setQueryText] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmId, setConfirmId] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [asistenciaOpen, setAsistenciaOpen] = useState(false);
  const [asistencia, setAsistencia] = useState({
    idEmpleado: '',
    fecha: toLocalIsoDate(),
    tipo: 'falta',
    motivo: '',
  });

  useEffect(() => {
    obtenerTurnos().then(setTurnos).catch(() => setTurnos({}));

    const unsubscribe = obtenerEmpleados(
      (rows) => {
        setEmpleados(rows);
        setLoading(false);
        setError('');
      },
      (cause) => {
        setError(cause?.message || 'No se pudo cargar el equipo.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const filtrados = useMemo(() => {
    const term = queryText.trim().toLowerCase();
    if (!term) return empleados;
    return empleados.filter((item) =>
      [item.nombre, item.rol, item.telefono, item.direccion]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [empleados, queryText]);

  const openCreate = () => {
    setError('');
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (empleado) => {
    setError('');
    setEditingId(empleado.id);
    setForm({
      nombre: empleado.nombre,
      rol: empleado.rol,
      telefono: empleado.telefono,
      direccion: empleado.direccion,
      comisionDefecto: String(empleado.comisionDefecto ?? ''),
      horarioSemanal: { ...horarioVacio(), ...empleado.horarioSemanal },
    });
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingId(null);
  }, []);

  const confirmEmpleado = useMemo(
    () => empleados.find((item) => item.id === confirmId) || null,
    [empleados, confirmId],
  );

  const canDelete = confirmText.trim() === 'ELIMINAR';

  const openConfirm = (empleado) => {
    setError('');
    setConfirmText('');
    setConfirmId(empleado.id);
  };

  const closeConfirm = useCallback(() => {
    setConfirmId(null);
    setConfirmText('');
  }, []);

  const openAsistencia = (empleado) => {
    setError('');
    setAsistencia({
      idEmpleado: empleado?.id || '',
      fecha: toLocalIsoDate(),
      tipo: 'falta',
      motivo: '',
    });
    setAsistenciaOpen(true);
  };

  const closeAsistencia = useCallback(() => {
    setAsistenciaOpen(false);
  }, []);

  const updateAsistencia = (field, value) => {
    setAsistencia((current) => ({ ...current, [field]: value }));
  };

  const saveAsistencia = async () => {
    if (!asistencia.idEmpleado) {
      setError('Selecciona a la colaboradora.');
      return;
    }
    if (!asistencia.fecha) {
      setError('Elige la fecha de la incidencia.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await registrarAsistencia(asistencia);
      closeAsistencia();
      setToast('Inasistencia registrada.');
      window.setTimeout(() => setToast(''), 3200);
    } catch (cause) {
      setError(cause?.message || 'No se pudo registrar la inasistencia.');
    } finally {
      setSaving(false);
    }
  };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateHorario = (dayKey, turnoId) => {
    setForm((current) => ({
      ...current,
      horarioSemanal: {
        ...current.horarioSemanal,
        [dayKey]: turnoId,
      },
    }));
  };

  const save = async () => {
    if (!form.nombre.trim()) {
      setError('Escribe el nombre de la empleada.');
      return;
    }
    if (toNumber(form.comisionDefecto) < 0) {
      setError('La comisión no puede ser negativa.');
      return;
    }
    if (toNumber(form.comisionDefecto) > 100) {
      setError('La comisión por defecto no puede ser mayor a 100%.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await actualizarEmpleado(editingId, form);
        setToast('Empleada actualizada.');
      } else {
        await crearEmpleado(form);
        setToast('Empleada registrada.');
      }
      closeModal();
      window.setTimeout(() => setToast(''), 3200);
    } catch (cause) {
      setError(cause?.message || 'No se pudo guardar a la empleada.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirmId || confirmText.trim() !== 'ELIMINAR') return;

    setSaving(true);
    setError('');
    try {
      await eliminarEmpleado(confirmId);
      closeConfirm();
      setToast('Empleada eliminada.');
      window.setTimeout(() => setToast(''), 3200);
    } catch (cause) {
      setError(cause?.message || 'No se pudo eliminar a la empleada.');
    } finally {
      setSaving(false);
    }
  };

  return {
    empleados,
    filtrados,
    turnos,
    dias: DIAS_SEMANA,
    loading,
    saving,
    error,
    toast,
    setToast,
    queryText,
    setQueryText,
    modalOpen,
    editingId,
    form,
    updateForm,
    updateHorario,
    openCreate,
    openEdit,
    closeModal,
    save,
    confirmId,
    confirmEmpleado,
    confirmText,
    setConfirmText,
    canDelete,
    openConfirm,
    closeConfirm,
    remove,
    tiposAsistencia: TIPOS_ASISTENCIA,
    asistenciaOpen,
    asistencia,
    openAsistencia,
    closeAsistencia,
    updateAsistencia,
    saveAsistencia,
  };
}
