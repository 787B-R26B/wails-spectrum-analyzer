import { EQ_FREQUENCIES } from "../audio/useAudioGraph";

const formatFrequency = (freq: number) => {
  return freq < 1000 ? freq.toFixed(0) : `${(freq / 1000).toFixed(1)}k`;
};

type EqualizerProps = {
  gains: number[];
  onGainChange: (index: number, value: number) => void;
  preGain: number;
  onPreGainChange: (value: number) => void;
  isEnabled: boolean;
  onEnabledChange: (value: boolean) => void;
  onResetAll: () => void;
};

export function Equalizer({
  gains,
  onGainChange,
  preGain,
  onPreGainChange,
  isEnabled,
  onEnabledChange,
  onResetAll,
}: EqualizerProps) {
  return (
    <div
      className={`bg-gray-800 bg-opacity-50 p-4 rounded-lg transition-opacity ${
        !isEnabled && "opacity-50"
      }`}
    >
      <div className="flex justify-between items-center mb-2 relative">
        <button
          onClick={onResetAll}
          className="px-3 py-1 text-sm rounded-md bg-gray-600 text-gray-300"
        >
          Reset
        </button>
        <h3 className="text-lg font-bold text-center absolute left-1/2 -translate-x-1/2">
          Graphic Equalizer
        </h3>
        <button
          onClick={() => onEnabledChange(!isEnabled)}
          className={`px-3 py-1 text-sm rounded-md ${
            isEnabled ? "bg-blue-600 text-white" : "bg-gray-600 text-gray-300"
          }`}
        >
          {isEnabled ? "ON" : "OFF"}
        </button>
      </div>
      <div
        className={`grid gap-x-1 gap-y-4 justify-center ${
          !isEnabled && "pointer-events-none"
        }`}
        style={{
          gridTemplateColumns: `repeat(${EQ_FREQUENCIES.length + 1}, minmax(0, 1fr))`,
        }}
      >
        {/* Pre-gain slider */}
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-400 h-6">Pre Gain</span>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={preGain}
            onChange={(e) => onPreGainChange(parseFloat(e.target.value))}
            onDoubleClick={() => onPreGainChange(1)}
            onContextMenu={(e) => {
              e.preventDefault();
              onPreGainChange(1);
            }}
            className="w-5 h-32 appearance-none bg-transparent [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-black/25 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-500"
            style={{ writingMode: "vertical-lr", direction: "rtl" }}
          />
          <span className="text-xs font-bold">{preGain.toFixed(2)}x</span>
        </div>

        {/* EQ sliders */}
        {EQ_FREQUENCIES.map((freq, i) => (
          <div key={freq} className="flex flex-col items-center">
            <span className="text-xs text-gray-400 h-6">
              {formatFrequency(freq)}
            </span>
            <input
              type="range"
              min="-15"
              max="15"
              step="0.5"
              value={gains[i]}
              onChange={(e) => onGainChange(i, parseFloat(e.target.value))}
              onDoubleClick={() => onGainChange(i, 0)}
              onContextMenu={(e) => {
                e.preventDefault();
                onGainChange(i, 0);
              }}
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
