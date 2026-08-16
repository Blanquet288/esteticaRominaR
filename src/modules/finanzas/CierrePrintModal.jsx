import { Printer, X } from 'lucide-react';

export const DEFAULT_CIERRE_SECTIONS = {
  resumen: true,
  cuadre: true,
  empleadas: true,
  gastos: true,
  anexo: false,
  firmas: true,
};

const OPTIONS = [
  {
    id: 'resumen',
    label: 'Resumen financiero general y reparto de socias',
    hint: 'Incluido siempre · bloque principal del cierre',
    required: true,
  },
  {
    id: 'cuadre',
    label: 'Cuadre por semanas',
    hint: 'Semana 1 a 4: neto, gastos y caja',
  },
  {
    id: 'empleadas',
    label: 'Rendimiento y comisiones por empleada',
    hint: 'Generado, comisión y utilidad aportada',
  },
  {
    id: 'gastos',
    label: 'Desglose de gastos del mes',
    hint: 'Fijos y operativos',
  },
  {
    id: 'anexo',
    label: 'Anexo de ganancias diarias por día',
    hint: 'Listado completo de días y colaboradoras',
  },
  {
    id: 'firmas',
    label: 'Cuadro de firmas de conformidad',
    hint: 'Espacio para socias administradoras',
  },
];

export default function CierrePrintModal({ sections, onToggle, onClose, onPrint }) {
  return (
    <div className="cierre-overlay no-print" onClick={onClose} role="presentation">
      <div
        className="cierre-modal is-print"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cierre-print-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="cierre-close" onClick={onClose} aria-label="Cerrar">
          <X size={18} />
        </button>
        <p className="cierre-kicker">Exportar</p>
        <h3 id="cierre-print-title">Personalizar e imprimir reporte de cierre</h3>
        <p>Elige las secciones del documento. Luego abre el diálogo nativo para imprimir o guardar PDF.</p>

        <div className="cierre-print-options">
          {OPTIONS.map((option) => (
            <label
              key={option.id}
              className={`cierre-print-option ${option.required ? 'is-required' : ''} ${
                sections[option.id] ? 'is-on' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={Boolean(sections[option.id])}
                disabled={option.required}
                onChange={() => onToggle(option.id)}
              />
              <span>
                <strong>{option.label}</strong>
                <small>{option.hint}</small>
              </span>
            </label>
          ))}
        </div>

        <div className="cierre-print-actions">
          <button type="button" className="cierre-btn is-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="cierre-btn" onClick={onPrint}>
            <Printer size={16} />
            Imprimir / Exportar a PDF
          </button>
        </div>
      </div>
    </div>
  );
}
