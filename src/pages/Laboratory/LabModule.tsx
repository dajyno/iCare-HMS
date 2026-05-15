import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { FlaskConical } from "lucide-react";
import ContextHeader from "./ContextHeader";
import LabOrderTable from "./LabOrderTable";
import LabDetailView from "./LabDetailView";
import NewExamDialog from "./NewExamDialog";

const LabModule = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const { data: requests, isLoading, error } = useQuery({
    queryKey: ["lab-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_requests")
        .select("*, patient:patients(*), test:lab_tests(*), consultation:consultations(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return toCamel(data);
    },
  });

  const markCollectedMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("lab_requests")
        .update({ status: "SampleCollected" })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-requests"] });
    },
  });

  const handleMarkCollected = (order: any) => {
    markCollectedMutation.mutate(order.id);
  };

  const activePatient = selectedOrder
    ? selectedOrder.patient
      ? {
          id: selectedOrder.patient.id,
          firstName: selectedOrder.patient.firstName,
          lastName: selectedOrder.patient.lastName,
          gender: selectedOrder.patient.gender,
          dateOfBirth: selectedOrder.patient.dateOfBirth,
        }
      : null
    : null;

  const handleSelectOrder = (order: any) => {
    setSelectedOrder(order);
  };

  const handleBack = () => {
    setSelectedOrder(null);
    queryClient.invalidateQueries({ queryKey: ["lab-requests"] });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <ContextHeader patient={null} />
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-[#005EB8] rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Loading laboratory workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <ContextHeader patient={null} />
        <div className="flex items-center justify-center py-24">
          <p className="text-sm text-red-500">Failed to load lab requests. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <ContextHeader patient={activePatient} />

      <div className="flex-1 p-6">
        <AnimatePresence mode="wait">
          {!selectedOrder ? (
            <motion.div
              key="orders"
              layoutId="lab-main-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100">
                    <FlaskConical className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-slate-900">
                      Laboratory
                    </h1>
                    <p className="text-xs text-slate-500">
                      Manage test requests and record results
                    </p>
                  </div>
                </div>
                <NewExamDialog
                  onCreated={() =>
                    queryClient.invalidateQueries({ queryKey: ["lab-requests"] })
                  }
                />
              </div>

              <LabOrderTable
                orders={Array.isArray(requests) ? requests : []}
                onSelectOrder={handleSelectOrder}
                onMarkCollected={handleMarkCollected}
              />
            </motion.div>
          ) : (
            <motion.div
              key="detail"
              layoutId="lab-main-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <LabDetailView
                order={selectedOrder}
                onBack={handleBack}
                emrId={selectedOrder?.patient?.patientId}
                doctorId={user?.id}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LabModule;
