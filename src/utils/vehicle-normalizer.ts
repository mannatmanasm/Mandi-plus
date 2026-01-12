export function normalizeVehicleNumber(value: string): string {
  return value
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase()
    .trim();
}
