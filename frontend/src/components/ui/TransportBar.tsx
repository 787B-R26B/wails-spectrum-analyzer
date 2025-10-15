import React from "react";
import { formatTime } from "../../utils/time";

type Props = {
  isPlaying: boolean;
  canPlay: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  onTogglePlay: () => void;
  onSeek: (t: number) => void;
  onVolume: (v: number) => void;
};

const TransportBar: React.FC<Props> = ({
  isPlaying,
  canPlay,
  currentTime,
  duration,
  volume,
  onTogglePlay,
  onSeek,
  onVolume,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          onClick={onTogglePlay}
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
            onChange={(e) => onVolume(parseFloat(e.target.value))}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs tabular-nums w-12 text-right">{formatTime(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={isFinite(duration) ? duration : 0}
          step={0.01}
          value={Math.min(currentTime, isFinite(duration) ? duration : 0)}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="flex-1"
        />
        <span className="text-xs tabular-nums w-12">{formatTime(duration)}</span>
      </div>
    </div>
  );
};

export default TransportBar;
