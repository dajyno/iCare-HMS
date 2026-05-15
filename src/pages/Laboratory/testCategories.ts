export interface TestCategory {
  id: string;
  name: string;
  tests: string[];
}

export const testCategories: TestCategory[] = [
  {
    id: "haematology",
    name: "Haematology",
    tests: [
      "Haemoglobin (Hb)", "Packed Cell Volume (PCV)", "White Cell Count",
      "Differential & Film Comments", "Full Blood Count", "Red Cell Count",
      "E.S.R", "M.C.H", "M.C.H.C", "M.C.V", "Sickling Test", "Hb. Genotype",
      "Blood Grouping & Rhesus", "Blood Film for Malaria Parasite",
      "Blood for Microfilaria", "Bleeding Time", "Clotting Time",
    ],
  },
  {
    id: "microbiology",
    name: "Micro Biology",
    tests: [
      "Urine/Micro Culture & Sensitivity", "Stool - Microscopy", "Stool - M.C.S",
      "Stool - Occult Blood", "Blood for Culture & Sensitivity", "Widal Reaction Test",
      "V.D.R.L Test", "Khan Test", "A.S.O Titre", "Rheumatoid Factor Test",
      "Sputum for Acid Fast Bacilli", "Sputum Culture & Sensitivity", "Swab Culture & Sensitivity",
    ],
  },
  {
    id: "clinical_chemistry",
    name: "Clinical Chemistry",
    tests: [
      "Pregnancy Test - (Urine/Blood)", "Full Urinalysis & Microscopy", "Full Electrolytes",
      "Sodium", "Potassium", "Chloride", "Bicarbonate", "Urea", "Creatinine",
      "Fasting Blood Sugar", "Random Blood Sugar", "Glucose Tolerance Test",
    ],
  },
  {
    id: "hormone_profiles",
    name: "Hormone Profiles",
    tests: [
      "Progesterone", "Testosterone", "Cortisol", "DHEA-S", "Oestrogen (E2)", "Estradiol (E3)",
    ],
  },
  {
    id: "thyroid_hormones",
    name: "Thyroid Hormones",
    tests: [
      "Thyroxine (Total T4)", "Free Thyroxine (T4)", "Triodothyronine (T3)", "TSH",
    ],
  },
];

export const commonTests: string[] = [
  "Malaria Parasite", "PCV", "Urinalysis", "Blood Sugar", "Widal Test",
];

export const testDictionary: string[] = [
  ...new Set([
    ...commonTests,
    ...testCategories.flatMap((c) => c.tests),
  ]),
].sort();
