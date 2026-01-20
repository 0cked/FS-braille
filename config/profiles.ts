export type BrailleProfile = {
  id: "en-us-g1" | "en-us-g2";
  label: string;
  description: string;
  tables: string[];
  grade: "g1" | "g2";
};

export const BRAILLE_PROFILES: BrailleProfile[] = [
  {
    id: "en-us-g2",
    label: "US English (Contracted / Grade 2)",
    description: "Standard contracted UEB for general signage.",
    tables: ["en-us-g2.ctb"],
    grade: "g2"
  },
  {
    id: "en-us-g1",
    label: "US English (Uncontracted / Grade 1)",
    description: "Literal spelling for part numbers, acronyms, and short labels.",
    tables: ["en-us-g1.ctb"],
    grade: "g1"
  }
];

export const DEFAULT_PROFILE_ID: BrailleProfile["id"] = "en-us-g2";

export const getProfileById = (id: BrailleProfile["id"]) =>
  BRAILLE_PROFILES.find((profile) => profile.id === id) ?? BRAILLE_PROFILES[0];
