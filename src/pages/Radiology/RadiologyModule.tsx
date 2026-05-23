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
      console.log("radiology rows:", rows.length, rows[0]);
      if (rows.length === 0) return [];

      const patientIds = [...new Set(rows.map((r: any) => r.patientId))];
      const examIds = [...new Set(rows.map((r: any) => r.examId))];
      const reqIds = rows.map((r: any) => r.id);
      console.log("patientIds:", patientIds);

      const [patientsRes, examsRes, resultsRes] = await Promise.all([
        supabase.from("patients").select("*").in("id", patientIds),
        supabase.from("radiology_exams").select("*, category:radiology_categories(*)").in("id", examIds),
        supabase.from("radiology_results").select("*").in("request_id", reqIds),
      ]);
      console.log("patients error:", patientsRes.error, "patients found:", patientsRes.data?.length);
      console.log("exams error:", examsRes.error, "exams found:", examsRes.data?.length, "results found:", resultsRes.data?.length);

      const patients = Object.fromEntries((toCamel(patientsRes.data ?? []) as any[]).map((p: any) => [p.id, p]));
      const exams = Object.fromEntries((toCamel(examsRes.data ?? []) as any[]).map((e: any) => [e.id, e]));
      const results = Object.fromEntries((toCamel(resultsRes.data ?? []) as any[]).map((r: any) => [r.requestId, r]));

      const merged = rows.map((r: any) => ({
        ...r,
        patient: patients[r.patientId] ?? null,
        exam: exams[r.examId] ?? null,
        result: results[r.id] ?? null,
      }));
      console.log("merged[0]:", merged[0]);
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
