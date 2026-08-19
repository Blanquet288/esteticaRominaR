import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  Clock3,
  Flower2,
  Minus,
  Plus,
  Scissors,
  Search,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { formatMoney, toNumber } from '../../services/dashboardService';
import { esComisionMontoFijo } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import {
  createDraftFromServicio,
  previewDraft,
} from '../../services/ventasService';
import useCorteDiario from './useCorteDiario';
import './VentasPage.css';

function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 3200);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className="ventas-toast" role="status">
      {message}
    </div>
  );
}

function QuantityModal({ draft, onChange, onClose, onConfirm }) {
  const preview = useMemo(() => previewDraft(draft), [draft]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const setCantidad = (value) => {
    if (value === '') {
      onChange({ ...draft, cantidad: '' });
      return;
    }

    const parsed = parseInt(value, 10);
    onChange({ ...draft, cantidad: Number.isNaN(parsed) ? '' : Math.max(1, parsed) });
  };

  const normalizeCantidad = () => Math.max(1, parseInt(draft.cantidad, 10) || 1);

  return (
    <div className="qty-overlay" onClick={onClose} role="presentation">
      <div
        className="qty-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qty-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="qty-close" onClick={onClose} aria-label="Cerrar">
          <X size={18} />
        </button>

        <p className="qty-kicker">{draft.servicio.categoria}</p>
        <h3 id="qty-modal-title">{draft.servicio.nombre}</h3>

        <label className="qty-field">
          Cantidad
          <input
            type="number"
            min="1"
            step="1"
            autoFocus
            value={draft.cantidad}
            onChange={(event) => setCantidad(event.target.value)}
            onBlur={() => {
              if (draft.cantidad === '' || Number(draft.cantidad) < 1) {
                onChange({ ...draft, cantidad: 1 });
              }
            }}
          />
        </label>

        <div className="qty-quick">
          {[1, 5, 10].map((step) => (
            <button
              key={step}
              type="button"
              onClick={() =>
                setCantidad(Math.max(1, (Number(draft.cantidad) || 0) + step))
              }
            >
              +{step}
            </button>
          ))}
        </div>

        <div className="qty-grid">
          <label className="qty-field">
            Precio unitario
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.precioUnitario}
              onChange={(event) =>
                onChange({ ...draft, precioUnitario: toNumber(event.target.value) })
              }
            />
          </label>
          {!esComisionMontoFijo(draft.comisionTipo) ? (
            <label className="qty-field">
              Comisión %
              <input
                type="number"
                min="0"
                step="0.1"
                value={draft.comisionPct}
                onChange={(event) =>
                  onChange({ ...draft, comisionPct: toNumber(event.target.value) })
                }
              />
            </label>
          ) : (
            <label className="qty-field">
              Comisión grupo $
              <input
                type="number"
                min="0"
                step="0.01"
                value={preview.comisionMonto}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    comisionUnitaria:
                      draft.cantidad ? toNumber(event.target.value) / draft.cantidad : 0,
                  })
                }
              />
            </label>
          )}
        </div>

        <div className="qty-preview">
          <div>
            <span>Subtotal</span>
            <strong>{formatMoney(preview.monto)}</strong>
          </div>
          <div>
            <span>Comisión</span>
            <strong>{formatMoney(preview.comisionMonto)}</strong>
          </div>
          <div>
            <span>Utilidad</span>
            <strong>{formatMoney(preview.utilidadNegocio)}</strong>
          </div>
        </div>

        <button
          type="button"
          className="qty-confirm"
          onClick={() => onConfirm({ ...draft, cantidad: normalizeCantidad() })}
        >
          Agregar al corte
        </button>
      </div>
    </div>
  );
}

function VentasSkeleton() {
  return (
    <div className="ventas-page">
      <div className="skeleton-line skeleton-title" />
      <div className="ventas-toolbar">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="skeleton-line skeleton-field" />
        ))}
      </div>
      <div className="ventas-layout">
        <div className="skeleton-panel" />
        <div className="skeleton-panel" />
      </div>
    </div>
  );
}

