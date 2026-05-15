export interface RadiologyCategoryDef {
  id: string;
  name: string;
  icon: string;
  exams: string[];
}

export const radiologyCategories: RadiologyCategoryDef[] = [
  {
    id: "xray",
    name: "X-Ray",
    icon: "Scan",
    exams: ["Chest X-Ray", "Spine X-Ray", "Limb X-Ray"],
  },
  {
    id: "ultrasound",
    name: "Ultrasound",
    icon: "Radio",
    exams: ["Abdominal Ultrasound", "Pelvic Ultrasound", "Obstetric Ultrasound"],
  },
  {
    id: "ct",
    name: "CT-Scan",
    icon: "Scan",
    exams: ["Head CT-Scan", "Chest CT-Scan", "Abdomen CT-Scan"],
  },
  {
    id: "mri",
    name: "MRI",
    icon: "Scan",
    exams: ["Brain MRI", "Spine MRI", "Knee MRI"],
  },
];

export const examCategoryMap: Record<string, string> = {};
for (const cat of radiologyCategories) {
  for (const exam of cat.exams) {
    examCategoryMap[exam] = cat.id;
  }
}
