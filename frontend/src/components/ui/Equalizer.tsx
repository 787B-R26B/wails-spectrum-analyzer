import { EQ_FREQUENCIES } from "../audio/useAudioGraph";

const formatFrequency = (freq: number) => {
  return freq < 1000 ? freq.toFixed(0) : `${(freq / 1000).toFixed(1)}k`;
};

type EqualizerProps = {
  gains: number[];
  onGainChange: (index: number, value: number) => void;
  volume: number;
  onVolumeChange: (value: number) => void;
};

export function Equalizer({
  gains,
  onGainChange,
  volume,
  onVolumeChange,
}: EqualizerProps) {
  return (
    <div className="bg-gray-800 bg-opacity-50 p-4 rounded-lg">
      <h3 className="text-lg font-bold text-center mb-2">Graphic Equalizer</h3>
      <div
        className="grid gap-x-1 gap-y-4 justify-center"
        style={{
          gridTemplateColumns: `repeat(${EQ_FREQUENCIES.length + 1}, minmax(0, 1fr))`,
        }}
      >
        {/* Pre-gain slider */}
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-400">Gain</span>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-5 h-32 appearance-none bg-transparent [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-black/25 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-500"
            style={{ writingMode: "vertical-lr", direction: "rtl" }}
          />
          <span className="text-xs font-bold">{(volume * 100).toFixed(0)}</span>
        </div>

        {/* EQ sliders */}
        {EQ_FREQUENCIES.map((freq, i) => (
          <div key={freq} className="flex flex-col items-center">
            <span className="text-xs text-gray-400">
              {formatFrequency(freq)}
            </span>
            <input
              type="range"
              min="-15"
              max="15"
              step="0.5"
              value={gains[i]}
              onChange={(e) => onGainChange(i, parseFloat(e.target.value))}
              className="w-5 h-32 appearance-none bg-transparent [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-black/25 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
              style={{ writingMode: "vertical-lr", direction: "rtl" }}
            />
            <span className="text-xs font-bold">{gains[i].toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
