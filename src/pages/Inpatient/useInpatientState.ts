import { useState, useMemo, useCallback, useEffect } from "react";
import { supabase, toCamel } from "@/src/lib/supabase";
import type {
  InpatientMasterState,
  ActiveAdmission,
  VitalsRecord,
  MedicationSchedule,
  FluidEntry,
  WardConfig,
  BedUnit,
} from "./inpatientTypes";

export const INITIAL_STATE: InpatientMasterState = {
  activeAdmissions: [],
  wardConfiguration: [],
};

const attendingDoctors = [
  "Dr. Eric Lieberman",
  "Dr. Jane Wanjiku",
  "Dr. Grace Ochieng",
  "Dr. Michael Otieno",
  "Dr. Faith Njoki",
  "Dr. Kevin Kimani",
];

function computeDaysAdmitted(admissionDate: string): number {
  const admitted = new Date(admissionDate);
  const now = new Date();
  const diff = now.getTime() - admitted.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function useInpatientState() {
  const [state, setState] = useState<InpatientMasterState>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchWards() {
      try {
        let { data, error } = await supabase
          .from("wards")
          .select("*, department:departments(name), beds(*)")
          .order("name", { ascending: true });
        if (error) {
          console.warn("Wards join query failed, trying without department join:", error);
          const fallback = await supabase
            .from("wards")
            .select("*, beds(*)")
            .order("name", { ascending: true });
          if (!fallback.error) { data = fallback.data; error = null; }
        }
        if (cancelled) return null;
        if (error) { console.warn("Wards fetch error:", error); return null; }
        return (data || []).map((w: any) => ({
          wardId: w.id,
          name: w.name,
          department: w.department?.name ?? w.type ?? "General",
          totalBeds: w.beds?.length ?? 0,
          beds: (w.beds || []).map((b: any) => ({
            bedCode: b.bed_number,
            status: (b.status === "Occupied"
              ? "Occupied"
              : b.status === "Cleaning" || b.status === "Maintenance"
              ? "Maintenance/Sanitizing"
              : "Available") as BedUnit["status"],
            price: b.price ?? 2500,
          })),
        }));
      } catch (err) {
        console.warn("Wards fetch exception:", err);
        return null;
      }
    }

    async function fetchAdmissions() {
      try {
        const { data, error } = await supabase
          .from("admissions")
          .select("*, patient:patients(*), ward:wards(name), bed:beds(bed_number)")
          .eq("status", "Admitted")
          .order("admission_date", { ascending: false });
        if (cancelled) return null;
        if (error) { console.warn("Admissions fetch error:", error); return null; }
        return (data || []).map((a: any) => ({
          admissionId: a.id,
          wardCode: a.ward?.name ?? "Unknown",
          bedNo: a.bed?.bed_number ?? "Unknown",
          patient: {
            folderNo: a.patient?.patient_id ?? "",
            name: `${a.patient?.first_name ?? ""} ${a.patient?.last_name ?? ""}`.trim(),
            age: a.patient?.date_of_birth
              ? Math.floor(
                  (Date.now() - new Date(a.patient.date_of_birth).getTime()) /
                    (1000 * 60 * 60 * 24 * 365.25)
                )
              : 0,
            allergies: a.patient?.allergies
              ? a.patient.allergies.split(",").map((s: string) => s.trim()).filter(Boolean)
              : [],
          },
          attendingPhysician: "Unassigned",
          daysAdmitted: computeDaysAdmitted(a.admission_date),
          careStatus: "Stable",
          vitalsHistory: [],
          medicationSchedule: [],
          fluidLedger: { intake: [], output: [] },
        }));
      } catch (err) {
        console.warn("Admissions fetch exception:", err);
        return null;
      }
    }

    async function fetchInitialData() {
      setLoading(true);
      const [wardConfig, activeAdmissions] = await Promise.all([
        fetchWards(),
        fetchAdmissions(),
      ]);
      if (!cancelled) {
        setState({
          wardConfiguration: wardConfig ?? [],
          activeAdmissions: activeAdmissions ?? [],
        });
        setLoading(false);
      }
    }

    fetchInitialData();
    return () => { cancelled = true; };
  }, []);

  const wards = useMemo(
    () =>
      Array.from(new Set(state.activeAdmissions.map((a) => a.wardCode)))
        .sort()
        .map((code) => ({
          code,
          admissions: state.activeAdmissions.filter((a) => a.wardCode === code),
        })),
    [state.activeAdmissions]
  );

  const computeFluidBalance = useCallback(
    (admissionId: string) => {
      const admission = state.activeAdmissions.find((a) => a.admissionId === admissionId);
      if (!admission) return 0;
      const totalIntake = admission.fluidLedger.intake.reduce((s, e) => s + e.volume, 0);
      const totalOutput = admission.fluidLedger.output.reduce((s, e) => s + e.volume, 0);
      return totalIntake - totalOutput;
    },
    [state.activeAdmissions]
  );

  const searchPatients = useCallback(
    async (query: string) => {
      if (!query.trim()) return [];
      try {
        const { data, error } = await supabase
          .from("patients")
          .select("patient_id, first_name, last_name, date_of_birth, allergies")
          .or(
            `first_name.ilike.%${query}%,last_name.ilike.%${query}%,patient_id.ilike.%${query}%`
          )
          .limit(10);
        if (error) throw error;
        return (data || []).map((p: any) => ({
          folderNo: p.patient_id,
          name: `${p.first_name} ${p.last_name}`.trim(),
          age: p.date_of_birth
            ? Math.floor(
                (Date.now() - new Date(p.date_of_birth).getTime()) /
                  (1000 * 60 * 60 * 24 * 365.25)
              )
            : 0,
          allergies: p.allergies
            ? p.allergies.split(",").map((s: string) => s.trim()).filter(Boolean)
            : [],
        }));
      } catch {
        return [];
      }
    },
    []
  );

  const searchMedications = useCallback(
    async (query: string) => {
      try {
        const { data, error } = await supabase
          .from("medications")
          .select("id, name, strength")
          .ilike("name", `%${query}%`)
          .limit(10);
        if (error) throw error;
        return (data || []).map((m: any) => ({
          drugId: m.id,
          name: `${m.name}${m.strength ? ` - ${m.strength}` : ""}`,
        }));
      } catch {
        const fallback = [
          { drugId: "D-99", name: "Amoxicillin - 500mg Capsule" },
          { drugId: "D-12", name: "Ceftriaxone - 1g Injection" },
          { drugId: "D-45", name: "Paracetamol - 500mg Tablet" },
          { drugId: "D-78", name: "Metronidazole - 400mg Tablet" },
          { drugId: "D-33", name: "Omeprazole - 20mg Capsule" },
        ];
        return fallback.filter((m) => m.name.toLowerCase().includes(query.toLowerCase()));
      }
    },
    []
  );

  const finalizeAdmission = useCallback(
    (payload: {
      patient: { folderNo: string; name: string; age: number; allergies: string[] };
      wardCode: string;
      bedNo: string;
      provisionalDiagnosis: string;
      chiefComplaints: string;
      attendingPhysician: string;
    }) => {
      const newAdmission: ActiveAdmission = {
        admissionId: `ADM-${Date.now()}`,
        wardCode: payload.wardCode,
        bedNo: payload.bedNo,
        patient: payload.patient,
        attendingPhysician: payload.attendingPhysician,
        daysAdmitted: 0,
        careStatus: "Stable",
        vitalsHistory: [],
        medicationSchedule: [],
        fluidLedger: { intake: [], output: [] },
        clinicalNotes: "",
      };

      setState((prev) => ({
        ...prev,
        activeAdmissions: [...prev.activeAdmissions, newAdmission],
        wardConfiguration: prev.wardConfiguration.map((ward) => ({
          ...ward,
          beds: ward.beds.map((bed) =>
            bed.bedCode === payload.bedNo ? { ...bed, status: "Occupied" as const } : bed
          ),
        })),
      }));
    },
    []
  );

  const commitVitals = useCallback(
    (admissionId: string, vitals: Omit<VitalsRecord, "timestamp">) => {
      const record: VitalsRecord = {
        ...vitals,
        timestamp: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        activeAdmissions: prev.activeAdmissions.map((a) =>
          a.admissionId === admissionId
            ? {
                ...a,
                vitalsHistory: [...a.vitalsHistory, record],
                clinicalNotes: a.clinicalNotes
                  ? `${a.clinicalNotes}\n[${new Date().toLocaleString()}] Vitals: BP ${vitals.bp}, Pulse ${vitals.pulse}, Temp ${vitals.temp}°C, SpO2 ${vitals.spo2}%${vitals.observations ? ` — ${vitals.observations}` : ""}`
                  : `[${new Date().toLocaleString()}] Vitals: BP ${vitals.bp}, Pulse ${vitals.pulse}, Temp ${vitals.temp}°C, SpO2 ${vitals.spo2}%${vitals.observations ? ` — ${vitals.observations}` : ""}`,
              }
            : a
        ),
      }));
    },
    []
  );

  const assignMedication = useCallback(
    (admissionId: string, med: MedicationSchedule) => {
      setState((prev) => ({
        ...prev,
        activeAdmissions: prev.activeAdmissions.map((a) =>
          a.admissionId === admissionId
            ? { ...a, medicationSchedule: [...a.medicationSchedule, med] }
            : a
        ),
      }));
    },
    []
  );

  const recordAdministration = useCallback(
    (admissionId: string, drugId: string, slot: string, status: "Administered" | "Missed" | "Skipped", note: string) => {
      setState((prev) => ({
        ...prev,
        activeAdmissions: prev.activeAdmissions.map((a) =>
          a.admissionId === admissionId
            ? {
                ...a,
                medicationSchedule: a.medicationSchedule.map((m) =>
                  m.drugId === drugId
                    ? {
                        ...m,
                        administrationLog: m.administrationLog.map((log) =>
                          log.slot === slot
                            ? { ...log, status, loggedAt: new Date().toISOString(), note }
                            : log
                        ),
                      }
                    : m
                ),
              }
            : a
        ),
      }));
    },
    []
  );

  const recordFluidEntry = useCallback(
    (admissionId: string, type: "intake" | "output", entry: Omit<FluidEntry, "itemId" | "timestamp">) => {
      const fluidEntry: FluidEntry = {
        ...entry,
        itemId: `${type === "intake" ? "IN" : "OUT"}-${Date.now()}`,
        timestamp: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        activeAdmissions: prev.activeAdmissions.map((a) =>
          a.admissionId === admissionId
            ? {
                ...a,
                fluidLedger: {
                  ...a.fluidLedger,
                  [type]: [...a.fluidLedger[type], fluidEntry],
                },
              }
            : a
        ),
      }));
    },
    []
  );

  const getBedPrice = useCallback(
    (wardCode: string, bedNo: string): number => {
      for (const ward of state.wardConfiguration) {
        if (ward.name === wardCode || ward.wardId === wardCode) {
          const bed = ward.beds.find((b) => b.bedCode === bedNo);
          if (bed) return bed.price;
        }
      }
      return 2500;
    },
    [state.wardConfiguration]
  );

  const authorizeDischarge = useCallback(
    async (admissionId: string, dischargeSummary: string) => {
      const admission = state.activeAdmissions.find((a) => a.admissionId === admissionId);
      if (!admission) return;

      const bedStayDays = admission.daysAdmitted;
      const bedRatePerDay = getBedPrice(admission.wardCode, admission.bedNo);
      const bedStayCost = bedStayDays * bedRatePerDay;

      const medsTotal = admission.medicationSchedule.reduce((sum, m) => {
        const adminCount = m.administrationLog.filter(
          (l) => l.status === "Administered"
        ).length;
        return sum + adminCount * 150;
      }, 0);

      const totalAmount = bedStayCost + medsTotal || 0;

      setState((prev) => ({
        ...prev,
        activeAdmissions: prev.activeAdmissions.map((a) =>
          a.admissionId === admissionId
            ? {
                ...a,
                careStatus: "Discharged" as const,
                clinicalNotes: a.clinicalNotes
                  ? `${a.clinicalNotes}\n[${new Date().toLocaleString()}] Discharged: ${dischargeSummary}`
                  : `[${new Date().toLocaleString()}] Discharged: ${dischargeSummary}`,
              }
            : a
        ),
        wardConfiguration: prev.wardConfiguration.map((ward) => ({
          ...ward,
          beds: ward.beds.map((bed) =>
            bed.bedCode === admission.bedNo ? { ...bed, status: "Available" as const } : bed
          ),
        })),
      }));

      if (totalAmount <= 0) {
        console.log("Discharge processed: no chargeable items");
        return;
      }

      const invoiceNumber = `INV-${Date.now()}`;
      const invoicePayload = {
        invoice_number: invoiceNumber,
        patient_id: admission.patient.folderNo,
        total_amount: totalAmount,
        amount_paid: 0,
        balance: totalAmount,
        status: "Unpaid",
      };

      try {
        const { data: invoice, error: invError } = await (supabase as any)
          .from("invoices")
          .insert([invoicePayload])
          .select()
          .single();

        if (invError) throw invError;

        if (invoice) {
          const lineItems = [
            {
              invoice_id: invoice.id,
              description: `Bed Stay - ${admission.wardCode} ${admission.bedNo} (${bedStayDays} days @ ₦${bedRatePerDay}/day)`,
              quantity: bedStayDays,
              unit_price: bedRatePerDay,
              total: bedStayCost,
            },
            {
              invoice_id: invoice.id,
              description: `Administered Medications (${admission.medicationSchedule.length} drugs)`,
              quantity: 1,
              unit_price: medsTotal,
              total: medsTotal,
            },
          ];

          const { error: itemsError } = await (supabase as any)
            .from("invoice_items")
            .insert(lineItems);

          if (itemsError) throw itemsError;
        }

        console.log(`Invoice ${invoiceNumber} created for ₦${totalAmount}`);
      } catch (err) {
        console.error("Failed to create invoice in Supabase:", err);
      }
    },
    [state.activeAdmissions, state.wardConfiguration, getBedPrice]
  );

  const updateWardConfig = useCallback(
    (wardId: string, updates: Partial<WardConfig>) => {
      setState((prev) => ({
        ...prev,
        wardConfiguration: prev.wardConfiguration.map((w) =>
          w.wardId === wardId ? { ...w, ...updates } : w
        ),
      }));
    },
    []
  );

  const updateBedStatus = useCallback(
    (wardId: string, bedCode: string, status: BedUnit["status"]) => {
      setState((prev) => ({
        ...prev,
        wardConfiguration: prev.wardConfiguration.map((w) =>
          w.wardId === wardId
            ? {
                ...w,
                beds: w.beds.map((b) =>
                  b.bedCode === bedCode ? { ...b, status } : b
                ),
              }
            : w
        ),
      }));
    },
    []
  );

  const addWard = useCallback(
    (ward: Omit<WardConfig, "beds"> & { bedCount: number }) => {
      const newWard: WardConfig = {
        wardId: ward.wardId || `WARD-${Date.now()}`,
        name: ward.name,
        department: ward.department,
        totalBeds: ward.bedCount,
        beds: Array.from({ length: ward.bedCount }, (_, i) => ({
          bedCode: `${ward.wardId || `WARD-${Date.now()}`}-B${String(i + 1).padStart(2, "0")}`,
          status: "Available" as const,
          price: 2500,
        })),
      };
      setState((prev) => ({
        ...prev,
        wardConfiguration: [...prev.wardConfiguration, newWard],
      }));
    },
    []
  );

  const deleteWard = useCallback(
    (wardId: string) => {
      setState((prev) => ({
        ...prev,
        wardConfiguration: prev.wardConfiguration.filter((w) => w.wardId !== wardId),
        activeAdmissions: prev.activeAdmissions.filter(
          (a) => {
            const ward = prev.wardConfiguration.find((w) => w.wardId === wardId);
            return ward ? a.wardCode !== ward.name : true;
          }
        ),
      }));
    },
    []
  );

  return {
    state,
    wards,
    loading,
    computeFluidBalance,
    searchPatients,
    searchMedications,
    finalizeAdmission,
    commitVitals,
    assignMedication,
    recordAdministration,
    recordFluidEntry,
    authorizeDischarge,
    updateWardConfig,
    updateBedStatus,
    addWard,
    deleteWard,
    getBedPrice,
    setState,
    attendingDoctors,
  };
}
