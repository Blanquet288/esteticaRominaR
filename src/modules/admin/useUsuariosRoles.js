import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  actualizarPermisosMasivo,
  actualizarUsuario,
  crearRol,
  crearUsuarioSistema,
  emptyPermisos,
  enviarResetPassword,
  patchBloque,
  patchModulo,
  patchNode,
  PERMISOS_MODULOS,
  subscribeRoles,
  subscribeUsuarios,
} from '../../services/rbacService';

const EMPTY_ROL_FORM = {
  nombre: '',
  descripcion: '',
  permisos: emptyPermisos(),
};

const EMPTY_USER_FORM = {
  nombre: '',
  email: '',
  password: '',
  rolId: 'admin',
};

export default function useUsuariosRoles() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState('usuarios');
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_ROL_FORM);
  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);
  const [editingRolId, setEditingRolId] = useState('');

  useEffect(() => {
    let rolesReady = false;
    let usersReady = false;
    const maybeDone = () => {
      if (rolesReady && usersReady) setLoading(false);
    };

    const unsubRoles = subscribeRoles(
      (rows) => {
        setRoles(rows);
        rolesReady = true;
        maybeDone();
      },
      (cause) => {
        setError(cause?.message || 'No se pudieron cargar los roles.');
        rolesReady = true;
        maybeDone();
      },
    );

    const unsubUsers = subscribeUsuarios(
      (rows) => {
        setUsuarios(rows);
        usersReady = true;
        maybeDone();
      },
      (cause) => {
        setError(cause?.message || 'No se pudieron cargar los usuarios.');
        usersReady = true;
        maybeDone();
      },
    );

    return () => {
      unsubRoles();
      unsubUsers();
    };
  }, []);

  const rolesMap = useMemo(
    () => Object.fromEntries(roles.map((item) => [item.id, item])),
    [roles],
  );

  const editingRol = editingRolId ? rolesMap[editingRolId] || null : null;

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3600);
  };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateUserForm = (field, value) => {
    setUserForm((current) => ({ ...current, [field]: value }));
  };

  const applyFormPatch = (patch) => {
    setForm((current) => ({
      ...current,
      permisos: { ...current.permisos, ...patch },
    }));
  };

  const toggleFormPermiso = (item, value) => {
    applyFormPatch(patchNode(item, value));
  };

  const setFormModulo = (modulo, enabled) => {
    applyFormPatch(patchModulo(modulo, enabled));
  };

  const setFormBloque = (modulo, enabled) => {
    applyFormPatch(patchBloque(modulo, enabled));
  };

  const closeModal = useCallback(() => {
    setModal(null);
    setEditingRolId('');
    setForm(EMPTY_ROL_FORM);
    setUserForm(EMPTY_USER_FORM);
    setError('');
  }, []);

  const openCreateRol = useCallback(() => {
    setError('');
    setEditingRolId('');
    setForm({ ...EMPTY_ROL_FORM, permisos: emptyPermisos() });
    setModal('rol-create');
  }, []);

  const openEditRol = useCallback((rol) => {
    setError('');
    setEditingRolId(rol.id);
    setModal('rol-edit');
  }, []);

  const openCreateUser = useCallback(() => {
    setError('');
    setUserForm({
      ...EMPTY_USER_FORM,
      rolId: roles.some((item) => item.id === 'admin') ? 'admin' : roles[0]?.id || '',
    });
    setModal('user-create');
  }, [roles]);

  const saveRol = async () => {
    setSaving(true);
    setError('');
    try {
      await crearRol(form);
      showToast('Rol creado.');
      closeModal();
    } catch (cause) {
      setError(cause?.message || 'No se pudo crear el rol.');
    } finally {
      setSaving(false);
    }
  };

  const saveUsuario = async () => {
    setSaving(true);
    setError('');
    try {
      await crearUsuarioSistema(userForm);
      showToast('Usuario creado. Ya puede iniciar sesión.');
      closeModal();
    } catch (cause) {
      setError(cause?.message || 'No se pudo crear el usuario.');
    } finally {
      setSaving(false);
    }
  };

  const togglePermiso = async (rolId, item, value) => {
    setError('');
    try {
      await actualizarPermisosMasivo(rolId, patchNode(item, value));
    } catch (cause) {
      setError(cause?.message || 'No se pudo actualizar el permiso.');
    }
  };

  const setModulo = async (rolId, modulo, enabled) => {
    setError('');
    try {
      await actualizarPermisosMasivo(rolId, patchModulo(modulo, enabled));
    } catch (cause) {
      setError(cause?.message || 'No se pudo actualizar el módulo.');
    }
  };

  const setBloque = async (rolId, modulo, enabled) => {
    setError('');
    try {
      await actualizarPermisosMasivo(rolId, patchBloque(modulo, enabled));
    } catch (cause) {
      setError(cause?.message || 'No se pudieron actualizar los permisos.');
    }
  };

  const changeUsuarioRol = async (usuarioId, rolId) => {
    if (usuarioId === user?.uid && profile?.rolId === 'admin' && rolId !== 'admin') {
      const otherAdmins = usuarios.filter(
        (item) => item.id !== usuarioId && item.rolId === 'admin' && item.activo,
      );
      if (!otherAdmins.length) {
        setError('No puedes quitarte el rol de administrador si eres la única cuenta admin.');
        return;
      }
    }

    setError('');
    try {
      await actualizarUsuario(usuarioId, { rolId });
      showToast('Rol asignado.');
    } catch (cause) {
      setError(cause?.message || 'No se pudo asignar el rol.');
    }
  };

  const toggleUsuarioActivo = async (usuario) => {
    if (usuario.id === user?.uid && usuario.activo) {
      setError('No puedes desactivar tu propia cuenta.');
      return;
    }

    setError('');
    try {
      await actualizarUsuario(usuario.id, { activo: !usuario.activo });
      showToast(usuario.activo ? 'Usuario desactivado.' : 'Usuario activado.');
    } catch (cause) {
      setError(cause?.message || 'No se pudo actualizar el usuario.');
    }
  };

  const resetPassword = async (usuario) => {
    setError('');
    try {
      await enviarResetPassword(usuario.email);
      showToast(`Enviamos el correo de recuperación a ${usuario.email}.`);
    } catch (cause) {
      setError(cause?.message || 'No se pudo enviar el correo de recuperación.');
    }
  };

  return {
    tab,
    setTab,
    usuarios,
    roles,
    rolesMap,
    loading,
    saving,
    error,
    toast,
    setToast,
    modal,
    form,
    userForm,
    updateForm,
    updateUserForm,
    toggleFormPermiso,
    setFormModulo,
    setFormBloque,
    openCreateRol,
    openEditRol,
    openCreateUser,
    closeModal,
    saveRol,
    saveUsuario,
    editingRol,
    togglePermiso,
    setModulo,
    setBloque,
    changeUsuarioRol,
    toggleUsuarioActivo,
    resetPassword,
    currentUid: user?.uid,
    permisosModulos: PERMISOS_MODULOS,
  };
}
