/**
 * Convert a hex color string to an rgba() value with the given alpha.
 *
 * @param hex - A CSS hex color, e.g. "#3b82f6" or "3b82f6"
 * @param alpha - Opacity between 0 and 1
 * @returns An rgba() color string, or a neutral gray fallback if parsing fails
 */
export function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(100, 100, 100, ${alpha})`;
}
