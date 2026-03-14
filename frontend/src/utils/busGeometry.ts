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
  const halfLen = BUS_LENGTH_M / 2;  // metres, along forward axis
  const halfWid = BUS_WIDTH_M  / 2;  // metres, along lateral axis

  const θ    = (heading * Math.PI) / 180;
  const cosθ = Math.cos(θ);
  const sinθ = Math.sin(θ);

  // Rotate (dRight, dFwd) in metres → geographic [ΔLon°, ΔLat°].
  // All arithmetic stays in a uniform metre space before converting to degrees,
  // so the aspect ratio is preserved regardless of heading direction.
  function rot(dRight: number, dFwd: number): [number, number] {
    const dEast_m  =  dRight * cosθ + dFwd * sinθ;
    const dNorth_m = -dRight * sinθ + dFwd * cosθ;
    return [
      mToLon(dEast_m,  lat),
      mToLat(dNorth_m),
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

  const ring = corners.map(([dRight, dFwd]) => {
    const [rLon, rLat] = rot(dRight, dFwd);
    return [lon + rLon, lat + rLat];
  });
  ring.push(ring[0]);
  return ring;
}
