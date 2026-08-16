import { doc, onSnapshot, runTransaction, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { toNumber } from './dashboardService';
import { roundMoney, toLocalIsoDate } from './ventasService';

const ahorroRef = () => doc(db, 'ahorro', 'main');

const EMPTY_AHORRO = { saldoActual: 0, historial: [] };

function mapMovimiento(item) {
  const tipo = String(item?.tipo || '').toLowerCase() === 'retiro' ? 'retiro' : 'deposito';
  return {
    fecha: String(item?.fecha || ''),
    monto: toNumber(item?.monto),
    tipo,
    motivo: item?.motivo || '',
  };
}

function mapAhorro(data = {}) {
  const historial = Array.isArray(data.historial) ? data.historial.map(mapMovimiento) : [];
  return {
    saldoActual: toNumber(data.saldoActual ?? data.saldo),
    historial,
  };
}

export function obtenerAhorro(onData, onError) {
  const ref = ahorroRef();

  return onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) {
        setDoc(ref, EMPTY_AHORRO).catch((cause) => onError?.(cause));
        onData(EMPTY_AHORRO);
        return;
      }
      onData(mapAhorro(snapshot.data()));
    },
    (cause) => onError?.(cause),
  );
}

export async function registrarMovimiento({ tipo, monto, motivo, fecha }) {
  const kind = tipo === 'retiro' ? 'retiro' : 'deposito';
  const amount = roundMoney(monto);
  const concept = String(motivo || '').trim();
  const date = fecha || toLocalIsoDate();

  if (amount <= 0) {
    throw new Error('El monto debe ser mayor a 0.');
  }
  if (!concept) {
    throw new Error('Escribe el motivo del movimiento.');
  }

  const ref = ahorroRef();

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const current = snapshot.exists() ? mapAhorro(snapshot.data()) : EMPTY_AHORRO;

    if (kind === 'retiro' && amount > current.saldoActual) {
      throw new Error('No puedes retirar más del saldo disponible.');
    }

    const nuevoSaldo = roundMoney(
      kind === 'deposito' ? current.saldoActual + amount : current.saldoActual - amount,
    );

    transaction.set(ref, {
      saldoActual: nuevoSaldo,
      historial: [
        {
          fecha: date,
          monto: amount,
          tipo: kind,
          motivo: concept,
        },
        ...current.historial,
      ],
    });
  });
}
