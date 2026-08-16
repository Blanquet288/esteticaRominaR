import { useEffect, useState } from 'react';
import { Pencil, Plus, Scissors, Search, Sparkles, Trash2, X } from 'lucide-react';
import { formatMoney } from '../../services/dashboardService';
import useCatalogo from './useCatalogo';
import './CatalogoPage.css';

function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 3200);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className="catalogo-toast" role="status">
      {message}
    </div>
  );
}

function ServiceThumb({ src, alt }) {
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(src) && !broken;

  return (
    <span className={`catalogo-thumb ${showImage ? 'has-image' : ''}`}>
      {showImage ? (
        <img src={src} alt={alt} onError={() => setBroken(true)} />
      ) : (
        <Scissors size={22} />
      )}
    </span>
  );
}

function commissionLabel(servicio) {
  if (servicio.tipoComision === 'fijo') {
    return `Comisión: ${formatMoney(servicio.comisionDefecto)} fija`;
  }
  return `Comisión: ${servicio.comisionDefecto}%`;
}

export default function CatalogoPage() {
  const catalogo = useCatalogo();

  useEffect(() => {
    if (!catalogo.modalOpen && !catalogo.confirmId) return undefined;
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      if (catalogo.confirmId) catalogo.setConfirmId(null);
      else catalogo.closeModal();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [catalogo.modalOpen, catalogo.confirmId, catalogo.closeModal, catalogo.setConfirmId]);

  return (
    <div className="catalogo-page">
      <header className="catalogo-hero">
        <div>
          <p className="catalogo-kicker">Servicios del estudio</p>
          <h2>Catálogo</h2>
          <p>Administra tratamientos, precios y comisiones que usa el corte diario.</p>
        </div>
        <button type="button" className="catalogo-add is-header" onClick={catalogo.openCreate}>
          <Plus size={16} />
          Nuevo servicio
        </button>
      </header>

      <label className="catalogo-search">
        <Search size={16} />
        <input
          type="search"
          placeholder="Buscar por nombre o categoría…"
          value={catalogo.queryText}
          onChange={(event) => catalogo.setQueryText(event.target.value)}
        />
      </label>

      <div className="catalogo-pills">
        {catalogo.categorias.map((item) => (
          <button
            key={item.name}
            type="button"
            className={`catalogo-pill ${catalogo.categoria === item.name ? 'is-active' : ''}`}
            onClick={() => catalogo.setCategoria(item.name)}
          >
            {item.name}
            <em>{item.count}</em>
          </button>
        ))}
      </div>

      <button type="button" className="catalogo-add is-inline" onClick={catalogo.openCreate}>
        <Plus size={16} />
        Nuevo servicio
      </button>

      {catalogo.error ? <p className="catalogo-error">{catalogo.error}</p> : null}

      {catalogo.loading ? (
        <div className="catalogo-empty">Cargando catálogo…</div>
      ) : catalogo.filtrados.length ? (
        <section className="catalogo-grid">
          {catalogo.filtrados.map((servicio) => (
            <article key={servicio.id} className="catalogo-card">
              <ServiceThumb src={servicio.imagen} alt={servicio.nombre} />
              <span className="catalogo-badge">{servicio.categoria}</span>
              <strong>{servicio.nombre}</strong>
              <em>{formatMoney(servicio.precioBase)}</em>
              <small>{commissionLabel(servicio)}</small>
              <div className="catalogo-actions">
                <button type="button" onClick={() => catalogo.openEdit(servicio)}>
                  <Pencil size={14} />
                  Editar
                </button>
                <button type="button" onClick={() => catalogo.setConfirmId(servicio.id)}>
                  <Trash2 size={14} />
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="catalogo-empty">
          <Sparkles size={22} />
          <p>No hay servicios que coincidan con la búsqueda.</p>
        </div>
      )}

      {catalogo.modalOpen ? (
        <div className="catalogo-overlay" onClick={catalogo.closeModal} role="presentation">
          <form
            className="catalogo-modal"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              catalogo.save();
            }}
          >
            <button
              type="button"
              className="catalogo-close"
              onClick={catalogo.closeModal}
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
            <p className="catalogo-kicker">
              {catalogo.editingId ? 'Editar servicio' : 'Nuevo servicio'}
            </p>
            <h3>{catalogo.editingId ? 'Actualizar ficha' : 'Agregar al catálogo'}</h3>

            <label className="catalogo-field">
              Nombre del servicio
              <input
                type="text"
                placeholder="Corte dama, tinte, manicure…"
                value={catalogo.form.nombre}
                onChange={(event) => catalogo.updateForm('nombre', event.target.value)}
                required
              />
            </label>

            <label className="catalogo-field">
              Categoría
              <input
                type="text"
                list="catalogo-categorias"
                placeholder="Elige o escribe una categoría"
                value={catalogo.form.categoria}
                onChange={(event) => catalogo.updateForm('categoria', event.target.value)}
              />
              <datalist id="catalogo-categorias">
                {catalogo.categoriaOptions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </label>

            <label className="catalogo-field">
              Precio base ($ MXN)
              <input
                type="number"
                min="0"
                step="0.01"
                value={catalogo.form.precioBase}
                onChange={(event) => catalogo.updateForm('precioBase', event.target.value)}
                required
              />
            </label>

            <div className="catalogo-field">
              Tipo de comisión
              <div className="comision-toggle">
                <button
                  type="button"
                  className={catalogo.form.tipoComision === 'porcentaje' ? 'is-active' : ''}
                  onClick={() => catalogo.updateForm('tipoComision', 'porcentaje')}
                >
                  Porcentaje (%)
                </button>
                <button
                  type="button"
                  className={catalogo.form.tipoComision === 'fijo' ? 'is-active' : ''}
                  onClick={() => catalogo.updateForm('tipoComision', 'fijo')}
                >
                  Monto fijo ($)
                </button>
              </div>
            </div>

            <label className="catalogo-field">
              {catalogo.form.tipoComision === 'fijo'
                ? 'Comisión por defecto ($ MXN)'
                : 'Comisión por defecto (%)'}
              <input
                type="number"
                min="0"
                step={catalogo.form.tipoComision === 'fijo' ? '0.01' : '0.1'}
                value={catalogo.form.comisionDefecto}
                onChange={(event) => catalogo.updateForm('comisionDefecto', event.target.value)}
                required
              />
            </label>

            <label className="catalogo-field">
              URL de imagen
              <input
                type="text"
                placeholder="https://… o ruta local"
                value={catalogo.form.imagen}
                onChange={(event) => catalogo.updateForm('imagen', event.target.value)}
              />
            </label>

            <div className="catalogo-preview">
              <ServiceThumb src={catalogo.form.imagen} alt="Vista previa" />
              <span>{catalogo.form.imagen ? 'Vista previa' : 'Sin imagen'}</span>
            </div>

            <button type="submit" className="catalogo-submit" disabled={catalogo.saving}>
              {catalogo.saving
                ? 'Guardando…'
                : catalogo.editingId
                  ? 'Guardar cambios'
                  : 'Crear servicio'}
            </button>
          </form>
        </div>
      ) : null}

      {catalogo.confirmId ? (
        <div
          className="catalogo-overlay"
          onClick={() => catalogo.setConfirmId(null)}
          role="presentation"
        >
          <div className="catalogo-modal is-confirm" onClick={(event) => event.stopPropagation()}>
            <h3>¿Eliminar este servicio?</h3>
            <p>Dejará de aparecer en el catálogo y en el corte diario.</p>
            <div className="catalogo-confirm">
              <button type="button" onClick={() => catalogo.setConfirmId(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="is-danger"
                onClick={() => catalogo.remove(catalogo.confirmId)}
                disabled={catalogo.saving}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {catalogo.toast ? (
        <Toast message={catalogo.toast} onClose={() => catalogo.setToast('')} />
      ) : null}
    </div>
  );
}