export default function VentasPage() {
  const corte = useCorteDiario();
  const { hasPermission } = useAuth();
  const [popId, setPopId] = useState('');
  const [draft, setDraft] = useState(null);
  const canRapida = hasPermission('ventas_rapida');
  const canCorte = hasPermission('ventas_corte_empleada');

  useEffect(() => {
    if (canCorte && !canRapida) corte.changeMode('corte');
    else if (canRapida && !canCorte) corte.changeMode('historico');
  }, [canRapida, canCorte, corte.changeMode]);

  const openQuantityModal = (servicio) => {
    setPopId(servicio.id);
    setDraft(createDraftFromServicio(servicio));
    window.setTimeout(() => setPopId(''), 380);
  };

  const confirmDraft = (nextDraft) => {
    corte.addServicio(nextDraft.servicio, nextDraft);
    setDraft(null);
  };

  if (corte.loading) {
    return <VentasSkeleton />;
  }

  if (!canRapida && !canCorte) {
    return (
      <div className="ventas-page">
        <header className="ventas-hero">
          <p className="ventas-kicker">Registro de ventas</p>
          <h2>Registrar ventas</h2>
          <p>Tu rol puede entrar a este módulo, pero no tiene una modalidad de registro asignada.</p>
        </header>
      </div>
    );
  }

  return (
    <div className="ventas-page">
      <header className="ventas-hero">
        <p className="ventas-kicker">Registro de ventas</p>
        <h2>
          {corte.mode === 'historico' ? 'Venta rápida' : 'Corte masivo por empleada'}
        </h2>
        <p>
          {corte.mode === 'historico'
            ? 'Captura el monto global del día sin desglosar servicios del catálogo.'
            : 'Selecciona el turno, arma el corte desde el catálogo y congela comisiones al guardar.'}
        </p>
      </header>

      {canRapida && canCorte ? (
        <nav className="ventas-modes" aria-label="Modalidad de registro">
          <button
            type="button"
            className={`mode-tab ${corte.mode === 'historico' ? 'is-active' : ''}`}
            onClick={() => corte.changeMode('historico')}
            aria-pressed={corte.mode === 'historico'}
          >
            <Banknote size={14} />
            Venta rápida
          </button>
          <button
            type="button"
            className={`mode-tab ${corte.mode === 'corte' ? 'is-active' : ''}`}
            onClick={() => corte.changeMode('corte')}
            aria-pressed={corte.mode === 'corte'}
          >
            <Scissors size={14} />
            Corte masivo
          </button>
        </nav>
      ) : null}

      <section className="ventas-toolbar">
        <label className="field-block">
          <span>
            <CalendarDays size={15} /> Fecha
          </span>
          <input
            type="date"
            value={corte.fecha}
            onChange={(event) => corte.setFecha(event.target.value)}
          />
        </label>

        <label className="field-block">
          <span>
            <UserRound size={15} /> Empleada
          </span>
          <select
            value={corte.idEmpleado}
            onChange={(event) => corte.setIdEmpleado(event.target.value)}
          >
            <option value="">Selecciona personal</option>
            {corte.empleados.map((empleado) => (
              <option key={empleado.id} value={empleado.id}>
                {empleado.nombre || empleado.id}
              </option>
            ))}
          </select>
        </label>

        <label className="field-block">
          <span>
            <Clock3 size={15} /> Turno
          </span>
          <select
            value={corte.turnoId}
            onChange={(event) => corte.setTurnoId(event.target.value)}
          >
            <option value="">
              {corte.isDescanso ? 'Elegir turno manual' : 'Turno automático'}
            </option>
            {corte.turnoId && !corte.turnos[corte.turnoId] ? (
              <option value={corte.turnoId}>{corte.turnoNombre}</option>
            ) : null}
            {Object.entries(corte.turnos)
              .filter(([id]) => id !== '__descanso__')
              .map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
          </select>
        </label>
      </section>

      {corte.isDescanso ? (
        <p className="turno-warning">
          <AlertTriangle size={16} />
          {corte.empleado?.nombre || 'Esta empleada'} tiene descanso el {corte.diaEtiqueta}.
          Puedes asignar un turno manualmente si el registro aplica.
        </p>
      ) : null}

      {corte.error ? <p className="ventas-error">{corte.error}</p> : null}

      {corte.mode === 'historico' ? (
        <section className="historico-panel">
          <div className="historico-money">
            <label className="field-block">
              <span>Monto total bruto ($ MXN)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={corte.montoTotal}
                onChange={(event) => corte.setMontoTotal(event.target.value)}
              />
            </label>
            <label className="field-block">
              <span>Comisión de la empleada ($ MXN)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={corte.comisionHistorico}
                onChange={(event) => corte.setComisionHistorico(event.target.value)}
              />
            </label>
          </div>

          <article className="utilidad-card">
            <span>Utilidad neta del negocio</span>
            <strong>{formatMoney(corte.utilidadHistorico)}</strong>
            <small>Monto total menos comisión de la empleada.</small>
          </article>

          <button
            type="button"
            className="save-corte"
            onClick={corte.saveHistorico}
            disabled={corte.saving}
          >
            {corte.saving ? 'Guardando…' : 'Guardar histórico diario'}
          </button>
        </section>
      ) : (
      <div className="ventas-layout">
        <section className="catalog-panel">
          <div className="catalog-tools">
            <label className="search-field">
              <Search size={16} />
              <input
                type="search"
                placeholder="Buscar servicio..."
                value={corte.queryText}
                onChange={(event) => corte.setQueryText(event.target.value)}
              />
            </label>
            <div className="category-pills">
              {corte.categorias.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`pill ${corte.categoria === item ? 'is-active' : ''}`}
                  onClick={() => corte.setCategoria(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {corte.serviciosFiltrados.length ? (
            <div className="service-grid">
              {corte.serviciosFiltrados.map((servicio) => (
                <button
                  key={servicio.id}
                  type="button"
                  className={`service-card ${popId === servicio.id ? 'is-pop' : ''}`}
                  onClick={() => openQuantityModal(servicio)}
                >
                  <span className="service-thumb">
                    {servicio.imagen ? (
                      <img src={servicio.imagen} alt="" />
                    ) : (
                      <Sparkles size={18} />
                    )}
                  </span>
                  <strong>{servicio.nombre}</strong>
                  <small>{servicio.categoria}</small>
                  <em>{formatMoney(servicio.precioBase)}</em>
                </button>
              ))}
            </div>
          ) : (
            <div className="catalog-empty">
              <Flower2 size={22} />
              <p>No hay servicios que coincidan con la búsqueda.</p>
            </div>
          )}
        </section>

        <aside className="corte-panel">
          <div className="corte-heading">
            <h3>Resumen del corte</h3>
            <p>
              {corte.empleado?.nombre || 'Sin empleada'} · {corte.turnoNombre || 'Sin turno'}
            </p>
          </div>

          {corte.items.length ? (
            <ul className="corte-list">
              {corte.items.map((item) => (
                <li key={item.localId} className="corte-item">
                  <div className="corte-item-top">
                    <div>
                      <strong>
                        {item.servicio} × {item.cantidad}
                      </strong>
                      <small>
                        {esComisionMontoFijo(item.comisionTipo) ? 'Comisión fija' : 'Comisión %'} ·{' '}
                        {formatMoney(item.precioUnitario)} c/u
                      </small>
                    </div>
                    <button
                      type="button"
                      className="icon-remove"
                      onClick={() => corte.removeItem(item.localId)}
                      aria-label={`Quitar ${item.servicio}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="qty-stepper">
                    <button
                      type="button"
                      onClick={() => corte.changeQuantity(item.localId, -1)}
                      aria-label="Quitar uno"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.cantidad}
                      onChange={(event) =>
                        corte.updateItem(item.localId, 'cantidad', event.target.value)
                      }
                    />
                    <button
                      type="button"
                      onClick={() => corte.changeQuantity(item.localId, 1)}
                      aria-label="Agregar uno"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="corte-fields">
                    <label>
                      Precio unitario
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.precioUnitario}
                        onChange={(event) =>
                          corte.updateItem(item.localId, 'precioUnitario', event.target.value)
                        }
                      />
                    </label>
                    {!esComisionMontoFijo(item.comisionTipo) ? (
                      <label>
                        Comisión %
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={item.comisionPct}
                          onChange={(event) =>
                            corte.updateItem(item.localId, 'comisionPct', event.target.value)
                          }
                        />
                      </label>
                    ) : (
                      <label>
                        Comisión $
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.comisionMonto}
                          onChange={(event) =>
                            corte.updateItem(item.localId, 'comisionMonto', event.target.value)
                          }
                        />
                      </label>
                    )}
                  </div>

                  <div className="corte-mini-totals">
                    <span>Subtotal {formatMoney(item.monto)}</span>
                    <span>Comisión {formatMoney(item.comisionMonto)}</span>
                    <span>Utilidad {formatMoney(item.utilidadNegocio)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="corte-empty">
              <p>Toca un servicio del catálogo para armar el corte.</p>
            </div>
          )}

          <div className="corte-totals">
            <div>
              <span>Subtotal</span>
              <strong>{formatMoney(corte.totals.subtotal)}</strong>
            </div>
            <div>
              <span>Comisión empleada</span>
              <strong>{formatMoney(corte.totals.comision)}</strong>
            </div>
            <div className="is-emphasis">
              <span>Utilidad negocio</span>
              <strong>{formatMoney(corte.totals.utilidad)}</strong>
            </div>
          </div>

          <button
            type="button"
            className="save-corte"
            onClick={corte.save}
            disabled={corte.saving}
          >
            {corte.saving ? 'Guardando…' : 'Guardar corte diario'}
          </button>
        </aside>
      </div>
      )}

      {draft ? (
        <QuantityModal
          draft={draft}
          onChange={setDraft}
          onClose={() => setDraft(null)}
          onConfirm={confirmDraft}
        />
      ) : null}

      {corte.toast ? (
        <Toast message={corte.toast} onClose={() => corte.setToast('')} />
      ) : null}
    </div>
  );
}
