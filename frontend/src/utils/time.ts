export function formatTime(sec: number): string {
	if (!isFinite(sec)) return "00:00";
	const m = Math.floor(sec / 60)
		.toString()
		.padStart(2, "0");
	const s = Math.floor(sec % 60)
		.toString()
		.padStart(2, "0");
	return `${m}:${s}`;
}
