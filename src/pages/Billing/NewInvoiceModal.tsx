import { useState, useRef, useCallback, useMemo, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  X,
  FolderOpen,
  Stethoscope,
  Bed,
  FileSpreadsheet,
  Plus,
  Loader2,
  Check,
  ChevronRight,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/src/context/AuthContext";
import { usePatients, useDoctors, useCreateInvoice } from "./billingHooks";
import {
  INITIAL_FORM_STATE,
  DEFAULT_LINE_ITEM,
  computeSubtotal,
  computeGrandTotal,
  computeLineItemAmount,
  generateItemCode,
  type LineItem,
  type NewInvoiceFormState,
  type InvoiceSourceType,
} from "./billingTypes";

interface NewInvoiceModalProps {
  open: boolean;
  onClose: () => void;
}

const NewInvoiceModal = ({ open, onClose }: NewInvoiceModalProps) => {
  const { user } = useAuth();
  const createInvoice = useCreateInvoice();

  const [form, setForm] = useState<NewInvoiceFormState>(INITIAL_FORM_STATE);
  const [patientQuery, setPatientQuery] = useState("");
  const [showPatientResults, setShowPatientResults] = useState(false);
  const [selectedTile, setSelectedTile] = useState<InvoiceSourceType | null>(null);
  const searchTimeout = useRef<any>(null);

  const { data: patientResults, isLoading: searchingPatients } =
    usePatients(patientQuery);
  const { data: doctors } = useDoctors();

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM_STATE);
    setPatientQuery("");
    setShowPatientResults(false);
    setSelectedTile(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handlePatientInput = (value: string) => {
    setPatientQuery(value);
    setForm((prev) => ({ ...prev, selectedPatient: null }));
    setShowPatientResults(true);
    clearTimeout(searchTimeout.current);
  };

  const selectPatient = (patient: { id: string; patientId: string; firstName: string; lastName: string }) => {
    setForm((prev) => ({
      ...prev,
      currentStep: 2,
      selectedPatient: patient,
    }));
    setShowPatientResults(false);
    setPatientQuery("");
  };

  const handleTileSelect = (type: InvoiceSourceType) => {
    setSelectedTile(type);
    setForm((prev) => ({ ...prev, sourceType: type }));

    if (type === "Admin") {
      setForm((prev) => ({
        ...prev,
        sourceType: type,
        metaData: { ...prev.metaData, folderFee: 0 },
        lineItems: [
          {
            code: "ADM-01",
            name: "Medical Record Folder Creation Fee",
            type: "Service" as const,
            date: new Date().toISOString().split("T")[0],
            price: 0,
            qty: 1,
            amount: 0,
          },
        ],
      }));
    } else if (type === "Consultation") {
      setForm((prev) => ({
        ...prev,
        sourceType: type,
        metaData: { ...prev.metaData, doctorId: "", doctorName: "", consultationFee: 0 },
        lineItems: [],
      }));
    } else if (type === "Inpatient") {
      setForm((prev) => ({
        ...prev,
        sourceType: type,
        metaData: { ...prev.metaData, admissionDays: 1, dailyBedRate: 0 },
        lineItems: [],
      }));
    } else if (type === "General") {
      setForm((prev) => ({
        ...prev,
        sourceType: type,
        lineItems: [{ ...DEFAULT_LINE_ITEM }],
      }));
    }
  };

  const addConsultationLineItem = () => {
    if (!form.metaData.doctorId || !form.metaData.doctorName) return;
    const fee = form.metaData.consultationFee || 0;
    setForm((prev) => ({
      ...prev,
      lineItems: [
        {
          code: "CONS-01",
          name: `Consultation — Dr. ${prev.metaData.doctorName}`,
          type: "Service" as const,
          date: new Date().toISOString().split("T")[0],
          price: fee,
          qty: 1,
          amount: fee,
        },
      ],
    }));
  };

  const addInpatientLineItem = () => {
    const days = form.metaData.admissionDays || 1;
    const rate = form.metaData.dailyBedRate || 0;
    const total = days * rate;
    setForm((prev) => ({
      ...prev,
      lineItems: [
        {
          code: "INP-01",
          name: `Inpatient Admission (${days} day${days > 1 ? "s" : ""})`,
          type: "Service" as const,
          date: new Date().toISOString().split("T")[0],
          price: total,
          qty: 1,
          amount: total,
        },
      ],
    }));
  };

  const updateGeneralItem = (idx: number, field: keyof LineItem, value: any) => {
    setForm((prev) => {
      const items = prev.lineItems.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: value };
        if (field === "price" || field === "qty") {
          const price = field === "price" ? Number(value) : item.price;
          const qty = field === "qty" ? Number(value) : item.qty;
          updated.amount = computeLineItemAmount(price || 0, qty || 0);
        }
        return updated;
      });
      return { ...prev, lineItems: items };
    });
  };

  const addGeneralRow = () => {
    setForm((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        {
          ...DEFAULT_LINE_ITEM,
          code: generateItemCode(prev.lineItems.length),
        },
      ],
    }));
  };

  const removeGeneralRow = (idx: number) => {
    if (form.lineItems.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== idx).map((item, i) => ({
        ...item,
        code: generateItemCode(i),
      })),
    }));
  };

  const subtotal = useMemo(
    () => computeSubtotal(form.lineItems),
    [form.lineItems]
  );
  const grandTotal = useMemo(
    () => computeGrandTotal(subtotal, form.taxRate),
    [subtotal, form.taxRate]
  );

  const canGenerate = useMemo(() => {
    if (!form.selectedPatient) return false;
    if (form.lineItems.length === 0) return false;
    if (form.lineItems.some((item) => !item.name.trim() || item.price <= 0))
      return false;
    return true;
  }, [form]);

  const handleGenerate = () => {
    if (!canGenerate || !form.selectedPatient) return;

    const invNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    createInvoice.mutate(
      {
        patientId: form.selectedPatient.id,
        sourceType: form.sourceType || "General",
        lineItems: form.lineItems,
        taxRate: form.taxRate,
        createdBy: user?.id || null,
        invoiceNumber: invNumber,
      },
      {
        onSuccess: () => {
          handleClose();
        },
      }
    );
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
      />

      <motion.div
        layout
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={`relative bg-white rounded-2xl shadow-2xl w-full p-6 max-h-[90vh] overflow-y-auto ${
          selectedTile === "General" ? "max-w-4xl" : "max-w-xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">New Invoice</h2>
            <p className="text-xs text-slate-400">
              Step {form.currentStep} of 2
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div
            className={`w-2 h-2 rounded-full ${
              form.currentStep >= 1 ? "bg-blue-600" : "bg-slate-200"
            }`}
          />
          <div
            className={`h-0.5 w-8 rounded ${
              form.currentStep >= 2 ? "bg-blue-600" : "bg-slate-200"
            }`}
          />
          <div
            className={`w-2 h-2 rounded-full ${
              form.currentStep >= 2 ? "bg-blue-600" : "bg-slate-200"
            }`}
          />
        </div>

        <AnimatePresence mode="wait">
          {form.currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ x: -60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -60, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  Search Patient Profile
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={patientQuery}
                    onChange={(e) => handlePatientInput(e.target.value)}
                    placeholder="Search patient by name or folder ID..."
                    className="pl-9 h-10 text-sm"
                    onFocus={() => setShowPatientResults(true)}
                  />
                </div>

                {showPatientResults && patientQuery.trim().length >= 2 && (
                  <div className="mt-1.5 border border-slate-200 rounded-xl overflow-hidden bg-white/90 backdrop-blur-md shadow-lg">
                    {searchingPatients ? (
                      <div className="px-4 py-3 text-sm text-slate-400">
                        Searching...
                      </div>
                    ) : !patientResults || patientResults.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-400">
                        No patients match your search
                      </div>
                    ) : (
                      patientResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full px-4 py-3 text-left text-sm hover:bg-sky-50 flex items-center justify-between transition-colors"
                          onClick={() => selectPatient(p)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                            <div>
                              <span className="font-medium text-slate-900">
                                {p.firstName} {p.lastName}
                              </span>
                              <span className="block text-[11px] font-mono text-slate-400">
                                {p.patientId}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-slate-500"
                  onClick={handleClose}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}

          {form.currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 60, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              {/* Selected Patient Card */}
              {form.selectedPatient && (
                <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {form.selectedPatient.firstName}{" "}
                        {form.selectedPatient.lastName}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400">
                        {form.selectedPatient.patientId}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        currentStep: 1,
                        selectedPatient: null,
                      }));
                      setSelectedTile(null);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Tile Grid */}
              {!selectedTile && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-1">
                    Select Invoice Source
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Choose the department origin for this invoice
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <TileButton
                      icon={<FolderOpen className="w-6 h-6" />}
                      title="Card/Folder Opening"
                      description="Administrative folder creation fee"
                      color="amber"
                      onClick={() => handleTileSelect("Admin")}
                    />
                    <TileButton
                      icon={<Stethoscope className="w-6 h-6" />}
                      title="Consultation"
                      description="Doctor consultation fee"
                      color="teal"
                      onClick={() => handleTileSelect("Consultation")}
                    />
                    <TileButton
                      icon={<Bed className="w-6 h-6" />}
                      title="Inpatient Admission"
                      description="Admission & bed charges"
                      color="rose"
                      onClick={() => handleTileSelect("Inpatient")}
                    />
                    <TileButton
                      icon={<FileSpreadsheet className="w-6 h-6" />}
                      title="General Billings"
                      description="Custom line items & services"
                      color="indigo"
                      onClick={() => handleTileSelect("General")}
                    />
                  </div>
                </div>
              )}

              {/* Admin Tile Content */}
              {selectedTile === "Admin" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">
                      Card/Folder Opening Fee
                    </h3>
                    <button
                      onClick={() => setSelectedTile(null)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Change source
                    </button>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-medium text-slate-700">
                      Medical Record Folder Creation Fee
                    </p>
                    <div>
                      <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                        Fee Amount ($)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={form.metaData.folderFee || ""}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setForm((prev) => ({
                            ...prev,
                            metaData: { ...prev.metaData, folderFee: val },
                            lineItems: [
                              {
                                code: "ADM-01",
                                name: "Medical Record Folder Creation Fee",
                                type: "Service" as const,
                                date: new Date().toISOString().split("T")[0],
                                price: val,
                                qty: 1,
                                amount: val,
                              },
                            ],
                          }));
                        }}
                        placeholder="0.00"
                        className="h-9 w-48 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Consultation Tile Content */}
              {selectedTile === "Consultation" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">
                      Consultation Details
                    </h3>
                    <button
                      onClick={() => setSelectedTile(null)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Change source
                    </button>
                  </div>
                  <div className="bg-teal-50 rounded-xl p-4 space-y-4">
                    <div>
                      <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                        Select Doctor
                      </Label>
                      <select
                        value={form.metaData.doctorId}
                        onChange={(e) => {
                          const doctor = doctors?.find(
                            (d) => d.id === e.target.value
                          );
                          setForm((prev) => ({
                            ...prev,
                            metaData: {
                              ...prev.metaData,
                              doctorId: e.target.value,
                              doctorName: doctor?.fullName || "",
                            },
                          }));
                        }}
                        className="h-9 text-sm rounded-lg border border-slate-200 bg-white px-3 w-full"
                      >
                        <option value="">Select a doctor...</option>
                        {doctors?.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            Dr. {doc.fullName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                        Consultation Fee ($)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={form.metaData.consultationFee || ""}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setForm((prev) => ({
                            ...prev,
                            metaData: {
                              ...prev.metaData,
                              consultationFee: val,
                            },
                          }));
                        }}
                        placeholder="0.00"
                        className="h-9 w-48 bg-white"
                      />
                    </div>
                    <Button
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={addConsultationLineItem}
                      disabled={
                        !form.metaData.doctorId ||
                        !form.metaData.consultationFee
                      }
                    >
                      <Check className="w-3 h-3" />
                      Apply to Invoice
                    </Button>
                    {form.lineItems.length > 0 && (
                      <div className="bg-white rounded-lg p-3 text-sm">
                        <span className="text-slate-500">Consultation fee: </span>
                        <span className="font-semibold text-slate-900">
                          ₦{form.lineItems[0].price.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Inpatient Tile Content */}
              {selectedTile === "Inpatient" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">
                      Inpatient Admission
                    </h3>
                    <button
                      onClick={() => setSelectedTile(null)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Change source
                    </button>
                  </div>
                  <div className="bg-rose-50 rounded-xl p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                          Admission Days
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          value={form.metaData.admissionDays}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              metaData: {
                                ...prev.metaData,
                                admissionDays: Math.max(
                                  1,
                                  parseInt(e.target.value) || 1
                                ),
                              },
                            }))
                          }
                          className="h-9 bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                          Daily Bed Rate ($)
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={form.metaData.dailyBedRate || ""}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              metaData: {
                                ...prev.metaData,
                                dailyBedRate: Number(e.target.value) || 0,
                              },
                            }))
                          }
                          placeholder="0.00"
                          className="h-9 bg-white"
                        />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={addInpatientLineItem}
                      disabled={!form.metaData.dailyBedRate}
                    >
                      <Check className="w-3 h-3" />
                      Calculate & Apply
                    </Button>
                    {form.lineItems.length > 0 && (
                      <div className="bg-white rounded-lg p-3 space-y-1">
                        <p className="text-sm text-slate-500">
                          {form.metaData.admissionDays} day(s) × ₦
                          {form.metaData.dailyBedRate.toFixed(2)}
                        </p>
                        <p className="text-base font-bold text-slate-900">
                          Total: ₦
                          {(
                            form.metaData.admissionDays *
                            form.metaData.dailyBedRate
                          ).toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* General Tile Content — The Adaptive Ledger */}
              {selectedTile === "General" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">
                      General Billings Ledger
                    </h3>
                    <button
                      onClick={() => setSelectedTile(null)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Change source
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                        <tr>
                          <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider w-14">
                            Code
                          </th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider">
                            Item Name
                          </th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider w-24">
                            Type
                          </th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider w-28">
                            Date
                          </th>
                          <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider w-20">
                            Price ($)
                          </th>
                          <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider w-14">
                            Qty
                          </th>
                          <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider w-20">
                            Amount ($)
                          </th>
                          <th className="px-3 py-2.5 text-center w-8" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <AnimatePresence>
                          {form.lineItems.map((item, idx) => (
                            <motion.tr
                              key={`${item.code}-${idx}`}
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="hover:bg-slate-50/50"
                            >
                              <td className="px-3 py-2">
                                <span className="font-mono text-[11px] text-slate-400">
                                  {item.code}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  value={item.name}
                                  onChange={(e) =>
                                    updateGeneralItem(idx, "name", e.target.value)
                                  }
                                  placeholder="Item name"
                                  className="h-8 text-xs border-0 bg-transparent px-1 focus:bg-white focus:border"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  value={item.type}
                                  onChange={(e) =>
                                    updateGeneralItem(idx, "type", e.target.value)
                                  }
                                  className="h-8 text-xs rounded-lg border border-slate-200 bg-white px-2 w-full"
                                >
                                  <option value="Service">Service</option>
                                  <option value="Product">Product</option>
                                  <option value="Other">Other</option>
                                </select>
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="date"
                                  value={item.date}
                                  onChange={(e) =>
                                    updateGeneralItem(idx, "date", e.target.value)
                                  }
                                  className="h-8 text-xs border-0 bg-transparent px-1 focus:bg-white focus:border"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  value={item.price || ""}
                                  onChange={(e) =>
                                    updateGeneralItem(
                                      idx,
                                      "price",
                                      Number(e.target.value) || 0
                                    )
                                  }
                                  placeholder="0.00"
                                  className="h-8 text-xs text-right border-0 bg-transparent px-1 focus:bg-white focus:border font-mono"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  min={1}
                                  value={item.qty}
                                  onChange={(e) =>
                                    updateGeneralItem(
                                      idx,
                                      "qty",
                                      Math.max(1, parseInt(e.target.value) || 1)
                                    )
                                  }
                                  className="h-8 text-xs text-right border-0 bg-transparent px-1 focus:bg-white focus:border font-mono"
                                />
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-sm font-semibold text-slate-900 tabular-nums">
                                ₦{item.amount.toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {form.lineItems.length > 1 && (
                                  <button
                                    onClick={() => removeGeneralRow(idx)}
                                    className="text-slate-300 hover:text-red-400 transition-colors p-1"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs gap-1 text-sky-600 hover:text-sky-700 hover:bg-sky-50"
                    onClick={addGeneralRow}
                  >
                    <Plus className="w-3 h-3" />
                    Add Item Row
                  </Button>

                  {/* Running Balance */}
                  <div className="bg-indigo-50 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Subtotal</span>
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        ₦{subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">VAT ({(form.taxRate * 100).toFixed(0)}%)</span>
                      <span className="font-mono text-slate-600 tabular-nums">
                        ₦{(subtotal * form.taxRate).toFixed(2)}
                      </span>
                    </div>
                    <Separator className="bg-indigo-200/50" />
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-slate-900">
                        Grand Total
                      </span>
                      <span className="font-mono text-xl font-extrabold text-slate-900 tabular-nums">
                        ₦{grandTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Summary for non-General tiles */}
              {selectedTile && selectedTile !== "General" && form.lineItems.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4 space-y-1">
                  {form.lineItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-600">{item.name}</span>
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        ₦{item.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">Total</span>
                    <span className="font-mono text-lg font-extrabold text-slate-900 tabular-nums">
                      ₦{subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-4 bg-white/80 backdrop-blur-md border-t border-slate-200 rounded-b-2xl flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-slate-500"
                  onClick={handleClose}
                >
                  Cancel
                </Button>

                {createInvoice.error && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-1.5 mx-2 flex-1 text-center">
                    {(createInvoice.error as any)?.message ||
                      "Failed to create invoice"}
                  </p>
                )}

                <Button
                  size="sm"
                  className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5"
                  onClick={handleGenerate}
                  disabled={!canGenerate || createInvoice.isPending}
                >
                  {createInvoice.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  {createInvoice.isPending
                    ? "Generating..."
                    : "Update / Generate Bill"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

interface TileButtonProps {
  icon: ReactNode;
  title: string;
  description: string;
  color: "amber" | "teal" | "rose" | "indigo";
  onClick: () => void;
}

const colorMap = {
  amber: {
    bg: "bg-amber-50 hover:bg-amber-100 border-amber-200",
    icon: "text-amber-600",
    title: "text-amber-900",
    desc: "text-amber-600",
  },
  teal: {
    bg: "bg-teal-50 hover:bg-teal-100 border-teal-200",
    icon: "text-teal-600",
    title: "text-teal-900",
    desc: "text-teal-600",
  },
  rose: {
    bg: "bg-rose-50 hover:bg-rose-100 border-rose-200",
    icon: "text-rose-600",
    title: "text-rose-900",
    desc: "text-rose-600",
  },
  indigo: {
    bg: "bg-indigo-50 hover:bg-indigo-100 border-indigo-200",
    icon: "text-indigo-600",
    title: "text-indigo-900",
    desc: "text-indigo-600",
  },
};

const TileButton = ({ icon, title, description, color, onClick }: TileButtonProps) => {
  const c = colorMap[color];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all ${c.bg}`}
    >
      <div className={`${c.icon}`}>{icon}</div>
      <div>
        <p className={`text-sm font-bold ${c.title}`}>{title}</p>
        <p className={`text-[11px] ${c.desc}`}>{description}</p>
      </div>
    </button>
  );
};

export default NewInvoiceModal;
