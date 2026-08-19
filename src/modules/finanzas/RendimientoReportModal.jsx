import { Search, X } from 'lucide-react';

const SCOPES = [
  { id: 'equipo', label: 'Todo el equipo', hint: 'Todas las empleadas con ventas en el mes' },
  { id: 'manual', label: 'Selección manual', hint: 'Marca o desmarca a quien quieras incluir' },
  { id: 'especifico', label: 'Empleado específico', hint: 'Elige una sola colaboradora' },
];

const FORMATS = [
  { id: 'recibos', label: 'Recibos individuales de pago', hint: 'Una hoja por persona, con firmas' },
  { id: 'resumen', label: 'Resumen general consolidado', hint: 'Una tabla ejecutiva del salón' },
];

const VIEWS = [
  {
    id: 'incentivos',
    label: 'Vista Incentivos / Personal',
    hint: 'Para entregar al equipo: servicios, comisiones y logros. Sin utilidad del negocio.',
  },
  {
    id: 'admin',
    label: 'Vista Administrativa',
    hint: 'Completa: bruto, comisión pagada y utilidad neta interna.',
  },
];

export default function RendimientoReportModal({
  staff,
  scope,
  format,
  view,
  selectedIds,
  search,
  allowedViews,
  onScope,
  onFormat,
  onView,
  onToggle,
  onSearch,
  onPickOne,
  onClose,
  onPrint,
}) {
  const filtered = staff.filter((item) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return `${item.nombre} ${item.rol}`.toLowerCase().includes(term);
  });

  const canPrint = selectedIds.length > 0;
  const visibleViews = VIEWS.filter((item) => !allowedViews?.length || allowedViews.includes(item.id));

  return (
    <div className="rend-overlay no-print" onClick={onClose} role="presentation">
      <div
        className="rend-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="rend-close" onClick={onClose} aria-label="Cerrar">
          <X size={18} />
        </button>
        <p className="rend-kicker">Exportar</p>
        <h3 id="report-modal-title">Generar reporte</h3>
        <p>Elige el alcance y el formato. Luego abre el diálogo nativo para imprimir o guardar PDF.</p>

        <div className="report-block">
          <span>Alcance</span>
          <div className="report-options">
            {SCOPES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={scope === item.id ? 'is-active' : ''}
                onClick={() => onScope(item.id)}
              >
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </button>
            ))}
          </div>
        </div>

        {scope === 'manual' ? (
          <div className="report-block">
            <span>Empleadas a incluir</span>
            <div className="report-checks">
              {staff.map((item) => (
                <label key={item.id}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => onToggle(item.id)}
                  />
                  <em>{item.nombre}</em>
                  <small>{item.rol}</small>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {scope === 'especifico' ? (
          <div className="report-block">
            <span>Empleada</span>
            <label className="report-search">
              <Search size={15} />
              <input
                type="search"
                placeholder="Buscar por nombre…"
                value={search}
                onChange={(event) => onSearch(event.target.value)}
              />
            </label>
            <div className="report-checks is-single">
              {filtered.map((item) => (
                <label key={item.id}>
                  <input
                    type="radio"
                    name="empleado-especifico"
                    checked={selectedIds[0] === item.id}
                    onChange={() => onPickOne(item.id)}
                  />
                  <em>{item.nombre}</em>
                  <small>{item.rol}</small>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {visibleViews.length > 1 ? (
          <div className="report-block">
            <span>Tipo de contenido</span>
            <div className="report-options">
              {visibleViews.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={view === item.id ? 'is-active' : ''}
                  onClick={() => onView(item.id)}
                >
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="report-block">
          <span>Formato de reporte</span>
          <div className="report-options">
            {FORMATS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={format === item.id ? 'is-active' : ''}
                onClick={() => onFormat(item.id)}
              >
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </button>
            ))}
          </div>
        </div>

        <button type="button" className="print-btn" onClick={onPrint} disabled={!canPrint}>
          Imprimir / Exportar PDF
        </button>
      </div>
    </div>
  );
}
