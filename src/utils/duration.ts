export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0s';
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function toSeconds(minutes: number, seconds: number): number {
  return minutes * 60 + seconds;
}

export function splitSeconds(totalSeconds: number): { minutes: number; seconds: number } {
  return { minutes: Math.floor(totalSeconds / 60), seconds: totalSeconds % 60 };
}
