import PrintLogo from '../../components/print/PrintLogo';
import { formatMoney } from '../../services/dashboardService';
import { DEFAULT_CIERRE_SECTIONS } from './CierrePrintModal';

function emissionDate() {
  return new Date().toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function CierreMensualPrint({
  snapshot,
  label,
  empresa,
  saved,
  logo,
  sections = DEFAULT_CIERRE_SECTIONS,
}) {
  if (!snapshot) return null;

  const { totales, cuadrePorSemana, desgloseEmpleados, dias, gastos = [], reparto } = snapshot;
  const twoPartners = reparto.modalidad === '2_socios';
  const fijos = gastos.filter((item) => item.categoria === 'Fijo');
  const operativos = gastos.filter((item) => item.categoria !== 'Fijo');

  return (
    <article className="cierre-print">
      <header className="cierre-print-head">
        <PrintLogo src={logo} alt={empresa} />
        <p>
          {empresa} — Cierre mensual {label}
        </p>
        <h1>Estética Romina</h1>
        <h2>Cierre mensual {label}</h2>
        <div className="cierre-print-meta">
          <span>Fecha de emisión: {emissionDate()}</span>
          {saved ? <span>Cierre consolidado en el sistema</span> : <span>Borrador de cierre</span>}
        </div>
      </header>

      {sections.resumen ? (
        <>
          <section>
            <h3>Resumen financiero general</h3>
            <div className="cierre-print-kpis">
              <div>
                <span>Ventas brutas</span>
                <strong>{formatMoney(totales.ventasBrutas)}</strong>
              </div>
              <div>
                <span>Comisiones pagadas</span>
                <strong>{formatMoney(totales.comisionesPagadas)}</strong>
              </div>
              <div>
                <span>Gastos totales</span>
                <strong>{formatMoney(totales.totalGastos)}</strong>
              </div>
              <div>
                <span>Ahorro apartado</span>
                <strong>{formatMoney(totales.fondoAhorro)}</strong>
              </div>
              <div>
                <span>Utilidad final / reparto</span>
                <strong>{formatMoney(totales.totalReparto)}</strong>
              </div>
            </div>
          </section>

          <section>
            <h3>Reparto de socias</h3>
            <table className="cierre-print-table">
              <thead>
                <tr>
                  <th>Socia</th>
                  <th>Modalidad</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{reparto.socio1.nombre}</td>
                  <td>{twoPartners ? '50%' : '100%'}</td>
                  <td>{formatMoney(reparto.socio1.monto)}</td>
                </tr>
                {twoPartners ? (
                  <tr>
                    <td>{reparto.socio2.nombre}</td>
                    <td>50%</td>
                    <td>{formatMoney(reparto.socio2.monto)}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        </>
      ) : null}

      {sections.cuadre ? (
        <section>
          <h3>Cuadre por semanas</h3>
          <table className="cierre-print-table">
            <thead>
              <tr>
                <th>Semana</th>
                <th>Rango</th>
                <th>Neto</th>
                <th>Gastos</th>
                <th>Caja</th>
              </tr>
            </thead>
            <tbody>
              {cuadrePorSemana.map((week) => (
                <tr key={week.semana}>
                  <td>Semana {week.semana}</td>
                  <td>{week.rango}</td>
                  <td>{formatMoney(week.neto)}</td>
                  <td>{formatMoney(week.gastos)}</td>
                  <td>{formatMoney(week.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {sections.empleadas ? (
        <section>
          <h3>Rendimiento y comisiones por empleada</h3>
          {desgloseEmpleados.length ? (
            <table className="cierre-print-table">
              <thead>
                <tr>
                  <th>Empleada</th>
                  <th>Generado</th>
                  <th>Comisión</th>
                  <th>Utilidad aportada</th>
                </tr>
              </thead>
              <tbody>
                {desgloseEmpleados.map((item) => (
                  <tr key={item.idEmpleado}>
                    <td>{item.nombre}</td>
                    <td>{formatMoney(item.totalGenerado)}</td>
                    <td>{formatMoney(item.comisionTotal)}</td>
                    <td>{formatMoney(item.utilidadAportada)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="cierre-print-empty">Sin ventas registradas en este mes.</p>
          )}
        </section>
      ) : null}

      {sections.gastos ? (
        <section>
          <h3>Desglose de gastos del mes</h3>
          <div className="cierre-print-kpis">
            <div>
              <span>Gastos fijos</span>
              <strong>{formatMoney(totales.gastosFijos)}</strong>
            </div>
            <div>
              <span>Gastos operativos</span>
              <strong>{formatMoney(totales.gastosOperativos)}</strong>
            </div>
            <div>
              <span>Total de gastos</span>
              <strong>{formatMoney(totales.totalGastos)}</strong>
            </div>
          </div>
          {gastos.length ? (
            <table className="cierre-print-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Categoría</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {[...fijos, ...operativos].map((item) => (
                  <tr key={item.id}>
                    <td>{item.fecha}</td>
                    <td>{item.concepto || '—'}</td>
                    <td>{item.categoria}</td>
                    <td>{formatMoney(item.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="cierre-print-empty">No hay gastos registrados en este mes.</p>
          )}
        </section>
      ) : null}

      {sections.anexo ? (
        <section className="cierre-print-annex">
          <h3>Anexo de ganancias diarias</h3>
          {dias.length ? (
            <table className="cierre-print-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Empleada</th>
                  <th>Se llevó</th>
                  <th>Quedó al negocio</th>
                </tr>
              </thead>
              <tbody>
                {dias.flatMap((day) =>
                  day.rows.map((row, index) => (
                    <tr key={`${day.fecha}-${row.idEmpleado}`}>
                      <td>{index === 0 ? day.label : ''}</td>
                      <td>{row.nombre}</td>
                      <td>{formatMoney(row.comision)}</td>
                      <td>{formatMoney(row.utilidad)}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          ) : (
            <p className="cierre-print-empty">No hay desglose diario para anexar.</p>
          )}
        </section>
      ) : null}

      {sections.firmas ? (
        <section>
          <h3>Firmas de conformidad</h3>
          <div className={`cierre-print-signs ${twoPartners ? '' : 'is-one'}`}>
            <div>
              <span />
              <small>{reparto.socio1.nombre}</small>
            </div>
            {twoPartners ? (
              <div>
                <span />
                <small>{reparto.socio2.nombre}</small>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </article>
  );
}
