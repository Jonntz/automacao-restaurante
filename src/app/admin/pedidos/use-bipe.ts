"use client";

import { useCallback, useMemo, useRef, useState } from "react";

/**
 * Bipe via Web Audio; só liga após um clique (política de autoplay — ADM-RF-08).
 * Identidade estável (CA-13): `tocar` nunca muda e o retorno é memorizado. Antes, um objeto novo
 * a cada render reiniciava o polling do kanban, que buscava a API em laço.
 */
export function useBipe() {
  const contexto = useRef<AudioContext | null>(null);
  const ativoRef = useRef(false);
  const [ativo, setAtivo] = useState(false);

  const tocar = useCallback(() => {
    const ctx = contexto.current;
    if (!ctx || !ativoRef.current) return;
    [0, 0.22].forEach((inicio) => {
      const osc = ctx.createOscillator();
      const ganho = ctx.createGain();
      osc.frequency.value = 880;
      ganho.gain.value = 0.15;
      osc.connect(ganho).connect(ctx.destination);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + 0.15);
    });
  }, []);

  const alternar = useCallback(() => {
    ativoRef.current = !ativoRef.current;
    setAtivo(ativoRef.current);
    if (!ativoRef.current) return;
    contexto.current ??= new AudioContext();
    void contexto.current.resume();
    tocar();
  }, [tocar]);

  return useMemo(() => ({ ativo, alternar, tocar }), [ativo, alternar, tocar]);
}
