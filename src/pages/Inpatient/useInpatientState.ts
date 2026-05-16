import { useState, useMemo, useCallback } from "react";
import { supabase } from "@/src/lib/supabase";
import type {
  InpatientMasterState,
  ActiveAdmission,
  VitalsRecord,
  MedicationSchedule,
  FluidEntry,
  WardConfig,
  BedUnit,
} from "./inpatientTypes";

const INITIAL_STATE: InpatientMasterState = {
  activeAdmissions: [
    {
      admissionId: "ADM-2026-0041",
      wardCode: "ICU-A",
      bedNo: "Bed-03",
      patient: {
        folderNo: "MD/0016/23",
        name: "Jerel Kevin Parocha",
        age: 37,
        allergies: ["Penicillin"],
      },
      attendingPhysician: "Dr. Eric Lieberman",
      daysAdmitted: 4,
      careStatus: "Meds Due",
      vitalsHistory: [
        {
          timestamp: "2026-05-16T08:00:00Z",
          bp: "120/80",
          pulse: 72,
          temp: 36.8,
          spo2: 98,
        },
      ],
      medicationSchedule: [
        {
          drugId: "D-99",
          name: "Amoxicillin - 500mg Capsule",
          frequency: "TDS",
          assignedSlots: ["08:00", "14:00", "22:00"],
          administrationLog: [
            { slot: "08:00", status: "Administered", loggedAt: "2026-05-16T08:05:00Z", note: "" },
            { slot: "14:00", status: "Pending", loggedAt: null, note: "" },
            { slot: "22:00", status: "Pending", loggedAt: null, note: "" },
          ],
        },
      ],
      fluidLedger: {
        intake: [
          { itemId: "IN-01", timestamp: "2026-05-16T09:00:00Z", source: "IV Saline", volume: 500 },
        ],
        output: [
          { itemId: "OUT-01", timestamp: "2026-05-16T10:15:00Z", source: "Urine Output", volume: 350 },
        ],
      },
    },
    {
      admissionId: "ADM-2026-0042",
      wardCode: "GEN-A",
      bedNo: "Bed-07",
      patient: {
        folderNo: "MD/0023/24",
        name: "Sarah Mwangi",
        age: 52,
        allergies: ["Sulfa", "Codeine"],
      },
      attendingPhysician: "Dr. Jane Wanjiku",
      daysAdmitted: 2,
      careStatus: "Critical Observation",
      vitalsHistory: [
        {
          timestamp: "2026-05-16T06:30:00Z",
          bp: "160/95",
          pulse: 104,
          temp: 38.5,
          spo2: 91,
        },
      ],
      medicationSchedule: [
        {
          drugId: "D-12",
          name: "Ceftriaxone - 1g Injection",
          frequency: "BD",
          assignedSlots: ["08:00", "20:00"],
          administrationLog: [
            { slot: "08:00", status: "Administered", loggedAt: "2026-05-16T08:10:00Z", note: "" },
            { slot: "20:00", status: "Pending", loggedAt: null, note: "" },
          ],
        },
      ],
      fluidLedger: {
        intake: [
          { itemId: "IN-02", timestamp: "2026-05-16T07:00:00Z", source: "IV Ringer's Lactate", volume: 1000 },
        ],
        output: [
          { itemId: "OUT-02", timestamp: "2026-05-16T08:30:00Z", source: "Urine Output", volume: 200 },
          { itemId: "OUT-03", timestamp: "2026-05-16T09:00:00Z", source: "Surgical Drain", volume: 150 },
        ],
      },
    },
    {
      admissionId: "ADM-2026-0040",
      wardCode: "GEN-B",
      bedNo: "Bed-12",
      patient: {
        folderNo: "MD/0008/24",
        name: "Peter Kamau",
        age: 45,
        allergies: [],
      },
      attendingPhysician: "Dr. Grace Ochieng",
      daysAdmitted: 7,
      careStatus: "Stable",
      vitalsHistory: [
        {
          timestamp: "2026-05-16T07:45:00Z",
          bp: "118/76",
          pulse: 68,
          temp: 36.6,
          spo2: 99,
        },
      ],
      medicationSchedule: [],
      fluidLedger: {
        intake: [],
        output: [],
      },
    },
  ],
  wardConfiguration: [
    {
      wardId: "W-ICU",
      name: "Intensive Care Unit",
      department: "Critical Care",
      totalBeds: 12,
      beds: [
        { bedCode: "ICU-B01", status: "Occupied" },
        { bedCode: "ICU-B02", status: "Available" },
        { bedCode: "ICU-B03", status: "Maintenance/Sanitizing" },
        { bedCode: "ICU-B04", status: "Available" },
        { bedCode: "ICU-B05", status: "Occupied" },
        { bedCode: "ICU-B06", status: "Available" },
      ],
    },
    {
      wardId: "W-GEN-A",
      name: "General Ward A",
      department: "General Medicine",
      totalBeds: 20,
      beds: [
        { bedCode: "GEN-A-B01", status: "Occupied" },
        { bedCode: "GEN-A-B02", status: "Occupied" },
        { bedCode: "GEN-A-B03", status: "Available" },
        { bedCode: "GEN-A-B04", status: "Available" },
        { bedCode: "GEN-A-B05", status: "Available" },
        { bedCode: "GEN-A-B06", status: "Maintenance/Sanitizing" },
        { bedCode: "GEN-A-B07", status: "Occupied" },
        { bedCode: "GEN-A-B08", status: "Available" },
        { bedCode: "GEN-A-B09", status: "Available" },
        { bedCode: "GEN-A-B10", status: "Occupied" },
      ],
    },
    {
      wardId: "W-GEN-B",
      name: "General Ward B",
      department: "General Medicine",
      totalBeds: 20,
      beds: [
        { bedCode: "GEN-B-B01", status: "Available" },
        { bedCode: "GEN-B-B02", status: "Occupied" },
        { bedCode: "GEN-B-B03", status: "Available" },
        { bedCode: "GEN-B-B04", status: "Available" },
        { bedCode: "GEN-B-B05", status: "Maintenance/Sanitizing" },
        { bedCode: "GEN-B-B06", status: "Occupied" },
      ],
    },
    {
      wardId: "W-MAT",
      name: "Maternity Ward",
      department: "Obstetrics & Gynecology",
      totalBeds: 15,
      beds: [
        { bedCode: "MAT-B01", status: "Occupied" },
        { bedCode: "MAT-B02", status: "Occupied" },
        { bedCode: "MAT-B03", status: "Available" },
        { bedCode: "MAT-B04", status: "Available" },
        { bedCode: "MAT-B05", status: "Available" },
      ],
    },
  ],
};

