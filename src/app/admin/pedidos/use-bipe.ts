"use client";

import { useCallback, useRef, useState } from "react";

/** Bipe via Web Audio; só liga após um clique (política de autoplay — ADM-RF-08). */
export function useBipe() {
  const contexto = useRef<AudioContext | null>(null);
  const [ativo, setAtivo] = useState(false);

  const tocar = useCallback(() => {
    const ctx = contexto.current;
    if (!ctx) return;
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
    if (ativo) {
      setAtivo(false);
      return;
    }
    contexto.current ??= new AudioContext();
    void contexto.current.resume();
    setAtivo(true);
    tocar();
  }, [ativo, tocar]);

  return { ativo, alternar, tocar: ativo ? tocar : () => {} };
}
