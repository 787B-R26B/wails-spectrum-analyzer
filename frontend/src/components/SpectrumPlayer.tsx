import React, { useEffect, useRef, useState } from "react";
import AnalyzerCanvas, { VisMode } from "./visualizer/AnalyzerCanvas";
import { useAudioGraph, EQ_FREQUENCIES } from "./audio/useAudioGraph";
import FilePicker from "./ui/FilePicker";
import TransportBar from "./ui/TransportBar";
import { Equalizer } from "./ui/Equalizer";

const FFT_OPTIONS = [256, 512, 1024, 2048, 4096] as const;

const SpectrumPlayer: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [fileName, setFileName] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(NaN);
  const [volume, setVolume] = useState(0.9);
  const [fftSize, setFftSize] = useState<(typeof FFT_OPTIONS)[number]>(1024);
  const [smoothing, setSmoothing] = useState(0.7);
  const [visMode, setVisMode] = useState<VisMode>("bars+wave");
  const [errMsg, setErrMsg] = useState("");
  const [eqGains, setEqGains] = useState<number[]>(() =>
    new Array(EQ_FREQUENCIES.length).fill(0),
  );
  const [eqPreGain, setEqPreGain] = useState(1);
  const [isEqEnabled, setIsEqEnabled] = useState(true);

  const { analyserRef, ensureGraph } = useAudioGraph(audioRef, {
    fftSize,
    smoothing,
    volume,
    eqGains,
    eqPreGain,
    isEqEnabled,
  });

  // <audio> イベント
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

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
    };
  }, []);

  // ファイル選択：自動再生はしない（ポリシー回避）
  const onPick = (f: File, url: string) => {
    setErrMsg("");
    setFileName(f.name);
    const audioEl = audioRef.current!;
    audioEl.pause();
    audioEl.src = url;
    audioEl.preload = "auto";
    audioEl.currentTime = 0;
    audioEl.load();
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

  const onSeek = (t: number) => {
    const audio = audioRef.current!;
    audio.currentTime = t;
  };

  const handleGainChange = (index: number, value: number) => {
    const newGains = [...eqGains];
    newGains[index] = value;
    setEqGains(newGains);
  };

  const canPlay = !!(audioRef.current && audioRef.current.src);

  return (
    <div className="w-full h-full flex flex-col gap-4 p-4 bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FilePicker onPick={onPick} />
          <div className="text-sm text-gray-600 truncate max-w-[32rem]">
            {fileName || "ファイル未選択"}
          </div>
        </div>
      </div>

      {/* Transport */}
      <TransportBar
        isPlaying={isPlaying}
        canPlay={canPlay}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        onTogglePlay={togglePlay}
        onSeek={onSeek}
        onVolume={setVolume}
      />

      {/* Visualizer */}
      <AnalyzerCanvas analyserRef={analyserRef} visMode={visMode} />

      {/* Equalizer */}
      <Equalizer
        gains={eqGains}
        onGainChange={handleGainChange}
        preGain={eqPreGain}
        onPreGainChange={setEqPreGain}
        isEnabled={isEqEnabled}
        onEnabledChange={setIsEqEnabled}
      />

      {/* Controls Row */}
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

      {!!errMsg && <div className="text-sm text-red-600">{errMsg}</div>}

      {/* Hidden audio element */}
      <audio ref={audioRef} preload="auto" />
    </div>
  );
};

export default SpectrumPlayer;
