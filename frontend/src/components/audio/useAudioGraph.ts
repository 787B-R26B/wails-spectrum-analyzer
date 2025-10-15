import { useCallback, useEffect, useRef } from "react";

// グローバル 1 個の AudioContext（StrictMode 対策）
let GLOBAL_AUDIO_CTX: AudioContext | null = null;
// 同じ <audio> に対して MediaElementAudioSourceNode を 1 回だけ生成
const MEDIA_SRC = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

export type GraphOptions = {
  fftSize: number;
  smoothing: number;
  volume: number;
};

export function useAudioGraph(
  audioRef: React.MutableRefObject<HTMLAudioElement | null>,
  opts: GraphOptions
) {
  const { fftSize, smoothing, volume } = opts;

  const audioCtxRef = useRef<AudioContext | null>(null);
  const srcNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const ensureGraph = useCallback(async () => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    if (!GLOBAL_AUDIO_CTX) {
      GLOBAL_AUDIO_CTX = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    audioCtxRef.current = GLOBAL_AUDIO_CTX;

    if (GLOBAL_AUDIO_CTX.state === "suspended") {
      await GLOBAL_AUDIO_CTX.resume();
    }

    let src = MEDIA_SRC.get(audioEl);
    if (!src) {
      src = GLOBAL_AUDIO_CTX.createMediaElementSource(audioEl);
      MEDIA_SRC.set(audioEl, src);
    }
    srcNodeRef.current = src;

    if (!gainRef.current) {
      const g = GLOBAL_AUDIO_CTX.createGain();
      g.gain.value = volume;
      gainRef.current = g;
    }

    if (!analyserRef.current) {
      const an = GLOBAL_AUDIO_CTX.createAnalyser();
      an.fftSize = fftSize;
      an.smoothingTimeConstant = smoothing;
      analyserRef.current = an;
    }

    // （再）配線
    try { srcNodeRef.current.disconnect(); } catch {}
    srcNodeRef.current.connect(gainRef.current);

    try { gainRef.current!.disconnect(); } catch {}
    gainRef.current!.connect(analyserRef.current!);

    try { analyserRef.current!.disconnect(); } catch {}
    analyserRef.current!.connect(GLOBAL_AUDIO_CTX.destination);
  }, [audioRef, fftSize, smoothing, volume]);

  // オプション変更の反映
  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = volume;
  }, [volume]);

  useEffect(() => {
    if (analyserRef.current) {
      analyserRef.current.fftSize = fftSize;
      analyserRef.current.smoothingTimeConstant = smoothing;
    }
  }, [fftSize, smoothing]);

  // アンマウント時：ノードは切断、Context は閉じない
  useEffect(() => {
    return () => {
      try {
        srcNodeRef.current?.disconnect();
        gainRef.current?.disconnect();
        analyserRef.current?.disconnect();
      } catch {}
      srcNodeRef.current = null;
      gainRef.current = null;
      analyserRef.current = null;
    };
  }, []);

  return {
    audioCtxRef,
    srcNodeRef,
    gainRef,
    analyserRef,
    ensureGraph,
  } as const;
}
