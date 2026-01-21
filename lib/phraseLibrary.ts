export type PhraseGroup = {
  id: string;
  label: string;
  phrases: string[];
};

export const DEFAULT_PHRASE_GROUPS: PhraseGroup[] = [
  {
    id: "wayfinding",
    label: "Wayfinding",
    phrases: [
      "ENTRANCE",
      "EXIT",
      "EMERGENCY EXIT",
      "NOT AN EXIT",
      "LOBBY",
      "RECEPTION",
      "INFORMATION",
      "WAITING ROOM",
      "OFFICE",
      "TRAINING ROOM",
      "CONFERENCE ROOM",
      "COPY ROOM",
      "BREAK ROOM",
      "KITCHEN",
      "RESTROOM",
      "MEN",
      "WOMEN",
      "ALL GENDER RESTROOM",
      "ELEVATOR",
      "STAIRS",
      "ROOM",
      "SUITE",
      "MAILROOM",
      "SHIPPING",
      "RECEIVING",
      "STORAGE",
      "SUPPLY",
      "IT",
      "HUMAN RESOURCES",
      "ACCOUNTING",
      "ELECTRICAL",
      "MECHANICAL",
      "JANITOR",
      "CUSTODIAL",
      "WAREHOUSE",
      "PARKING",
      "CUSTOMER SERVICE",
      "CHECK IN",
      "CHECK OUT"
    ]
  },
  {
    id: "actions",
    label: "Door & Actions",
    phrases: [
      "PUSH",
      "PULL",
      "PUSH TO OPEN",
      "PULL TO OPEN",
      "PLEASE KNOCK",
      "PLEASE RING BELL",
      "PLEASE WAIT HERE",
      "PLEASE USE OTHER DOOR",
      "PLEASE CLOSE DOOR"
    ]
  },
  {
    id: "rules",
    label: "Rules",
    phrases: [
      "NO SMOKING",
      "NO FOOD OR DRINK",
      "NO CELL PHONES",
      "NO SOLICITING",
      "NO TRESPASSING",
      "NO ENTRY",
      "DO NOT ENTER",
      "KEEP OUT",
      "AUTHORIZED PERSONNEL ONLY",
      "STAFF ONLY",
      "EMPLOYEES ONLY",
      "VISITORS MUST SIGN IN",
      "PRIVATE"
    ]
  },
  {
    id: "safety",
    label: "Safety",
    phrases: [
      "DANGER",
      "CAUTION",
      "NOTICE",
      "WET FLOOR",
      "FIRE EXIT",
      "FIRE ALARM",
      "FIRE EXTINGUISHER",
      "FIRST AID",
      "AED",
      "IN CASE OF FIRE",
      "EMERGENCY",
      "EMERGENCY USE ONLY"
    ]
  },
  {
    id: "fastsigns",
    label: "FASTSIGNS",
    phrases: ["FASTSIGNS", "WELCOME TO FASTSIGNS", "THANK YOU"]
  }
];

export const getDefaultPhrases = (): string[] => {
  const all = DEFAULT_PHRASE_GROUPS.flatMap((group) => group.phrases);
  return Array.from(new Set(all));
};
