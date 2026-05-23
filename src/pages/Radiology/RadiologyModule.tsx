import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import RadiologyLedger from "./RadiologyLedger";
import RadiologyDiagnosticView from "./RadiologyDiagnosticView";
import RadiologyNewExam from "./RadiologyNewExam";
import ManageCategoriesDialog from "./ManageCategoriesDialog";

const RadiologyModule = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const patientIdParam = searchParams.get("patientId");
  const viewParam = searchParams.get("view");
  const [selectedBatch, setSelectedBatch] = useState<any[] | null>(null);
  const [showNewExam, setShowNewExam] = useState(false);
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  useEffect(() => {
    if (viewParam === "newExam") {
      setShowNewExam(true);
    }
  }, [viewParam]);

  const { data: requests, isLoading, error } = useQuery({
    queryKey: ["radiology-requests"],
    queryFn: async () => {
      const { data: rawReqs, error: reqErr } = await supabase
        .from("radiology_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (reqErr) throw reqErr;

      const rows = toCamel(rawReqs) as any[];
      if (rows.length === 0) return [];

      const patientIds = [...new Set(rows.map((r: any) => r.patientId))];
      const examIds = [...new Set(rows.map((r: any) => r.examId))];
      const reqIds = rows.map((r: any) => r.id);

      const [allPatients, examsRes, resultsRes] = await Promise.all([
        supabase.from("patients").select("*"),
        supabase.from("radiology_exams").select("*, category:radiology_categories(*)").in("id", examIds),
        supabase.from("radiology_results").select("*").in("request_id", reqIds),
      ]);

      const allPatientsCamel = toCamel(allPatients.data ?? []) as any[];
      console.log("allPatientsCamel[0]:", JSON.stringify(allPatientsCamel[0]));
      console.log("row[0] patientId:", JSON.stringify(rows[0]?.patientId));
      console.log("allPatientsCamel length:", allPatientsCamel.length);
      console.log("all patient IDs:", JSON.stringify(allPatientsCamel.map((p: any) => p.id)));

      const patients = Object.fromEntries(
        allPatientsCamel.map((p: any) => [p.patientId, p])
      );
      const patientsById = Object.fromEntries(
        allPatientsCamel.map((p: any) => [p.id, p])
      );

      const exams = Object.fromEntries(
        (toCamel(examsRes.data ?? []) as any[]).map((e: any) => [e.id, e])
      );
      const results = Object.fromEntries(
        (toCamel(resultsRes.data ?? []) as any[]).map((r: any) => [r.requestId, r])
      );

      const merged = rows.map((r: any) => {
        const byDisplayId = patients[r.patientId];
        const byUuid = patientsById[r.patientId];
        console.log("patient lookup:", { patientId: r.patientId, byDisplayId: !!byDisplayId, byUuid: !!byUuid });
        return {
          ...r,
          patient: byDisplayId ?? byUuid ?? null,
          exam: exams[r.examId] ?? null,
          result: results[r.id] ?? null,
        };
      });
      console.log("merged[0].patient:", JSON.stringify(merged[0]?.patient));
      return merged;
    },
  });

  const handleSelectBatch = (batch: any[]) => {
    setSelectedBatch(batch);
    setDiagnosticOpen(true);
  };

  const handleNewExam = () => {
    setShowNewExam(true);
  };

  const handleBack = () => {
    setShowNewExam(false);
    queryClient.invalidateQueries({ queryKey: ["radiology-requests"] });
  };

  const handleCloseDiagnostic = () => {
    setDiagnosticOpen(false);
    setSelectedBatch(null);
    queryClient.invalidateQueries({ queryKey: ["radiology-requests"] });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-[#005EB8] rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Loading radiology workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error("Radiology query error:", error);
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-center py-24">
          <p className="text-sm text-red-500">Failed to load radiology requests. {error instanceof Error ? error.message : "Please try again."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="flex-1 p-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          {showNewExam ? (
            <motion.div
              key="new-exam"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <RadiologyNewExam onBack={handleBack} initialPatientId={patientIdParam || undefined} />
            </motion.div>
          ) : (
            <motion.div
              key="ledger"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <RadiologyLedger
                requests={Array.isArray(requests) ? requests : []}
                onSelectBatch={handleSelectBatch}
                onNewExam={handleNewExam}
                onManageCategories={() => setCategoriesOpen(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <RadiologyDiagnosticView
        requests={selectedBatch ?? []}
        open={diagnosticOpen}
        onClose={handleCloseDiagnostic}
      />

      <ManageCategoriesDialog
        open={categoriesOpen}
        onClose={() => {
          setCategoriesOpen(false);
          queryClient.invalidateQueries({ queryKey: ["radiology-requests"] });
        }}
      />
    </div>
  );
};

export default RadiologyModule;
