/* ── MITTI — Map helpers usable outside the client-only map bundle ──
 *
 * FieldMap.tsx imports Leaflet at module scope, so anything that needs this
 * check without loading Leaflet imports it from here instead.
 */
import type { Device } from '@/lib/types';

export function hasCoordinates(device: Device): boolean {
  return (
    typeof device.latitude === 'number' &&
    typeof device.longitude === 'number' &&
    !Number.isNaN(device.latitude) &&
    !Number.isNaN(device.longitude) &&
    // 0,0 is in the Atlantic: a device reporting it has no fix, not a location.
    !(device.latitude === 0 && device.longitude === 0)
  );
}
