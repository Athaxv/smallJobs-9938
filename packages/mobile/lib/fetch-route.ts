export interface RouteResult {
  coordinates: [number, number][];
  distanceM: number;
  durationSec: number;
}

export function formatRouteDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatRouteDuration(seconds: number): string {
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export async function fetchDrivingRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): Promise<RouteResult | null> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = (await res.json()) as {
      routes?: {
        distance: number;
        duration: number;
        geometry: { coordinates: [number, number][] };
      }[];
    };

    const route = data.routes?.[0];
    if (!route) return null;

    const coordinates = route.geometry.coordinates.map(
      ([lng, lat]) => [lat, lng] as [number, number],
    );

    return {
      coordinates,
      distanceM: route.distance,
      durationSec: route.duration,
    };
  } catch {
    return null;
  }
}
