'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Result } from './types';

/** Carga asíncrona con estados de carga/error y recarga manual. Ignora respuestas obsoletas. */
export function useAsync<T>(fn: () => Promise<Result<T>>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const intento = useRef(0);

  const recargar = useCallback(async () => {
    const id = ++intento.current;
    setCargando(true);
    setError(null);
    try {
      const res = await fnRef.current();
      if (id !== intento.current) return;
      if (res.error === null) setData(res.data);
      else setError(res.error);
    } catch (e) {
      if (id !== intento.current) return;
      setError(e instanceof Error ? e.message : 'Error inesperado.');
    } finally {
      if (id === intento.current) setCargando(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
    return () => {
      // El ref es un contador de solicitudes (no un nodo DOM): incrementarlo invalida respuestas en vuelo.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      intento.current++;
    };
  }, [recargar]);

  return { data, setData, error, cargando, recargar };
}
