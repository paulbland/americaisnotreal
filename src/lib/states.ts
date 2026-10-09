import type { StateCode } from "../data/schema.ts";

export const STATE_NAMES: Record<StateCode, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "Washington, D.C.",
  PR: "Puerto Rico",
  US: "Nationwide",
};

export function stateName(code: StateCode): string {
  return STATE_NAMES[code];
}

export function stateSlug(code: StateCode): string {
  return STATE_NAMES[code].toLowerCase().replace(/[.,]/g, "").replace(/\s+/g, "-");
}

export function statePath(code: StateCode): string {
  return `/states/${stateSlug(code)}`;
}

/** "Tampa, Florida" or "Florida" or "Nationwide". */
export function place(city: string | null, state: StateCode): string {
  if (state === "US") return "Nationwide";
  return city ? `${city}, ${STATE_NAMES[state]}` : STATE_NAMES[state];
}
