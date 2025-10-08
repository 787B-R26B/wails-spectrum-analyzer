import React, { useEffect, useRef, useState, useCallback } from "react";

/**
 * SpectrumPlayer.tsx (React + TypeScript)
 *
 * - Web Audio (MediaElementAudioSourceNode + AnalyserNode) を使った
 *   再生＋リアルタイム・スペクトラム／波形表示コンポーネント
 * - React StrictMode（二重マウント）でも壊れにくい初期化順に修正済み
 * - 同じ <audio> に対して createMediaElementSource を複数回呼ばない対策込み
 * - 自動再生はせず「再生」ボタンで確実に音を出す
 */

// ---- グローバルに 1 個だけ AudioContext を持つ（StrictMode 安全性向上）----
let GLOBAL_AUDIO_CTX: AudioContext | null = null;
// 同じ <audio> 要素から MediaElementAudioSourceNode を二度作らないためのマップ
const MEDIA_SRC = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

// mm:ss 表示
function formatTime(sec: number): string {
  if (!isFinite(sec)) return "00:00";
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

const FFT_OPTIONS = [256, 512, 1024, 2048, 4096] as const;
type VisMode = "bars" | "wave" | "bars+wave";

const SpectrumPlayer: React.FC = () => {
  // UI state
  const [fileName, setFileName] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(NaN);
  const [volume, setVolume] = useState(0.9);
  const [fftSize, setFftSize] = useState<(typeof FFT_OPTIONS)[number]>(1024);
  const [smoothing, setSmoothing] = useState(0.7);
  const [visMode, setVisMode] = useState<VisMode>("bars+wave");
  const [errMsg, setErrMsg] = useState("");

  // DOM
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Web Audio refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const srcNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // animation
  const rafRef = useRef<number | null>(null);

  // HiDPI
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const barSpacing = 2; // px

  /**
   * Audio グラフを（必要なら）作る: Context (再)生成 → media/gain/analyser 準備 → 配線
   */
  const ensureGraph = useCallback(async () => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    // グローバルの AudioContext を 1 つだけ使う
    if (!GLOBAL_AUDIO_CTX) {
      GLOBAL_AUDIO_CTX = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
    audioCtxRef.current = GLOBAL_AUDIO_CTX;

    // ユーザー操作後に resume が必要な場合あり
    if (GLOBAL_AUDIO_CTX.state === "suspended") {
      await GLOBAL_AUDIO_CTX.resume();
    }

    // 同じ <audio> に対し MediaElementSource を複数生成しない
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

    // 配線（connect 前に既存の接続を解除してから）
    try {
      srcNodeRef.current.disconnect();
    } catch {}
    srcNodeRef.current.connect(gainRef.current);

    try {
      gainRef.current!.disconnect();
    } catch {}
    gainRef.current!.connect(analyserRef.current!);

    try {
      analyserRef.current!.disconnect();
    } catch {}
    analyserRef.current!.connect(GLOBAL_AUDIO_CTX.destination);
  }, [fftSize, smoothing, volume]);

  // 初期イベント
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    // 初回マウントでグラフだけ用意（再生はしない）
    ensureGraph();

    const onTime = () => setCurrentTime(audioEl.currentTime);
    const onLoaded = () => setDuration(audioEl.duration);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    const onError = () => {
      const e = audioEl.error;
      let m = "Unknown audio error";
      if (e) {
        const map: Record<number, string> = {
          1: "ABORTED",
          2: "NETWORK",
          3: "DECODE",
          4: "SRC_NOT_SUPPORTED",
        };
        m = `HTMLMediaError ${map[e.code] || e.code}`;
      }
      setErrMsg(m);
      // コンソールにも詳細を
      // eslint-disable-next-line no-console
      console.error("Audio element error:", audioEl.error);
    };

    audioEl.addEventListener("timeupdate", onTime);
    audioEl.addEventListener("loadedmetadata", onLoaded);
    audioEl.addEventListener("play", onPlay);
    audioEl.addEventListener("pause", onPause);
    audioEl.addEventListener("ended", onEnded);
    audioEl.addEventListener("error", onError);

    return () => {
      audioEl.removeEventListener("timeupdate", onTime);
      audioEl.removeEventListener("loadedmetadata", onLoaded);
      audioEl.removeEventListener("play", onPlay);
      audioEl.removeEventListener("pause", onPause);
      audioEl.removeEventListener("ended", onEnded);
      audioEl.removeEventListener("error", onError);

      // ノードは切断して参照だけクリア（Context は閉じない）
      try {
        srcNodeRef.current?.disconnect();
        gainRef.current?.disconnect();
        analyserRef.current?.disconnect();
      } catch {}
      srcNodeRef.current = null;
      gainRef.current = null;
      analyserRef.current = null;
    };
  }, [ensureGraph]);

  // volume 反映
  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = volume;
  }, [volume]);

  // analyser 設定変更
  useEffect(() => {
    if (analyserRef.current) {
      analyserRef.current.fftSize = fftSize;
      analyserRef.current.smoothingTimeConstant = smoothing;
    }
  }, [fftSize, smoothing]);

  // 描画ループ
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const resize = () => {
      const { clientWidth, clientHeight } = canvas;
      canvas.width = Math.floor(clientWidth * dpr);
      canvas.height = Math.floor(clientHeight * dpr);
    };
    resize();
    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx2d.clearRect(0, 0, w, h);

      // ★ 毎フレーム 最新の analyser を取得
      const analyser = analyserRef.current;

      if (!analyser) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      // Frequency bars
      if (visMode === "bars" || visMode === "bars+wave") {
        const bufferLength = analyser.frequencyBinCount; // fftSize/2
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        const barWidth = Math.max(1, Math.floor(w / bufferLength - barSpacing));
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i]; // 0..255
          const barHeight = (v / 255) * (h * 0.9);

          const grd = ctx2d.createLinearGradient(0, h, 0, h - barHeight);
          grd.addColorStop(0, "#1f2937"); // slate-800
          grd.addColorStop(1, "#60a5fa"); // blue-400
          ctx2d.fillStyle = grd;

          ctx2d.fillRect(x, h - barHeight, barWidth, barHeight);
          x += barWidth + barSpacing;
        }
      }

      // Waveform
      if (visMode === "wave" || visMode === "bars+wave") {
        const bufferLength = analyser.fftSize;
        const timeArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(timeArray);

        ctx2d.lineWidth = 2 * dpr;
        ctx2d.strokeStyle = "#10b981";
        ctx2d.beginPath();
        const slice = w / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = timeArray[i] / 128.0; // center ~1
          const y = (v * h) / 2;
          if (i === 0) ctx2d.moveTo(x, y);
          else ctx2d.lineTo(x, y);
          x += slice;
        }
        ctx2d.stroke();
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [visMode, dpr]);

  // ファイル選択：自動再生はしない（ポリシー回避）
  const onPickFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setErrMsg("");
    setFileName(f.name);

    const url = URL.createObjectURL(f);
    const audio = audioRef.current!;
    audio.pause();
    audio.src = url;
    audio.preload = "auto";
    audio.currentTime = 0;
    audio.load(); // 明示ロード（任意）
  };

  // 再生/一時停止
  const togglePlay = async () => {
    const audio = audioRef.current!;
    if (!audio) return;

    // グラフと Context を整える
    await ensureGraph();

    if (audio.paused) {
      try {
        await audio.play();
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.warn("audio.play() rejected:", err?.name, err?.message);
        setErrMsg(err?.message || "Failed to play()");
      }
    } else {
      audio.pause();
    }
  };

  const onSeek: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const t = parseFloat(e.target.value);
    const audio = audioRef.current!;
    audio.currentTime = t;
  };

  const canPlay = !!(audioRef.current && audioRef.current.src);

  return (
    <div className="w-full h-full flex flex-col gap-4 p-4 bg-gray-50">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label
            htmlFor="file"
            className="px-3 py-2 rounded-xl bg-blue-600 text-white cursor-pointer hover:opacity-90 select-none"
            title="Open audio file"
          >
            音声ファイルを開く
          </label>
          <input
            id="file"
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={onPickFile}
          />
          <div className="text-sm text-gray-600 truncate max-w-[32rem]">
            {fileName ? fileName : "ファイル未選択"}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:opacity-90 disabled:opacity-50"
            disabled={!canPlay}
          >
            {isPlaying ? "一時停止" : "再生"}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">音量</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Seek bar */}
      <div className="flex items-center gap-3">
        <span className="text-xs tabular-nums w-12 text-right">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={isFinite(duration) ? duration : 0}
          step={0.01}
          value={Math.min(currentTime, isFinite(duration) ? duration : 0)}
          onChange={onSeek}
          className="flex-1"
        />
        <span className="text-xs tabular-nums w-12">
          {formatTime(duration)}
        </span>
      </div>

      {/* Analyzer Canvas */}
      <div className="flex-1 min-h-[220px] rounded-2xl overflow-hidden border border-gray-200 bg-white">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">FFT</span>
          <select
            value={fftSize}
            onChange={(e) => setFftSize(parseInt(e.target.value) as any)}
            className="px-2 py-1 rounded-lg border"
          >
            {FFT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Smoothing</span>
          <input
            type="range"
            min={0}
            max={0.99}
            step={0.01}
            value={smoothing}
            onChange={(e) => setSmoothing(parseFloat(e.target.value))}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">表示</span>
          <select
            value={visMode}
            onChange={(e) => setVisMode(e.target.value as VisMode)}
            className="px-2 py-1 rounded-lg border"
          >
            <option value="bars+wave">Bars + Wave</option>
            <option value="bars">Bars</option>
            <option value="wave">Wave</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {!!errMsg && <div className="text-sm text-red-600">{errMsg}</div>}

      {/* Hidden audio element */}
      <audio ref={audioRef} preload="auto" />
    </div>
  );
};

export default SpectrumPlayer;
