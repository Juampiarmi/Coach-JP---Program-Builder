'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchUnidades } from './data';
import { UNIDADES_FALLBACK } from './types';

const TIMEOUT_MS = 6000;

export type OrigenUnidades = 'cargando' | 'supabase' | 'fallback';

/**
 * Lee las unidades de negocio desde Supabase con fallback estático automático.
 * Si la consulta falla (RLS, red, timeout o tabla vacía) el selector sigue operativo
 * con ['UBER', 'TRY', 'HOTEL'] y expone `reintentar` para volver a consultar.
 */
export function useUnidades() {
  const [unidades, setUnidades] = useState<string[]>([...UNIDADES_FALLBACK]);
  const [origen, setOrigen] = useState<OrigenUnidades>('cargando');
  const [error, setError] = useState<string | null>(null);
  const intento = useRef(0);

  const cargar = useCallback(async () => {
    const id = ++intento.current;
    setOrigen('cargando');
    setError(null);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetchUnidades(ctrl.signal);
      if (id !== intento.current) return; // respuesta obsoleta
      if (res.error === null && res.data.length > 0) {
        setUnidades(res.data);
        setOrigen('supabase');
      } else {
        setUnidades([...UNIDADES_FALLBACK]);
        setOrigen('fallback');
        setError(res.error ?? 'La tabla de unidades está vacía.');
      }
    } catch {
      if (id !== intento.current) return;
      setUnidades([...UNIDADES_FALLBACK]);
      setOrigen('fallback');
      setError(ctrl.signal.aborted ? 'La consulta de unidades tardó demasiado.' : 'No se pudieron leer las unidades.');
    } finally {
      clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    void cargar();
    return () => {
      // El ref es un contador de solicitudes (no un nodo DOM): incrementarlo invalida respuestas en vuelo.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      intento.current++;
    };
  }, [cargar]);

  return { unidades, origen, error, cargando: origen === 'cargando', reintentar: cargar };
}
