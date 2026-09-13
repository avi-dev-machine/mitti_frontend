/* ── MITTI — API surface ──
 * Import from '@/lib/api' rather than reaching into the individual modules.
 */
export { ApiError, API_BASE, apiFetch } from './client';
export { devicesApi } from './devices';
export { sensorsApi, advisoriesApi, historyApi } from './monitoring';
export { profileApi, type ProfileUpdate } from './profile';
export { healthApi } from './health';
