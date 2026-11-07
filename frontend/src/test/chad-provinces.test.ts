import { describe, expect, it } from "vitest";
import { mapProvinceGeojson } from "@/lib/geo/chad-provinces";

describe("Optional ADM1 boundary source", () => {
  it("rejects absent or fabricated data", () => {
    expect(mapProvinceGeojson(null)).toBeNull();
    expect(mapProvinceGeojson({type:"FeatureCollection",features:[]})).toBeNull();
    expect(mapProvinceGeojson({type:"FeatureCollection",features:[{geometry:{type:"Point",coordinates:[1,2]}}]})).toBeNull();
  });
  it("produces paths only from valid, named coordinates", () => {
    const data={type:"FeatureCollection",features:[{type:"Feature",properties:{shapeName:"Example Province"},geometry:{type:"Polygon",coordinates:[[[12,9],[13,9],[13,10],[12,9]]]}}]};
    const result=mapProvinceGeojson(data);
    expect(result?.shapes[0]?.name).toBe("Example Province");
    expect(result?.shapes[0]?.path.startsWith("M")).toBe(true);
    expect(result?.shapes[0]?.path.includes("NaN")).toBe(false);
  });
  it("never accepts out-of-range coordinates", () => {
    const data={type:"FeatureCollection",features:[{properties:{name:"Impossible"},geometry:{type:"Polygon",coordinates:[[[999,999],[13,9],[13,10],[999,999]]]}}]};
    expect(mapProvinceGeojson(data)).toBeNull();
  });
});
