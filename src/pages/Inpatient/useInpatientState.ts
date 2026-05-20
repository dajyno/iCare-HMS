import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { supabase, toCamel } from "@/src/lib/supabase";
import { generateInvoiceNumber } from "@/src/lib/invoiceNumber";
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

const PERSIST_KEY = "icare-inpatient-state";

function loadPersistedState(): InpatientMasterState {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (raw) {
      return JSON.parse(raw) as InpatientMasterState;
    }
  } catch {
    /* corrupted data – ignore */
  }
  return INITIAL_STATE;
}

function computeDaysAdmitted(admissionDate: string): number {
  const admitted = new Date(admissionDate);
  const now = new Date();
  const diff = now.getTime() - admitted.getTime();
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
}

async function getDefaultDepartmentId(): Promise<string | null> {
  try {
    const { data } = await supabase.from("departments").select("id").limit(1).maybeSingle();
    if (data?.id) return data.id;
    const { data: newDept } = await supabase
      .from("departments")
      .insert({ name: "General", description: "General Department" })
      .select("id")
      .single();
    return newDept?.id ?? null;
  } catch {
    return null;
  }
}

export function useInpatientState() {
  const [state, setState] = useState<InpatientMasterState>(loadPersistedState);
  const [loading, setLoading] = useState(true);
  const [loadingWards, setLoadingWards] = useState(true);
  const [loadingAdmissions, setLoadingAdmissions] = useState(true);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);
  const realtimeRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(PERSIST_KEY, JSON.stringify(state));
    } catch {
      /* quota exceeded – ignore */
    }
  }, [state]);

  useEffect(() => {
    let cancelled = false;

    async function fetchWards(): Promise<any[] | null> {
      try {
        let { data, error } = await supabase
          .from("wards")
          .select("*, department:departments(name), beds(*)")
          .order("name", { ascending: true });
        if (error) {
          console.warn("[wards] Join query failed, trying without department join:", error);
          const fallback = await supabase
            .from("wards")
            .select("*, beds(*)")
            .order("name", { ascending: true });
          if (fallback.error) {
            console.warn("[wards] Fallback also failed:", fallback.error);
            return null;
          }
          data = fallback.data;
        }
        if (cancelled) return null;
        console.log(`[wards] Fetched ${data?.length ?? 0} wards from Supabase`, data);
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
        console.warn("[wards] Fetch exception:", err);
        return null;
      }
    }

    async function fetchAdmissions(): Promise<any[] | null> {
      try {
        // Diagnostic: count all admitted admissions (ignores join failures)
        try {
          const { count } = await (supabase as any)
            .from("admissions")
            .select("id", { count: "exact", head: true })
            .eq("status", "Admitted");
          console.log(`[admissions] Diagnostic count of admitted rows: ${count}`);
        } catch (e) {
          console.warn("[admissions] Diagnostic count failed:", e);
        }

        const { data, error } = await supabase
          .from("admissions")
          .select("*, patient:patients(*), ward:wards(name), bed:beds(bed_number)")
          .eq("status", "Admitted")
          .order("admission_date", { ascending: false });
        if (cancelled) return null;
        if (error) {
          console.warn("[admissions] Supabase query error:", error);
          return null;
        }
        console.log(`[admissions] Fetched ${data?.length ?? 0} rows`, data);
        if (!data || data.length === 0) {
          return [];
        }
        return (data).map((a: any) => ({
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
          admissionDate: a.admission_date,
          daysAdmitted: computeDaysAdmitted(a.admission_date),
          careStatus: "Stable",
          vitalsHistory: [],
          medicationSchedule: [],
          fluidLedger: { intake: [], output: [] },
        }));
      } catch (err) {
        console.warn("[admissions] Fetch exception:", err);
        return null;
      }
    }

    async function migrateLegacyWards(wardConfig: any[]) {
      try {
        const legacy = loadPersistedState();
        if (legacy.wardConfiguration.length === 0) return wardConfig;
        const deptId = await getDefaultDepartmentId();
        for (const legacyWard of legacy.wardConfiguration) {
          const exists = wardConfig?.some((w) => w.name === legacyWard.name);
          if (exists) continue;
          const { data: wardData, error: wardError } = await supabase
            .from("wards")
            .insert({ name: legacyWard.name, type: legacyWard.department, beds_count: legacyWard.beds.length, department_id: deptId })
            .select()
            .single();
          if (wardError) { console.warn("Legacy ward migration failed:", wardError); continue; }
          const bedInserts = legacyWard.beds.map((b: any) => ({
            ward_id: wardData.id,
            bed_number: b.bedCode,
            status: b.status === "Maintenance/Sanitizing" ? "Maintenance" : b.status,
          }));
          const { error: bedsError } = await supabase.from("beds").insert(bedInserts);
          if (bedsError) console.warn("Legacy bed migration failed:", bedsError);
        }
        try { localStorage.removeItem(PERSIST_KEY); } catch {}
        return fetchWards();
      } catch (err) {
        console.warn("Legacy ward migration exception:", err);
        return wardConfig;
      }
    }

    async function fetchClinicalData(admissions: any[]): Promise<Map<string, any>> {
      const result = new Map<string, any>();
      if (!admissions || admissions.length === 0) return result;

      const ids = admissions.map((a: any) => a.admissionId);
      const s = supabase as any;

      admissions.forEach((a: any) => {
        result.set(a.admissionId, {
          vitalsHistory: [],
          medicationSchedule: [],
          fluidLedger: { intake: [], output: [] },
          clinicalNotes: "",
        });
      });

      await Promise.all([
        (async () => {
          const { data } = await s
            .from("inpatient_vitals")
            .select("*")
            .in("admission_id", ids)
            .order("recorded_at", { ascending: true });
          if (data) {
            for (const v of data) {
              const r = result.get(v.admission_id);
              if (r) r.vitalsHistory.push({
                timestamp: v.recorded_at,
                bp: v.bp,
                pulse: v.pulse,
                temp: Number(v.temp),
                spo2: v.spo2,
                observations: v.observations || "",
              });
            }
          }
        })(),
        (async () => {
          const { data } = await s
            .from("inpatient_medication_schedules")
            .select("*")
            .in("admission_id", ids)
            .order("created_at", { ascending: true });
          if (data) {
            for (const m of data) {
              const r = result.get(m.admission_id);
              if (r) r.medicationSchedule.push({
                scheduleEntryId: m.id,
                drugId: m.drug_id,
                name: m.drug_name,
                quantity: m.quantity,
                unitPrice: Number(m.unit_price),
                frequency: m.frequency,
                assignedSlots: m.assigned_slots || [],
                administrationLog: m.admin_log || [],
              });
            }
          }
        })(),
        (async () => {
          const { data } = await s
            .from("inpatient_fluid_entries")
            .select("*")
            .in("admission_id", ids)
            .order("recorded_at", { ascending: true });
          if (data) {
            for (const f of data) {
              const r = result.get(f.admission_id);
              if (r) {
                const entry = { itemId: f.id, timestamp: f.recorded_at, source: f.source, volume: Number(f.volume) };
                if (f.type === "intake") r.fluidLedger.intake.push(entry);
                else r.fluidLedger.output.push(entry);
              }
            }
          }
        })(),
        (async () => {
          const { data } = await s
            .from("inpatient_clinical_notes")
            .select("admission_id, content")
            .in("admission_id", ids);
          if (data) {
            for (const n of data) {
              const r = result.get(n.admission_id);
              if (r) r.clinicalNotes = n.content;
            }
          }
        })(),
      ]);

      return result;
    }

    async function fetchInitialData() {
      setLoading(true);
      setLoadingWards(true);
      setLoadingAdmissions(true);
      setDiagnostic(null);
      try {
        setLoadingWards(true);
        setLoadingAdmissions(true);
        let [wardConfig, activeAdmissions] = await Promise.all([
          fetchWards(),
          fetchAdmissions(),
        ]);
        setLoadingWards(false);
        setLoadingAdmissions(false);
        if (cancelled) return;
        wardConfig = await migrateLegacyWards(wardConfig);
        if (cancelled) return;

        const persisted = loadPersistedState();

        if (activeAdmissions === null) {
          setDiagnostic(
            "Failed to load admissions from database. Check console for details. " +
            "Falling back to locally saved data."
          );
          activeAdmissions = persisted.activeAdmissions;
        } else if (activeAdmissions.length === 0 && !persisted.activeAdmissions.length) {
          setDiagnostic(
            "No admitted patients found in the database. " +
            "Use \"+ New Admission\" to admit a patient, or check the admissions table in your Supabase dashboard."
          );
        }

        if (wardConfig === null) {
          setDiagnostic((prev) =>
            (prev ?? "") + " Failed to load ward configuration from database."
          );
          wardConfig = persisted.wardConfiguration;
        }

        // Load clinical data from DB, fall back to localStorage
        let clinicalMap: Map<string, any> | null = null;
        if (activeAdmissions && activeAdmissions.length > 0) {
          try {
            clinicalMap = await fetchClinicalData(activeAdmissions);
          } catch (e) {
            console.warn("[clinical] Failed to load clinical data from DB:", e);
          }
        }

        const mergeClinical = (admissions: any[]) =>
          admissions.map((a: any) => {
            const clinical = clinicalMap?.get(a.admissionId);
            if (clinical) return { ...a, ...clinical };
            // Fallback: merge from persisted localStorage
            const persistedAdm = persisted.activeAdmissions.find((p: any) => p.admissionId === a.admissionId);
            if (persistedAdm) return { ...a, vitalsHistory: persistedAdm.vitalsHistory, medicationSchedule: persistedAdm.medicationSchedule, fluidLedger: persistedAdm.fluidLedger, clinicalNotes: persistedAdm.clinicalNotes };
            return a;
          });

        setState({
          wardConfiguration: wardConfig ?? [],
          activeAdmissions: mergeClinical(activeAdmissions ?? []),
        });
      } catch (err) {
        console.error("fetchInitialData failed:", err);
        setDiagnostic("Unexpected error loading inpatient data. See console for details.");
        if (!cancelled) {
          setState(loadPersistedState());
        }
      } finally {
        if (!cancelled) setLoading(false);
        // Set up Realtime subscription after initial load completes
        if (!cancelled) setupRealtimeSubscription();
      }
    }

    function setupRealtimeSubscription() {
      try {
        const channel = supabase
          .channel("inpatient-admissions")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "admissions" },
            async (payload: any) => {
              if (cancelled) return;
              console.log("[realtime] admissions change:", payload.eventType);

              // Re-fetch admissions in background
              const fresh = await fetchAdmissions();
              if (cancelled || fresh === null) return;

              let clinicalMap: Map<string, any> | null = null;
              if (fresh.length > 0) {
                try {
                  clinicalMap = await fetchClinicalData(fresh);
                } catch (e) {
                  console.warn("[realtime] clinical fetch failed:", e);
                }
              }
              if (cancelled) return;

              setState((prev) => {
                const merge = (admissions: any[]) =>
                  admissions.map((a: any) => {
                    const c = clinicalMap?.get(a.admissionId);
                    if (c) return { ...a, ...c };
                    const p = prev.activeAdmissions.find((pa: any) => pa.admissionId === a.admissionId);
                    if (p) return { ...a, vitalsHistory: p.vitalsHistory, medicationSchedule: p.medicationSchedule, fluidLedger: p.fluidLedger, clinicalNotes: p.clinicalNotes };
                    return a;
                  });
                return { ...prev, activeAdmissions: merge(fresh) };
              });
            }
          )
          .subscribe();

        realtimeRef.current = channel;
      } catch (e) {
        console.warn("[realtime] Failed to set up subscription:", e);
      }
    }

    fetchInitialData().catch((err) => console.error("fetchInitialData unhandled:", err));
    return () => {
      cancelled = true;
      if (realtimeRef.current) {
        supabase.removeChannel(realtimeRef.current);
        realtimeRef.current = null;
      }
    };
  }, []);

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
    async (payload: {
      patient: { folderNo: string; name: string; age: number; allergies: string[] };
      wardCode: string;
      bedNo: string;
      provisionalDiagnosis: string;
      chiefComplaints: string;
      attendingPhysician: string;
    }) => {
      const now = new Date().toISOString();

      const s = supabase as any;

      // Validate patient exists in DB
      const { data: patientData, error: patientErr } = await s
        .from("patients")
        .select("id")
        .eq("patient_id", payload.patient.folderNo)
        .maybeSingle();
      if (patientErr || !patientData) {
        alert("Patient not found in database. Please register the patient first.");
        return;
      }

      // Validate ward exists
      const { data: wardData, error: wardErr } = await s
        .from("wards")
        .select("id")
        .eq("name", payload.wardCode)
        .maybeSingle();
      if (wardErr || !wardData) {
        alert("Ward not found. Please configure wards in Inpatient Settings.");
        return;
      }

      // Validate bed exists and is not already occupied
      const { data: bedData, error: bedErr } = await s
        .from("beds")
        .select("id, status")
        .eq("bed_number", payload.bedNo)
        .eq("ward_id", wardData.id)
        .maybeSingle();
      if (bedErr || !bedData) {
        alert("Bed not found. Please configure beds in Inpatient Settings.");
        return;
      }
      if (bedData.status === "Occupied") {
        alert("This bed is already occupied. Please select a different bed.");
        return;
      }

      // Look up doctor — optional, doesn't block admission
      let doctorId: string | null = null;
      const { data: userData } = await s
        .from("users")
        .select("id")
        .ilike("full_name", `%${payload.attendingPhysician.replace(/^Dr\.\s*/i, "")}%`)
        .maybeSingle();
      if (userData) doctorId = userData.id;

      // Insert admission into Supabase
      const { error: admError, data: newAdm } = await s
        .from("admissions")
        .insert({
          patient_id: patientData.id,
          ward_id: wardData.id,
          bed_id: bedData.id,
          admission_date: now,
          status: "Admitted",
          admitting_doctor_id: doctorId,
          diagnosis: payload.provisionalDiagnosis || null,
          notes: payload.chiefComplaints || null,
        })
        .select("id")
        .single();

      if (admError || !newAdm) {
        console.error("Failed to create admission:", admError);
        alert("Failed to save admission to database: " + (admError?.message || admError));
        return;
      }

      // Update bed status
      await s.from("beds").update({ status: "Occupied" }).eq("id", bedData.id);

      // Build admission object for state
      const newAdmission: ActiveAdmission = {
        admissionId: newAdm.id,
        wardCode: payload.wardCode,
        bedNo: payload.bedNo,
        patient: payload.patient,
        attendingPhysician: payload.attendingPhysician,
        admissionDate: now,
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
      return true;
    },
    []
  );

  const commitVitals = useCallback(
    async (admissionId: string, vitals: Omit<VitalsRecord, "timestamp">) => {
      const now = new Date().toISOString();
      const record: VitalsRecord = { ...vitals, timestamp: now };

      try {
        const s = supabase as any;
        const { error } = await s.from("inpatient_vitals").insert({
          admission_id: admissionId,
          bp: vitals.bp,
          pulse: vitals.pulse,
          temp: vitals.temp,
          spo2: vitals.spo2,
          observations: vitals.observations || null,
          recorded_at: now,
        });
        if (error) {
          console.warn("[vitals] DB insert failed (table may not exist yet), saving locally:", error);
        }
      } catch (e) {
        console.warn("[vitals] DB insert exception, saving locally:", e);
      }

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

  const s = supabase as any;

  const persistMedSchedule = useCallback(
    async (admissionId: string, med: MedicationSchedule) => {
      try {
        const { data, error } = await s.from("inpatient_medication_schedules").insert({
          admission_id: admissionId,
          drug_id: med.drugId,
          drug_name: med.name,
          quantity: med.quantity,
          unit_price: med.unitPrice,
          frequency: med.frequency,
          assigned_slots: med.assignedSlots,
          admin_log: med.administrationLog,
        }).select("id").single();
        if (error || !data) {
          console.warn("[meds] DB insert failed:", error);
          return null;
        }
        return data.id as string;
      } catch (e) {
        console.warn("[meds] DB insert exception:", e);
        return null;
      }
    },
    [s]
  );

  const assignMedication = useCallback(
    async (admissionId: string, med: MedicationSchedule) => {
      const dbId = await persistMedSchedule(admissionId, med);
      const entry: MedicationSchedule = dbId
        ? { ...med, scheduleEntryId: dbId }
        : { ...med, scheduleEntryId: med.scheduleEntryId || `med-${Date.now()}` };

      setState((prev) => ({
        ...prev,
        activeAdmissions: prev.activeAdmissions.map((a) =>
          a.admissionId === admissionId
            ? {
                ...a,
                medicationSchedule: a.medicationSchedule.some(
                  (m) => m.drugId === med.drugId
                )
                  ? a.medicationSchedule.map((m) =>
                      m.drugId === med.drugId ? entry : m
                    )
                  : [...a.medicationSchedule, entry],
              }
            : a
        ),
      }));
    },
    [persistMedSchedule]
  );

  const updateMedication = useCallback(
    async (admissionId: string, drugId: string, updated: MedicationSchedule) => {
      if (updated.scheduleEntryId && !updated.scheduleEntryId.startsWith("med-")) {
        try {
          await s.from("inpatient_medication_schedules").update({
            drug_id: updated.drugId,
            drug_name: updated.name,
            quantity: updated.quantity,
            unit_price: updated.unitPrice,
            frequency: updated.frequency,
            assigned_slots: updated.assignedSlots,
            admin_log: updated.administrationLog,
          }).eq("id", updated.scheduleEntryId);
        } catch (e) {
          console.warn("[meds] DB update failed:", e);
        }
      }

      setState((prev) => ({
        ...prev,
        activeAdmissions: prev.activeAdmissions.map((a) =>
          a.admissionId === admissionId
            ? {
                ...a,
                medicationSchedule: a.medicationSchedule.map((m) =>
                  m.scheduleEntryId === updated.scheduleEntryId || m.drugId === drugId
                    ? updated
                    : m
                ),
              }
            : a
        ),
      }));
    },
    [s]
  );

  const removeMedication = useCallback(
    async (admissionId: string, drugId: string) => {
      setState((prev) => {
        const admission = prev.activeAdmissions.find((a) => a.admissionId === admissionId);
        const target = admission?.medicationSchedule.find(
          (m) => m.scheduleEntryId === drugId || m.drugId === drugId
        );
        if (target?.scheduleEntryId && !target.scheduleEntryId.startsWith("med-")) {
          s.from("inpatient_medication_schedules").delete().eq("id", target.scheduleEntryId)
            .then(({ error }: any) => {
              if (error) console.warn("[meds] DB delete failed:", error);
            });
        }
        return {
          ...prev,
          activeAdmissions: prev.activeAdmissions.map((a) =>
            a.admissionId === admissionId
              ? {
                  ...a,
                  medicationSchedule: a.medicationSchedule.filter(
                    (m) => m.scheduleEntryId !== drugId && m.drugId !== drugId
                  ),
                }
              : a
          ),
        };
      });
    },
    [s]
  );

  const recordAdministration = useCallback(
    async (admissionId: string, drugId: string, slot: string, status: "Administered" | "Missed" | "Skipped", note: string) => {
      const now = new Date().toISOString();

      setState((prev) => {
        const admission = prev.activeAdmissions.find((a) => a.admissionId === admissionId);
        const target = admission?.medicationSchedule.find((m) => m.drugId === drugId);
        if (target?.scheduleEntryId && !target.scheduleEntryId.startsWith("med-")) {
          const updatedLog = target.administrationLog.map((log) =>
            log.slot === slot ? { ...log, status, loggedAt: now, note } : log
          );
          s.from("inpatient_medication_schedules").update({ admin_log: updatedLog })
            .eq("id", target.scheduleEntryId)
            .then(({ error }: any) => {
              if (error) console.warn("[meds] Admin log DB update failed:", error);
            });
        }

        return {
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
                              ? { ...log, status, loggedAt: now, note }
                              : log
                          ),
                        }
                      : m
                  ),
                }
              : a
          ),
        };
      });
    },
    [s]
  );

  const recordFluidEntry = useCallback(
    async (admissionId: string, type: "intake" | "output", entry: Omit<FluidEntry, "itemId" | "timestamp">) => {
      const now = new Date().toISOString();
      const fluidEntry: FluidEntry = {
        ...entry,
        itemId: `${type === "intake" ? "IN" : "OUT"}-${Date.now()}`,
        timestamp: now,
      };

      try {
        const { error } = await s.from("inpatient_fluid_entries").insert({
          admission_id: admissionId,
          type,
          source: entry.source,
          volume: entry.volume,
          recorded_at: now,
        });
        if (error) console.warn("[fluids] DB insert failed:", error);
      } catch (e) {
        console.warn("[fluids] DB insert exception:", e);
      }

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
    [s]
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
      const s2 = supabase as any;
      const admission = state.activeAdmissions.find((a) => a.admissionId === admissionId);
      if (!admission) return;

      const now = new Date().toISOString();
      const updatedNotes = admission.clinicalNotes
        ? `${admission.clinicalNotes}\n[${new Date().toLocaleString()}] Discharged: ${dischargeSummary}`
        : `[${new Date().toLocaleString()}] Discharged: ${dischargeSummary}`;

      const bedStayDays = admission.admissionDate
        ? Math.max(1, Math.floor((Date.now() - new Date(admission.admissionDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)
        : 1;
      const bedRatePerDay = getBedPrice(admission.wardCode, admission.bedNo);
      const bedStayCost = bedStayDays * bedRatePerDay;

      const medsTotal = admission.medicationSchedule.reduce((sum, m) => {
        const adminCount = m.administrationLog.filter(
          (l) => l.status === "Administered"
        ).length;
        return sum + adminCount * (m.unitPrice || 150) * (m.quantity || 1);
      }, 0);

      const totalAmount = bedStayCost + medsTotal || 0;

      // Persist discharge to Supabase
      try {
        await Promise.all([
          s2.from("admissions").update({ status: "Discharged" }).eq("id", admissionId),
          s2.from("beds")
            .update({ status: "Available" })
            .eq("bed_number", admission.bedNo),
          s2.from("discharges").insert({
            admission_id: admissionId,
            discharge_date: now,
            summary: dischargeSummary,
            status: "Completed",
          }),
          updatedNotes
            ? s2.from("inpatient_clinical_notes").upsert(
                { admission_id: admissionId, content: updatedNotes, recorded_at: now },
                { onConflict: "admission_id" }
              )
            : Promise.resolve(),
        ]);
      } catch (err) {
        console.warn("[discharge] DB persistence failed:", err);
      }

      // Create invoice if there are charges
      if (totalAmount > 0) {
        try {
          const invoiceNumber = await generateInvoiceNumber(supabase);
          const { data: invoice, error: invError } = await s2
            .from("invoices")
            .insert([{
              invoice_number: invoiceNumber,
              patient_id: admission.patient.folderNo,
              total_amount: totalAmount,
              amount_paid: 0,
              balance: totalAmount,
              status: "Unpaid",
            }])
            .select()
            .single();

          if (invError) throw invError;

          if (invoice) {
            const { error: itemsError } = await s2
              .from("invoice_items")
              .insert([
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
              ]);

            if (itemsError) throw itemsError;
          }
          console.log(`Invoice ${invoiceNumber} created for ₦${totalAmount}`);
        } catch (err) {
          console.error("Failed to create invoice in Supabase:", err);
        }
      }

      // Update local state
      setState((prev) => ({
        ...prev,
        activeAdmissions: prev.activeAdmissions.map((a) =>
          a.admissionId === admissionId
            ? {
                ...a,
                careStatus: "Discharged" as const,
                clinicalNotes: updatedNotes,
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
    async (ward: Omit<WardConfig, "beds"> & { bedCount: number }) => {
      try {
        const deptId = await getDefaultDepartmentId();
        const { data: wardData, error: wardError } = await supabase
          .from("wards")
          .insert({ name: ward.name, type: ward.department, beds_count: ward.bedCount, department_id: deptId })
          .select()
          .single();
        if (wardError) throw wardError;
        const bedInserts = Array.from({ length: ward.bedCount }, (_, i) => ({
          ward_id: wardData.id,
          bed_number: `${ward.wardId || wardData.id.slice(0, 8)}-B${String(i + 1).padStart(2, "0")}`,
          status: "Available",
        }));
        const { error: bedsError } = await supabase.from("beds").insert(bedInserts);
        if (bedsError) throw bedsError;
        setState((prev) => ({
          ...prev,
          wardConfiguration: [
            ...prev.wardConfiguration,
            {
              wardId: wardData.id,
              name: ward.name,
              department: ward.department,
              totalBeds: ward.bedCount,
              beds: bedInserts.map((b) => ({
                bedCode: b.bed_number,
                status: "Available" as const,
                price: 2500,
              })),
            },
          ],
        }));
        alert("Ward added successfully.");
      } catch (err: any) {
        alert("Failed to add ward: " + (err?.message || err));
      }
    },
    []
  );

  const deleteWard = useCallback(
    async (wardId: string) => {
      try {
        const { error } = await supabase.from("wards").delete().eq("id", wardId);
        if (error) throw error;
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
        alert("Ward deleted successfully.");
      } catch (err: any) {
        alert("Failed to delete ward: " + (err?.message || err));
      }
    },
    []
  );

  const saveClinicalNotes = useCallback(
    async (admissionId: string, notes: string) => {
      try {
        const { error } = await s.from("inpatient_clinical_notes").upsert(
          { admission_id: admissionId, content: notes, recorded_at: new Date().toISOString() },
          { onConflict: "admission_id" }
        );
        if (error) console.warn("[notes] DB upsert failed:", error);
      } catch (e) {
        console.warn("[notes] DB upsert exception:", e);
      }
      setState((prev) => ({
        ...prev,
        activeAdmissions: prev.activeAdmissions.map((a) =>
          a.admissionId === admissionId ? { ...a, clinicalNotes: notes } : a
        ),
      }));
    },
    [s]
  );

  const liveAdmissions = state.activeAdmissions.map((a) => ({
    ...a,
    daysAdmitted: a.admissionDate
      ? Math.max(1, Math.floor((Date.now() - new Date(a.admissionDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)
      : 1,
  }));

  const wards = Array.from(new Set(liveAdmissions.map((a) => a.wardCode)))
    .sort()
    .map((code) => ({
      code,
      admissions: liveAdmissions.filter((a) => a.wardCode === code),
    }));

  return {
    state: { ...state, activeAdmissions: liveAdmissions },
    wards,
    loading,
    diagnostic,
    computeFluidBalance,
    searchPatients,
    searchMedications,
    finalizeAdmission,
    commitVitals,
    assignMedication,
    updateMedication,
    removeMedication,
    recordAdministration,
    recordFluidEntry,
    authorizeDischarge,
    saveClinicalNotes,
    updateWardConfig,
    updateBedStatus,
    addWard,
    deleteWard,
    getBedPrice,
    setState,
  };
}
