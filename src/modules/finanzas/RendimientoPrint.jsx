import PrintLogo from '../../components/print/PrintLogo';
import { formatMoney } from '../../services/dashboardService';

function emissionDate() {
  return new Date().toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function SignatureBlock() {
  return (
    <div className="print-signs">
      <div>
        <span />
        <small>Firma de Conformidad (Colaborador)</small>
      </div>
      <div>
        <span />
        <small>Autorizado por (Administración)</small>
      </div>
    </div>
  );
}

function TotalsBox({ bruto, comision, utilidad, incentives }) {
  if (incentives) {
    return (
      <div className="print-totals is-one">
        <div>
          <span>Total comisión a pagar</span>
          <strong>{formatMoney(comision)}</strong>
        </div>
      </div>
    );
  }

  return (
    <div className="print-totals">
      <div>
        <span>Total bruto facturado</span>
        <strong>{formatMoney(bruto)}</strong>
      </div>
      <div>
        <span>Total comisión a pagar</span>
        <strong>{formatMoney(comision)}</strong>
      </div>
      <div>
        <span>Utilidad neta del negocio</span>
        <strong>{formatMoney(utilidad)}</strong>
      </div>
    </div>
  );
}

function ServiceTable({ rows, incentives }) {
  if (!rows?.length) {
    return <p className="print-empty">Sin servicios registrados en este periodo.</p>;
  }

  return (
    <table className="print-table">
      <thead>
        <tr>
          <th>Servicio realizado</th>
          <th>Cantidad</th>
          {incentives ? null : <th>Monto generado</th>}
          <th>Comisión</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.name}>
            <td>{row.name}</td>
            <td>{row.cantidad}</td>
            {incentives ? null : <td>{formatMoney(row.monto)}</td>}
            <td>{formatMoney(row.comision)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PrintHeader({ period, subtitle, logo }) {
  return (
    <header className="print-letterhead">
      <PrintLogo src={logo} alt="Estética Romina" />
      <p>Estética Romina</p>
      <h1>Reporte de rendimiento y comisiones</h1>
      {subtitle ? <h2>{subtitle}</h2> : null}
      <div className="print-meta">
        <span>Fecha de emisión: {emissionDate()}</span>
        <span>Periodo evaluado: {period}</span>
      </div>
    </header>
  );
}

function StaffReceipt({ staff, isLast, incentives, logo }) {
  return (
    <section className={`print-staff ${isLast ? '' : 'is-break'}`}>
      <PrintHeader
        period={staff.period}
        subtitle={incentives ? 'Comisiones del periodo' : 'Recibo individual de pago'}
        logo={logo}
      />
      <h3>{staff.nombre}</h3>
      <p className="print-person">
        <span>Rol: {staff.rol || '—'}</span>
        <span>Teléfono: {staff.telefono || 'Sin registro'}</span>
        <span>Inasistencias en el mes: {staff.inasistencias || 0}</span>
      </p>
      {staff.inasistencias ? (
        <p className="print-absences">
          {staff.faltas} {staff.faltas === 1 ? 'falta' : 'faltas'} · {staff.permisos}{' '}
          {staff.permisos === 1 ? 'permiso' : 'permisos'}
          {staff.retardos ? ` · ${staff.retardos} ${staff.retardos === 1 ? 'retardo' : 'retardos'}` : ''}
        </p>
      ) : null}
      <ServiceTable rows={staff.desglose} incentives={incentives} />
      <TotalsBox
        bruto={staff.bruto}
        comision={staff.comision}
        utilidad={staff.utilidad}
        incentives={incentives}
      />
      <SignatureBlock />
    </section>
  );
}

export default function RendimientoPrint({ ready, format, view, period, staff, logo }) {
  if (!ready || !staff.length) return null;

  const incentives = view === 'incentivos';
  const totals = staff.reduce(
    (acc, item) => ({
      bruto: acc.bruto + item.bruto,
      comision: acc.comision + item.comision,
      utilidad: acc.utilidad + item.utilidad,
    }),
    { bruto: 0, comision: 0, utilidad: 0 },
  );

  if (format === 'recibos') {
    return (
      <article className="print-sheet">
        {staff.map((item, index) => (
          <StaffReceipt
            key={item.id}
            staff={{ ...item, period }}
            isLast={index === staff.length - 1}
            incentives={incentives}
            logo={logo}
          />
        ))}
      </article>
    );
  }

  return (
    <article className="print-sheet">
      <PrintHeader
        period={period}
        subtitle={incentives ? 'Resumen de comisiones del equipo' : 'Resumen general consolidado'}
        logo={logo}
      />
      <TotalsBox
        bruto={totals.bruto}
        comision={totals.comision}
        utilidad={totals.utilidad}
        incentives={incentives}
      />
      <table className="print-table">
        <thead>
          <tr>
            <th>Colaborador</th>
            <th>Rol</th>
            <th>Servicios</th>
            {incentives ? null : <th>Facturado</th>}
            <th>Comisión</th>
            {incentives ? null : <th>Utilidad</th>}
            <th>Inasistencias</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((item) => (
            <tr key={item.id}>
              <td>{item.nombre}</td>
              <td>{item.rol}</td>
              <td>{item.servicios}</td>
              {incentives ? null : <td>{formatMoney(item.bruto)}</td>}
              <td>{formatMoney(item.comision)}</td>
              {incentives ? null : <td>{formatMoney(item.utilidad)}</td>}
              <td>{item.inasistencias || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <SignatureBlock />
    </article>
  );
}
