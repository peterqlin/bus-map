// Shared bus polygon geometry — used by BusLayer (confirmed positions) and GhostLayer (predictions).

export const BUS_LENGTH_M = 60;
export const BUS_WIDTH_M  = 20;
export const BUS_HEIGHT_M = 16;

function mToLat(m: number): number {
  return m / 111_000;
}

function mToLon(m: number, lat: number): number {
  return m / (111_000 * Math.cos((lat * Math.PI) / 180));
}

/**
 * Returns a closed GeoJSON ring for a bus centred at (lat, lon) heading in degrees
 * (0 = North, 90 = East, clockwise).  The front of the pentagon points in the
 * direction of travel.
 */
export function busPolygon(lat: number, lon: number, heading: number): number[][] {
  const halfLen = mToLat(BUS_LENGTH_M / 2);
  const halfWid = mToLon(BUS_WIDTH_M / 2, lat);

  const θ    = (heading * Math.PI) / 180;
  const cosθ = Math.cos(θ);
  const sinθ = Math.sin(θ);

  function rot(dLon: number, dLat: number): [number, number] {
    return [
      dLon * cosθ + dLat * sinθ,
      -dLon * sinθ + dLat * cosθ,
    ];
  }

  // Pentagon: rectangular body tapering to a nose at the front (+halfLen side).
  const shoulderLen = halfLen * 0.55;
  const corners: [number, number][] = [
    [-halfWid, -halfLen],      // back-left
    [ halfWid, -halfLen],      // back-right
    [ halfWid,  shoulderLen],  // front-right shoulder
    [ 0,        halfLen],      // nose tip
    [-halfWid,  shoulderLen],  // front-left shoulder
  ];

  const ring = corners.map(([dLon, dLat]) => {
    const [rLon, rLat] = rot(dLon, dLat);
    return [lon + rLon, lat + rLat];
  });
  ring.push(ring[0]);
  return ring;
}
