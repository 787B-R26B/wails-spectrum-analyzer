import React from "react";
import { formatTime } from "../../utils/time";
import { FaPlay, FaPause, FaRedo, FaVolumeUp, FaVolumeMute } from "react-icons/fa";

type Props = {
  isPlaying: boolean;
  canPlay: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  loopTrack: boolean;
  onTogglePlay: () => void;
  onSeek: (t: number) => void;
  onVolume: (v: number) => void;
  onToggleLoopTrack: () => void;
};

const TransportBar: React.FC<Props> = ({
  isPlaying,
  canPlay,
  currentTime,
  duration,
  volume,
  loopTrack,
  onTogglePlay,
  onSeek,
  onVolume,
  onToggleLoopTrack,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          onClick={onTogglePlay}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:opacity-90 disabled:opacity-50"
          disabled={!canPlay}
        >
          {isPlaying
            ? (<span className="inline-flex items-center gap-1"><FaPause /></span>)
            : (<span className="inline-flex items-center gap-1"><FaPlay /></span>)
          }
        </button>

        {/* ループ */}
        <button
          onClick={onToggleLoopTrack}
          className={"px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50 " + (loopTrack ? "border-emerald-500 text-emerald-700" : "")}
        >
          <FaRedo />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 inline-flex items-center gap-1">
            {volume > 0 ? <FaVolumeUp className="opacity-70" /> : <FaVolumeMute className="opacity-70" />}
            音量
          </span>
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
