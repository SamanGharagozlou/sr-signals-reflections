import { describe, expect, it } from "vitest";
import { ACAPS_PUBLICATIONS, ACAPS_COUNTRIES, filterAcapsPublications, isSafeAcapsUrl, isValidPublication } from "../lib/acaps-archive-model";

describe("ACAPS report archive snapshot",()=>{
 it("contains real source metadata for Afghanistan and Colombia",()=>{
   expect(ACAPS_PUBLICATIONS.some(r=>r.country==="Afghanistan" && r.linkType==="pdf")).toBe(true);
   expect(ACAPS_PUBLICATIONS.some(r=>r.country==="Colombia" && r.linkType==="pdf")).toBe(true);
 });
 it("contains only unique, checked reports, in date order",()=>{
   expect(new Set(ACAPS_PUBLICATIONS.map(x=>x.id)).size).toBe(ACAPS_PUBLICATIONS.length);
   expect(ACAPS_PUBLICATIONS.length).toBeGreaterThanOrEqual(5);
   expect(ACAPS_PUBLICATIONS.every(isValidPublication)).toBe(true);
   expect(ACAPS_PUBLICATIONS.map(r=>r.publishedOn)).toEqual([...ACAPS_PUBLICATIONS.map(r=>r.publishedOn)].sort().reverse());
 });
 it("rejects unsafe offsite, http, inline and redirected URLs",()=>{
   for (const url of ["http://www.acaps.org/en/countries/archives","https://acaps.org.evil.com/en/countries/archives", "javascript:alert(1)","https://www.acaps.org@evil.com/en/countries/archives","https://www.acaps.org/fileadmin/private.csv", "https://www.acaps.org/en/countries/archives?redirect=https://evil.com"]){
     expect(isSafeAcapsUrl(url)).toBe(false);
   }
 });
 it("searches title and topic, and filters by country",()=>{
   expect(filterAcapsPublications("Afghanistan","").length).toBe(1);
   expect(filterAcapsPublications("Colombia","earthquake").length).toBe(1);
   expect(filterAcapsPublications("All countries","THIS_TOPIC_DOES_NOT_EXIST")).toEqual([]);
   expect(ACAPS_COUNTRIES).toContain("Ukraine");
 });
});
