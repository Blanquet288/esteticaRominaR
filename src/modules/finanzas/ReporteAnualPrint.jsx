import PrintLogo from '../../components/print/PrintLogo';
import { formatMoney } from '../../services/dashboardService';

function emissionDate() {
  return new Date().toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatMargen(ventas, gananciaNeta) {
  if (!ventas) return '—';
  return `${((gananciaNeta / ventas) * 100).toFixed(1)}%`;
}

export default function ReporteAnualPrint({
  year,
  empresa,
  socio1,
  socio2,
  totals,
  months,
  ranking,
  mesEstrella,
  mesMenor,
  logo,
}) {
  return (
    <article className="anual-print">
      <header className="anual-print-head">
        <PrintLogo src={logo} alt={empresa} />
        <p>
          {empresa} — Reporte ejecutivo anual {year}
        </p>
        <h1>Estética Romina</h1>
        <h2>Reporte ejecutivo anual {year}</h2>
        <div className="anual-print-meta">
          <span>Fecha de emisión: {emissionDate()}</span>
          {mesEstrella ? <span>Mes récord: {mesEstrella.label}</span> : null}
          {mesMenor ? <span>Mes más bajo: {mesMenor.label}</span> : null}
        </div>
      </header>

      <section>
        <h3>Resumen del ejercicio</h3>
        <div className="anual-print-kpis">
          <div>
            <span>Facturación total</span>
            <strong>{formatMoney(totals.ventas)}</strong>
          </div>
          <div>
            <span>Gastos totales</span>
            <strong>{formatMoney(totals.gastos)}</strong>
          </div>
          <div>
            <span>Comisiones pagadas</span>
            <strong>{formatMoney(totals.comisiones)}</strong>
          </div>
          <div>
            <span>Ganancia neta anual</span>
            <strong>{formatMoney(totals.gananciaNeta)}</strong>
          </div>
          <div>
            <span>Margen anual</span>
            <strong>{formatMargen(totals.ventas, totals.gananciaNeta)}</strong>
          </div>
        </div>
      </section>

      <section>
        <h3>Tabla ejecutiva · Enero a diciembre</h3>
        <table className="anual-print-table">
          <thead>
            <tr>
              <th>Mes</th>
              <th>Ventas</th>
              <th>Gastos</th>
              <th>Ganancia neta</th>
              <th>Margen</th>
            </tr>
          </thead>
          <tbody>
            {months.map((month) => (
              <tr key={month.monthKey}>
                <td>{month.label}</td>
                <td>{formatMoney(month.ventas)}</td>
                <td>{formatMoney(month.gastos)}</td>
                <td>{formatMoney(month.gananciaNeta)}</td>
                <td>{formatMargen(month.ventas, month.gananciaNeta)}</td>
              </tr>
            ))}
            <tr className="is-total">
              <td>Total anual</td>
              <td>{formatMoney(totals.ventas)}</td>
              <td>{formatMoney(totals.gastos)}</td>
              <td>{formatMoney(totals.gananciaNeta)}</td>
              <td>{formatMargen(totals.ventas, totals.gananciaNeta)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h3>Desglose anual por colaboradora</h3>
        {ranking.length ? (
          <table className="anual-print-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Colaboradora</th>
                <th>Generado</th>
                <th>Comisiones</th>
                <th>Aporte</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((item) => (
                <tr key={item.id}>
                  <td>{item.puesto}</td>
                  <td>{item.nombre}</td>
                  <td>{formatMoney(item.ventas)}</td>
                  <td>{formatMoney(item.comisiones)}</td>
                  <td>{item.aportePct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="anual-print-empty">Sin ventas asignadas a colaboradoras en este año.</p>
        )}
      </section>

      <section>
        <h3>Conformidad de socias administradoras</h3>
        <div className="anual-print-signs">
          <div>
            <span />
            <small>{socio1}</small>
          </div>
          <div>
            <span />
            <small>{socio2}</small>
          </div>
        </div>
      </section>
    </article>
  );
}
