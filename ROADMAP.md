# Roadmap Estética Romina

Plan de migración a React (Vite + Firebase `esteticapruebas-3f787`).

```
FASE 1: Setup Base + Configuración Firebase
FASE 2: Catálogo & Empleados
FASE 3: Ventas & Histórico Diario
FASE 4: Gastos & Fondo de Ahorro
FASE 5: Reportes, Cierres Mensuales & Calculadora de Billetes
```

## Estado actual (este repositorio)

No hace falta crear una carpeta nueva ni repetir el Prompt 1: este proyecto ya cubre las fases 1 a 4. Lo pendiente está en la fase 5 y en algunos huecos de lectura/historial.

| Fase | Estado | Notas |
| --- | --- | --- |
| 1. Setup + Auth + Layout | Hecha | Firebase modular, AuthContext, login, sidebar con grupos |
| 2. Catálogo y Empleados | Hecha | CRUD en `catalogo` y `empleados`; turnos desde `config/turnos` |
| 3. Ventas | Parcial | Corte detallado + histórico diario; historial de ventas aún es placeholder |
| 4. Gastos y Ahorro | Hecha | `gastos` con semana 1–4; `ahorro/main` con transacción |
| 5. Dashboard, reportes y cierre | Parcial | Dashboard con KPIs del mes; cierre, calculadora y rendimiento son placeholder |

Huecos conocidos:

- No hay `configService` para `config/main` (`nombreEmpresa`, `ticketMensaje`, dueños).
- `/ventas/historial`, `/finanzas/rendimiento`, `/finanzas/cierre` y `/configuracion` aún no tienen lógica de negocio.
- Colección `cierres_mensuales` (ID `YYYY-MM` con `setDoc`) no está implementada.

## Contratos de Firestore

### `config`

- `config/main`: `{ nombreEmpresa, ticketMensaje, dueno1Nombre, dueno2Nombre }`
- `config/turnos`: `{ lista: [{ id, nombre, descripcion, orden }], actualizado }`

### `catalogo` (ID auto)

`{ nombre, precioBase, comisionDefecto, tipoComision, categoria, imagen? }`

### `empleados` (ID auto)

`{ nombre, rol, telefono?, direccion?, comisionDefecto, horarioSemanal: { lunes…domingo } }`

Los valores de `horarioSemanal` son `turnoId` o `__descanso__`.

### `ventas` (ID auto)

Campos base (comisiones congeladas, nunca se recalculan al leer):

`{ fecha, idEmpleado, servicio, idServicio, monto, comisionTipo, comisionPct, comisionMonto, utilidadNegocio, turnoId, turnoNombre, ts }`

- Corte bulk: `+ cantidad`
- Histórico diario: `+ { tipo: 'historico_diario', montoEsBruto: true, idServicio: '' }`

### `gastos` (ID auto)

`{ fecha, concepto, monto, categoria: 'Fijo' | 'Operativo', semanaAsignada: 1–4 }`

### `ahorro/main`

`{ saldoActual, historial: [{ fecha, monto, tipo, motivo }] }`

Regla: read-modify-write / transacción; se reescribe el array `historial` completo.

### `cierres_mensuales` (ID `YYYY-MM`)

`{ desglose, cuadrePorSemana, reparto, meta50, totales, timestamps }`

Regla: `setDoc(doc(db, 'cierres_mensuales', 'YYYY-MM'), …)`, no `addDoc`.

## Siguiente paso recomendado

Implementar **Fase 5** en este mismo repo:

1. Cierre mensual + calculadora de billetes (`/finanzas/cierre`).
2. Rendimiento por empleada (`/finanzas/rendimiento`).
3. Historial de ventas (`/ventas/historial`).
4. Servicio de `config/main` y pantalla de configuración.
