import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import RadiologyLedger from "./RadiologyLedger";
import RadiologyDiagnosticView from "./RadiologyDiagnosticView";
import RadiologyNewExam from "./RadiologyNewExam";

const RadiologyModule = () => {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showNewExam, setShowNewExam] = useState(false);
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);

  const { data: requests, isLoading, error } = useQuery({
    queryKey: ["radiology-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("radiology_requests")
        .select("*, patient:patients(*), exam:radiology_exams(*, category:radiology_categories(*)), result:radiology_results(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return toCamel(data);
    },
  });

  const handleSelectRequest = (req: any) => {
    setSelectedRequest(req);
    setDiagnosticOpen(true);
  };

  const handleNewExam = () => {
    setShowNewExam(true);
  };

  const handleBack = () => {
    setShowNewExam(false);
    setSelectedRequest(null);
    queryClient.invalidateQueries({ queryKey: ["radiology-requests"] });
  };

  const handleCloseDiagnostic = () => {
    setDiagnosticOpen(false);
    setSelectedRequest(null);
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
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-center py-24">
          <p className="text-sm text-red-500">Failed to load radiology requests. Please try again.</p>
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
              <RadiologyNewExam onBack={handleBack} />
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
                onSelectRequest={handleSelectRequest}
                onNewExam={handleNewExam}
                onManageCategories={() => {}}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <RadiologyDiagnosticView
        request={selectedRequest}
        open={diagnosticOpen}
        onClose={handleCloseDiagnostic}
      />
    </div>
  );
};

export default RadiologyModule;
