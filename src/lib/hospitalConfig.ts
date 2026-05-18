export function getHospitalName(): string {
  if (typeof window === "undefined") return "iCare Medical Center";
  return localStorage.getItem("icare_hospital_name") || "iCare Medical Center";
}

export function setHospitalName(name: string): void {
  localStorage.setItem("icare_hospital_name", name);
}
