// Helper service to fetch real OSRM road/rail geometries and curved geodesic flight paths

const routeCache = new Map<string, [number, number][]>();

/**
 * Calculates a smooth curved Bezier path between two lat/lng points
 * Used for flights, ferries, or long-distance train/bus fallbacks
 */
export function generateCurvedPath(
  from: [number, number],
  to: [number, number],
  numPoints: number = 30
): [number, number][] {
  const [lat1, lng1] = from;
  const [lat2, lng2] = to;

  // Calculate midpoint
  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;

  // Calculate distance
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  const dist = Math.sqrt(dLat * dLat + dLng * dLng);

  // Offset control point perpendicular to straight line
  const bendFactor = Math.min(Math.max(dist * 0.2, 0.15), 3.0);
  
  // Perpendicular vector (-dLng, dLat)
  const controlLat = midLat - dLng * 0.25 * (dist > 10 ? 0.3 : 0.6);
  const controlLng = midLng + dLat * 0.25 * (dist > 10 ? 0.3 : 0.6);

  const points: [number, number][] = [];

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    // Quadratic Bezier: B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
    const lat = (1 - t) * (1 - t) * lat1 + 2 * (1 - t) * t * controlLat + t * t * lat2;
    const lng = (1 - t) * (1 - t) * lng1 + 2 * (1 - t) * t * controlLng + t * t * lng2;
    points.push([lat, lng]);
  }

  return points;
}

/**
 * Fetches real route geometry from OpenStreetMap OSRM API
 * Falls back to curved path on failure, long distance, or flight mode
 */
export async function getRealisticRoute(
  from: [number, number],
  to: [number, number],
  mode: string = 'Train'
): Promise<[number, number][]> {
  const [lat1, lng1] = from;
  const [lat2, lng2] = to;

  // If points are virtually identical, return straight pair
  if (Math.abs(lat1 - lat2) < 0.0001 && Math.abs(lng1 - lng2) < 0.0001) {
    return [from, to];
  }

  const normalizedMode = mode.toLowerCase();
  const cacheKey = `${lat1.toFixed(4)},${lng1.toFixed(4)}_${lat2.toFixed(4)},${lng2.toFixed(4)}_${normalizedMode}`;

  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  // Flights or Ferries always use smooth curved paths
  if (normalizedMode === 'flight' || normalizedMode === 'ferry') {
    const curved = generateCurvedPath(from, to);
    routeCache.set(cacheKey, curved);
    return curved;
  }

  // Estimate distance in degrees (~111km per degree)
  const approxDistKm = Math.sqrt((lat2 - lat1) ** 2 + (lng2 - lng1) ** 2) * 111;

  // For very long overland trips (>1200km), fallback to curved path to prevent OSRM timeout
  if (approxDistKm > 1200) {
    const curved = generateCurvedPath(from, to);
    routeCache.set(cacheKey, curved);
    return curved;
  }

  const profile = normalizedMode === 'walk' ? 'foot' : 'driving';
  const url = `https://router.project-osrm.org/route/v1/${profile}/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes[0]?.geometry?.coordinates) {
        // GeoJSON coordinates are [lng, lat], map to Leaflet [lat, lng]
        const rawCoords: [number, number][] = data.routes[0].geometry.coordinates;
        const leafletCoords: [number, number][] = rawCoords.map(([lng, lat]) => [lat, lng]);
        
        if (leafletCoords.length >= 2) {
          routeCache.set(cacheKey, leafletCoords);
          return leafletCoords;
        }
      }
    }
  } catch (err) {
    // Network or abort error fallback
  }

  // Fallback: curved path or straight segment
  const fallback = approxDistKm > 30 ? generateCurvedPath(from, to) : [from, to];
  routeCache.set(cacheKey, fallback);
  return fallback;
}
