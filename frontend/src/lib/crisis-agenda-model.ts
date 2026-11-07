/** Phase 15E demo fixture. NONE of these values are verified current humanitarian data. */
export type Region = "Africa" | "Europe" | "Asia" | "Middle East" | "Americas";
export type Order = "need" | "recent" | "attention";
export type Expert = { id: string; label: string; specialty: string; area: string; available: boolean; active: string };
export type Crisis = {
  id: string; name: string; region: Region; date: string; title: string;
  peopleM: number; media: "low" | "medium" | "high"; reportAgeDays: number;
  expertInputs: number; experts: Expert[]; sourceUrl?: string;
};
const expert = (id: string, specialty: string, area: string, available = true, active = "this week"): Expert =>
  ({ id, label: `Expert ${id}`, specialty, area, available, active });

// All cases, names/availability and metrics below are fictional. Links go to genuine ACAPS country pages, not an auto-verified latest report.
export const DEMO_CRISES: Crisis[] = [
  {id:"sudan",name:"Sudan",region:"Africa",date:"2026-11-04",title:"Fictional scenario: food insecurity and displacement",peopleM:30,media:"medium",reportAgeDays:5,expertInputs:14,experts:[expert("P-35","WASH","North Darfur"),expert("P-40","Health","Khartoum"),expert("P-19","Food security","Gedaref"),expert("P-15","Logistics","West Darfur"),expert("P-14","Shelter","Blue Nile"),expert("P-08","Protection","Kordofan",false,"two weeks ago")],sourceUrl:"https://www.acaps.org/en/countries/sudan"},
  {id:"drc",name:"DR Congo (east)",region:"Africa",date:"2026-09-02",title:"Fictional scenario: displacement around Goma",peopleM:25,media:"low",reportAgeDays:68,expertInputs:3,experts:[expert("P-43","Displacement","North Kivu") ]},
  {id:"afghanistan",name:"Afghanistan",region:"Asia",date:"2026-10-28",title:"Fictional scenario: early flood warning",peopleM:23,media:"low",reportAgeDays:12,expertInputs:6,experts:[expert("P-51","Climate","Nangarhar")]},
  {id:"yemen",name:"Yemen",region:"Middle East",date:"2026-09-21",title:"Fictional scenario: healthcare service disruption",peopleM:19,media:"low",reportAgeDays:49,expertInputs:2,experts:[expert("P-62","Public health","Aden")]},
  {id:"myanmar",name:"Myanmar",region:"Asia",date:"2026-08-25",title:"Fictional scenario: conflict and flood displacement",peopleM:18,media:"low",reportAgeDays:76,expertInputs:1,experts:[expert("P-71","Shelter","Northern Myanmar")]},
  {id:"ukraine",name:"Ukraine",region:"Europe",date:"2026-11-03",title:"Fictional scenario: humanitarian access",peopleM:13,media:"high",reportAgeDays:6,expertInputs:11,experts:[expert("P-52","Protection","Western Ukraine"),expert("P-53","Infrastructure","Central Ukraine")],sourceUrl:"https://www.acaps.org/en/countries/ukraine"},
  {id:"south-sudan",name:"South Sudan",region:"Africa",date:"2026-09-30",title:"Fictional scenario: returnee support",peopleM:9,media:"low",reportAgeDays:40,expertInputs:4,experts:[expert("P-29","Protection","Upper Nile")]},
  {id:"chad",name:"Chad",region:"Africa",date:"2026-10-20",title:"Fictional scenario: arrivals from Sudan",peopleM:7,media:"low",reportAgeDays:20,expertInputs:8,experts:[expert("P-11","Displacement","Eastern Chad"),expert("P-12","WASH","Ouaddaï")],sourceUrl:"https://www.acaps.org/en/countries/chad"},
  {id:"burkina",name:"Burkina Faso",region:"Africa",date:"2026-08-12",title:"Fictional scenario: blocked supply access",peopleM:6,media:"low",reportAgeDays:89,expertInputs:0,experts:[]},
  {id:"haiti",name:"Haiti",region:"Americas",date:"2026-10-29",title:"Fictional scenario: urban protection concerns",peopleM:6,media:"medium",reportAgeDays:11,expertInputs:5,experts:[expert("P-88","Protection","Port-au-Prince")]},
  {id:"somalia",name:"Somalia",region:"Africa",date:"2026-09-08",title:"Fictional scenario: drought recovery",peopleM:6,media:"low",reportAgeDays:62,expertInputs:2,experts:[expert("P-91","Food security","Somalia")]},
  {id:"gaza",name:"Gaza",region:"Middle East",date:"2026-11-05",title:"Fictional scenario: humanitarian access constraints",peopleM:3,media:"high",reportAgeDays:4,expertInputs:9,experts:[expert("P-95","Health","Gaza")]},
  {id:"cameroon",name:"Cameroon",region:"Africa",date:"2026-07-30",title:"Fictional scenario: displacement and floods",peopleM:3,media:"low",reportAgeDays:102,expertInputs:0,experts:[]},
  {id:"car",name:"Central African Republic",region:"Africa",date:"2026-08-19",title:"Fictional scenario: disrupted humanitarian access",peopleM:2.8,media:"low",reportAgeDays:82,expertInputs:1,experts:[expert("P-99","Protection","Bangui")]},
];
export const REGIONS: ("All" | Region)[] = ["All","Africa","Asia","Middle East","Europe","Americas"];
export function isUnderCovered(c: Crisis) {
  return c.peopleM >= 2.5 && c.media === "low" && (c.reportAgeDays > 45 || c.expertInputs < 3);
}
export function orderCrises(cases: Crisis[], order: Order, region: "All" | Region, underOnly: boolean) {
  const visible=cases.filter(c=>(region==="All" || c.region===region) && (!underOnly || isUnderCovered(c)));
  return visible.sort((a,b)=>order==="need" ? b.peopleM-a.peopleM || a.name.localeCompare(b.name) :
    order==="recent" ? b.date.localeCompare(a.date) || a.name.localeCompare(b.name) :
      Number(isUnderCovered(b))-Number(isUnderCovered(a)) || b.peopleM-a.peopleM);
}
