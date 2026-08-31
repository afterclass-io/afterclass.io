export function calculateAverage(array: number[]): number {
  const total = array.reduce((sum: number, item: number) => sum + item, 0);
  return total / array.length;
}
