import { useCallback, useEffect, useRef } from "react";

// グローバル 1 個の AudioContext（StrictMode 対策）
let GLOBAL_AUDIO_CTX: AudioContext | null = null;
// 同じ <audio> に対して MediaElementAudioSourceNode を 1 回だけ生成
const MEDIA_SRC = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

// 31-band EQ center frequencies (1/3 octave)
export const EQ_FREQUENCIES = [
  20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630,
  800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500,
  16000, 20000,
];

export type GraphOptions = {
  fftSize: number;
  smoothing: number;
  volume: number;
  eqGains: number[];
  eqPreGain: number;
};

export function useAudioGraph(
  audioRef: React.MutableRefObject<HTMLMediaElement | null>,
  opts: GraphOptions,
) {
  const { fftSize, smoothing, volume, eqGains, eqPreGain } = opts;

  const audioCtxRef = useRef<AudioContext | null>(null);
  const srcNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const preGainRef = useRef<GainNode | null>(null);
  const eqNodesRef = useRef<BiquadFilterNode[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const ensureGraph = useCallback(async () => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    if (!GLOBAL_AUDIO_CTX) {
      GLOBAL_AUDIO_CTX = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
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
    if (!preGainRef.current) {
      const g = GLOBAL_AUDIO_CTX.createGain();
      g.gain.value = eqPreGain;
      preGainRef.current = g;
    }

    // EQ Nodes
    if (eqNodesRef.current.length === 0) {
      eqNodesRef.current = EQ_FREQUENCIES.map((freq, i) => {
        const eq = GLOBAL_AUDIO_CTX!.createBiquadFilter();
        eq.type = "peaking";
        eq.frequency.value = freq;
        eq.Q.value = 4.31; // Corresponds to 1/3 octave
        eq.gain.value = eqGains[i] ?? 0;
        return eq;
      });
    }

    if (!analyserRef.current) {
      const an = GLOBAL_AUDIO_CTX.createAnalyser();
      an.fftSize = fftSize;
      an.smoothingTimeConstant = smoothing;
      analyserRef.current = an;
    }

    // (Re)connect all nodes
    try {
      srcNodeRef.current.disconnect();
    } catch {}

    const nodes: AudioNode[] = [
      gainRef.current!,
      preGainRef.current!,
      ...eqNodesRef.current,
      analyserRef.current!,
      GLOBAL_AUDIO_CTX.destination,
    ];

    srcNodeRef.current.connect(nodes[0]);

    for (let i = 0; i < nodes.length - 1; i++) {
      try {
        nodes[i].disconnect();
      } catch {}
      nodes[i].connect(nodes[i + 1]);
    }
  }, [audioRef, fftSize, smoothing, volume, eqGains, eqPreGain]);

  // Update options
  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = volume;
  }, [volume]);

  useEffect(() => {
    if (preGainRef.current) preGainRef.current.gain.value = eqPreGain;
  }, [eqPreGain]);

  useEffect(() => {
    eqNodesRef.current.forEach((eq, i) => {
      if (eq) eq.gain.value = eqGains[i] ?? 0;
    });
  }, [eqGains]);

  useEffect(() => {
    if (analyserRef.current) {
      analyserRef.current.fftSize = fftSize;
      analyserRef.current.smoothingTimeConstant = smoothing;
    }
  }, [fftSize, smoothing]);

  // Disconnect nodes on unmount
  useEffect(() => {
    return () => {
      try {
        srcNodeRef.current?.disconnect();
        gainRef.current?.disconnect();
        preGainRef.current?.disconnect();
        eqNodesRef.current.forEach((eq) => eq.disconnect());
        analyserRef.current?.disconnect();
      } catch {}
      srcNodeRef.current = null;
      gainRef.current = null;
      preGainRef.current = null;
      eqNodesRef.current = [];
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