const mockPatients = [
  { folderNo: "MD/0016/23", name: "Jerel Kevin Parocha", age: 37, allergies: ["Penicillin"] },
  { folderNo: "MD/0023/24", name: "Sarah Mwangi", age: 52, allergies: ["Sulfa", "Codeine"] },
  { folderNo: "MD/0008/24", name: "Peter Kamau", age: 45, allergies: [] },
  { folderNo: "MD/0031/24", name: "Alice Nyambura", age: 29, allergies: ["Aspirin"] },
  { folderNo: "MD/0045/23", name: "James Omondi", age: 61, allergies: ["Penicillin", "Tetracycline"] },
  { folderNo: "MD/0052/24", name: "Grace Wanjiku", age: 33, allergies: [] },
  { folderNo: "MD/0067/23", name: "David Muthomi", age: 48, allergies: ["Sulfa"] },
  { folderNo: "MD/0073/24", name: "Ruth Chebet", age: 25, allergies: [] },
  { folderNo: "MD/0089/23", name: "Samuel Kiprop", age: 55, allergies: ["Iodine"] },
  { folderNo: "MD/0094/24", name: "Faith Akinyi", age: 41, allergies: [] },
];

const attendingDoctors = [
  "Dr. Eric Lieberman",
  "Dr. Jane Wanjiku",
  "Dr. Grace Ochieng",
  "Dr. Michael Otieno",
  "Dr. Faith Njoki",
  "Dr. Kevin Kimani",
];

export function useInpatientState() {
  const [state, setState] = useState<InpatientMasterState>(INITIAL_STATE);

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
    (query: string) => {
      if (!query.trim()) return mockPatients;
      const q = query.toLowerCase();
      return mockPatients.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.folderNo.toLowerCase().includes(q)
      );
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
        admissionId: `ADM-2026-${String(state.activeAdmissions.length + 1).padStart(4, "0")}`,
        wardCode: payload.wardCode,
        bedNo: payload.bedNo,
        patient: payload.patient,
        attendingPhysician: payload.attendingPhysician,
        daysAdmitted: 0,
        careStatus: "Stable",
        vitalsHistory: [],
        medicationSchedule: [],
        fluidLedger: { intake: [], output: [] },
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
    [state.activeAdmissions.length]
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
            ? { ...a, vitalsHistory: [...a.vitalsHistory, record] }
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

  const authorizeDischarge = useCallback(
    async (admissionId: string, dischargeSummary: string) => {
      const admission = state.activeAdmissions.find((a) => a.admissionId === admissionId);
      if (!admission) return;

      const bedStayDays = admission.daysAdmitted;
      const bedRatePerDay = 2500;
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
        activeAdmissions: prev.activeAdmissions.filter(
          (a) => a.admissionId !== admissionId
        ),
        wardConfiguration: prev.wardConfiguration.map((ward) => ({
          ...ward,
          beds: ward.beds.map((bed) =>
            bed.bedCode === admission.bedNo ? { ...bed, status: "Maintenance/Sanitizing" as const } : bed
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
              description: `Bed Stay - ${admission.wardCode} ${admission.bedNo} (${bedStayDays} days @ KES ${bedRatePerDay}/day)`,
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

        console.log(`Invoice ${invoiceNumber} created for KES ${totalAmount}`);
      } catch (err) {
        console.error("Failed to create invoice in Supabase:", err);
      }
    },
    [state.activeAdmissions, state.wardConfiguration]
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
        ...ward,
        beds: Array.from({ length: ward.bedCount }, (_, i) => ({
          bedCode: `${ward.wardId}-B${String(i + 1).padStart(2, "0")}`,
          status: "Available" as const,
        })),
      };
      setState((prev) => ({
        ...prev,
        wardConfiguration: [...prev.wardConfiguration, newWard],
      }));
    },
    []
  );

  const debugGetState = useCallback(() => state, [state]);

  return {
    state,
    wards,
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
    debugGetState,
    setState,
    mockPatients,
    attendingDoctors,
  };
}
