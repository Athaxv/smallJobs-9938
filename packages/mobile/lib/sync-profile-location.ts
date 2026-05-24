import { profileApi } from "./api";

const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000;
let lastSyncedAt = 0;
let lastLat: number | null = null;
let lastLng: number | null = null;

export async function syncProfileCoordinates(
  lat: number,
  lng: number,
  force = false,
): Promise<void> {
  const now = Date.now();
  const sameCoords =
    lastLat === lat && lastLng === lng && now - lastSyncedAt < MIN_SYNC_INTERVAL_MS;
  if (!force && sameCoords) return;

  try {
    await profileApi.patch({ lat, lng });
    lastSyncedAt = now;
    lastLat = lat;
    lastLng = lng;
  } catch (err) {
    console.warn("[sync-profile-location]", err);
  }
}
