import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { Plus, FolderEdit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ContextHeader from "./ContextHeader";
import LabOrderTable from "./LabOrderTable";
import LabDetailView from "./LabDetailView";
import LabTestGrid from "./LabTestGrid";
import LabResultDialog from "./LabResultDialog";
import LabManageCategories from "./LabManageCategories";

const LabModule = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const patientIdParam = searchParams.get("patientId");
  const viewParam = searchParams.get("view");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedBatch, setSelectedBatch] = useState<any[] | null>(null);
  const [viewingResult, setViewingResult] = useState<any>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  useEffect(() => {
    if (viewParam === "newExam") {
      setSelectedOrder("new");
    }
  }, [viewParam]);

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

  const activePatient = selectedOrder && typeof selectedOrder === "object"
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
    if (Array.isArray(order) && order.length > 1) {
      setSelectedBatch(order);
      setSelectedOrder(order[0]);
    } else {
      setSelectedBatch(null);
      setSelectedOrder(Array.isArray(order) ? order[0] : order);
    }
  };

  const handleViewResult = (order: any) => {
    setViewingResult(order);
  };

  const handleEditResult = () => {
    if (viewingResult) {
      setSelectedOrder(viewingResult);
      setViewingResult(null);
    }
  };

  const handleBack = () => {
    setSelectedOrder(null);
    queryClient.invalidateQueries({ queryKey: ["lab-requests"] });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <ContextHeader patient={null} />
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
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

      <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          {selectedOrder === "new" ? (
            <motion.div
              key="grid"
              layoutId="lab-main-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <LabTestGrid onBack={handleBack} initialPatientId={patientIdParam || undefined} />
            </motion.div>
          ) : !selectedOrder ? (
            <motion.div
              key="orders"
              layoutId="lab-main-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="space-y-4 sm:space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-lg font-bold text-slate-900">
                    Laboratory
                  </h1>
                  <p className="text-xs text-slate-500">
                    Manage test requests and record results
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 px-4 gap-1.5 text-xs font-semibold border-slate-200 w-full sm:w-auto"
                    onClick={() => setCategoriesOpen(true)}
                  >
                    <FolderEdit className="w-3.5 h-3.5" />
                    Manage Categories
                  </Button>
                  <Button
                    size="sm"
                    className="bg-[#005EB8] hover:bg-[#004d9a] text-white h-9 px-4 gap-2 font-semibold text-xs w-full sm:w-auto"
                    onClick={() => setSelectedOrder("new")}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Exam
                  </Button>
                </div>
              </div>

              <LabOrderTable
                orders={Array.isArray(requests) ? requests : []}
                onSelectOrder={handleSelectOrder}
                onViewResult={handleViewResult}
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
                batch={selectedBatch}
                onBack={handleBack}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <LabResultDialog
        order={viewingResult}
        open={!!viewingResult}
        onClose={() => setViewingResult(null)}
        onEdit={handleEditResult}
      />

      <LabManageCategories
        open={categoriesOpen}
        onClose={() => {
          setCategoriesOpen(false);
          queryClient.invalidateQueries({ queryKey: ["lab-requests"] });
        }}
      />
    </div>
  );
};

export default LabModule;
