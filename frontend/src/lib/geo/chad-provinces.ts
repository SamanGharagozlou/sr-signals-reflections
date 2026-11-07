/** Optional local geoBoundaries / OCHA ADM1 province geometry.
 * This file transforms only user-supplied boundary shapes; it never calculates
 * humanitarian severity, event probabilities, private expert locations or risk scores.
 */
export interface ProvinceShape { name: string; path: string; }
export interface ProvinceMap { shapes: ProvinceShape[]; source: "local-adm1"; }

type Point = [number, number];
const finitePoint = (p: unknown): p is Point => Array.isArray(p) && p.length >= 2 &&
  typeof p[0] === "number" && typeof p[1] === "number" && Number.isFinite(p[0]) && Number.isFinite(p[1]) &&
  p[0] >= -180 && p[0] <= 180 && p[1] >= -90 && p[1] <= 90;

export function mapProvinceGeojson(input: unknown): ProvinceMap | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;
  if (obj.type !== "FeatureCollection" || !Array.isArray(obj.features) || obj.features.length === 0 || obj.features.length > 100) return null;
  const features: { name: string; rings: Point[][] }[] = [];
  const points: Point[] = [];
  for (const v of obj.features) {
    if (!v || typeof v !== "object") continue;
    const f = v as Record<string, any>;
    const type = f.geometry?.type;
    if ((type !== "Polygon" && type !== "MultiPolygon") || !Array.isArray(f.geometry?.coordinates)) continue;
    const names = f.properties || {};
    const raw = names.shapeName ?? names.ADM1_EN ?? names.admin1Name ?? names.NAME_1 ?? names.name;
    if (typeof raw !== "string" || !raw.trim() || raw.length > 100) continue;
    const polygons: unknown[] = type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    const rings: Point[][] = [];
    for (const polygon of polygons) {
      if (!Array.isArray(polygon)) continue;
      for (const ring of polygon) {
        if (!Array.isArray(ring) || ring.length < 4 || ring.length > 15000 || !ring.every(finitePoint)) continue;
        const geoRing = ring as Point[];
        rings.push(geoRing);
        points.push(...geoRing);
      }
    }
    if (rings.length) features.push({ name: raw.trim(), rings });
  }
  if (!features.length || !points.length) return null;
  const lons = points.map(p=>p[0]), lats = points.map(p=>p[1]);
  const minX=Math.min(...lons), maxX=Math.max(...lons), minY=Math.min(...lats), maxY=Math.max(...lats);
  const spanX=maxX-minX, spanY=maxY-minY;
  if (spanX <= 0 || spanY <= 0 || spanX > 40 || spanY > 40) return null;
  const scale = Math.min(850/spanX, 650/spanY);
  const startX = (1000 - spanX*scale)/2, startY=(740 - spanY*scale)/2;
  const pathFor = (rings: Point[][]) => rings.map(r => r.map((p,i)=>
    `${i?"L":"M"}${(startX+(p[0]-minX)*scale).toFixed(1)},${(startY+(maxY-p[1])*scale).toFixed(1)}`).join(" ")+" Z").join(" ");
  return {source:"local-adm1",shapes:features.map(f=>({name:f.name,path:pathFor(f.rings)}))};
}
