/**
 * Format duration in seconds to mm:ss format
 * @param durationSeconds - Duration in seconds
 * @returns Formatted string (mm:ss)
 */
export function formatDuration(durationSeconds: number): string {
  if (isNaN(durationSeconds) || durationSeconds < 0) {
    return '0:00';
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.floor(durationSeconds % 60);

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

