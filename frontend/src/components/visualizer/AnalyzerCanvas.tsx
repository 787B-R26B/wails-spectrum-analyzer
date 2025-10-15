import React, { useEffect, useRef } from "react";

export type VisMode = "bars" | "wave" | "bars+wave";

type Props = {
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  visMode: VisMode;
  className?: string;
};

const AnalyzerCanvas: React.FC<Props> = ({ analyserRef, visMode, className }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const barSpacing = 2;

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

      const analyser = analyserRef.current;
      if (!analyser) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      if (visMode === "bars" || visMode === "bars+wave") {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        const barWidth = Math.max(1, Math.floor(w / bufferLength - barSpacing));
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i];
          const barHeight = (v / 255) * (h * 0.9);
          const grd = ctx2d.createLinearGradient(0, h, 0, h - barHeight);
          grd.addColorStop(0, "#1f2937");
          grd.addColorStop(1, "#60a5fa");
          ctx2d.fillStyle = grd;
          ctx2d.fillRect(x, h - barHeight, barWidth, barHeight);
          x += barWidth + barSpacing;
        }
      }

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
          const v = timeArray[i] / 128.0;
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
  }, [analyserRef, visMode, dpr]);

  return (
    <div className={`flex-1 min-h-[220px] rounded-2xl overflow-hidden border border-gray-200 bg-white ${className ?? ""}`}>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};

export default AnalyzerCanvas;
