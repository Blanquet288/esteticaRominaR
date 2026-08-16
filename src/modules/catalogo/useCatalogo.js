import { useCallback, useEffect, useMemo, useState } from 'react';
import { toNumber } from '../../services/dashboardService';
import {
  actualizarServicio,
  CATEGORIAS_COMUNES,
  crearServicio,
  eliminarServicio,
  obtenerServicios,
} from '../../services/catalogoService';

function emptyForm() {
  return {
    nombre: '',
    categoria: 'Cortes',
    precioBase: '',
    tipoComision: 'porcentaje',
    comisionDefecto: '',
    imagen: '',
  };
}

export default function useCatalogo() {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [queryText, setQueryText] = useState('');
  const [categoria, setCategoria] = useState('Todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => {
    const unsubscribe = obtenerServicios(
      (rows) => {
        setServicios(rows);
        setLoading(false);
        setError('');
      },
      (cause) => {
        setError(cause?.message || 'No se pudo cargar el catálogo.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const categorias = useMemo(() => {
    const counts = new Map();
    servicios.forEach((item) => {
      const name = item.categoria || 'General';
      counts.set(name, (counts.get(name) || 0) + 1);
    });

    const extras = [...counts.keys()]
      .filter((name) => !CATEGORIAS_COMUNES.includes(name))
      .sort((a, b) => a.localeCompare(b, 'es'));

    const ordered = [...CATEGORIAS_COMUNES, ...extras].filter((name) => counts.has(name));

    return [
      { name: 'Todos', count: servicios.length },
      ...ordered.map((name) => ({ name, count: counts.get(name) })),
    ];
  }, [servicios]);

  const categoriaOptions = useMemo(() => {
    const extras = [...new Set(servicios.map((item) => item.categoria).filter(Boolean))]
      .filter((name) => !CATEGORIAS_COMUNES.includes(name))
      .sort((a, b) => a.localeCompare(b, 'es'));
    return [...CATEGORIAS_COMUNES, ...extras];
  }, [servicios]);

  const filtrados = useMemo(() => {
    const term = queryText.trim().toLowerCase();
    return servicios.filter((item) => {
      const matchesCategory = categoria === 'Todos' || item.categoria === categoria;
      const matchesTerm =
        !term ||
        item.nombre.toLowerCase().includes(term) ||
        item.categoria.toLowerCase().includes(term);
      return matchesCategory && matchesTerm;
    });
  }, [servicios, categoria, queryText]);

  const openCreate = () => {
    setError('');
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (servicio) => {
    setError('');
    setEditingId(servicio.id);
    setForm({
      nombre: servicio.nombre,
      categoria: servicio.categoria,
      precioBase: String(servicio.precioBase),
      tipoComision: servicio.tipoComision,
      comisionDefecto: String(servicio.comisionDefecto),
      imagen: servicio.imagen || '',
    });
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingId(null);
  }, []);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const save = async () => {
    if (!form.nombre.trim()) {
      setError('Escribe el nombre del servicio.');
      return;
    }
    if (toNumber(form.precioBase) <= 0) {
      setError('El precio base debe ser mayor a 0.');
      return;
    }
    if (toNumber(form.comisionDefecto) < 0) {
      setError('La comisión no puede ser negativa.');
      return;
    }
    if (form.tipoComision === 'porcentaje' && toNumber(form.comisionDefecto) > 100) {
      setError('La comisión porcentual no puede ser mayor a 100.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await actualizarServicio(editingId, form);
        setToast('Servicio actualizado.');
      } else {
        await crearServicio(form);
        setToast('Servicio creado.');
      }
      closeModal();
      window.setTimeout(() => setToast(''), 3200);
    } catch (cause) {
      setError(cause?.message || 'No se pudo guardar el servicio.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    setSaving(true);
    setError('');
    try {
      await eliminarServicio(id);
      setConfirmId(null);
      setToast('Servicio eliminado.');
      window.setTimeout(() => setToast(''), 3200);
    } catch (cause) {
      setError(cause?.message || 'No se pudo eliminar el servicio.');
    } finally {
      setSaving(false);
    }
  };

  return {
    servicios,
    filtrados,
    categorias,
    categoriaOptions,
    loading,
    saving,
    error,
    toast,
    setToast,
    queryText,
    setQueryText,
    categoria,
    setCategoria,
    modalOpen,
    editingId,
    form,
    updateForm,
    openCreate,
    openEdit,
    closeModal,
    save,
    confirmId,
    setConfirmId,
    remove,
  };
}
