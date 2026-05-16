import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import type {
  PharmacyPrescription,
  PharmacyPrescriptionItem,
  PharmacyInventoryItem,
  InvoiceLineItem,
  AnalyticsData,
  OrderStatus,
  StockStatus,
} from "./types";

function getOrderStatus(dbStatus: string): OrderStatus {
  if (dbStatus === "Dispensed") return "All Completed";
  if (dbStatus === "PartiallyDispensed") return "Partially Completed";
  return "New Orders";
}

function makeSku(med: any): string {
  const prefix = (med.name ?? "GEN").replace(/\s+/g, "").slice(0, 4).toUpperCase();
  const suffix = (med.id ?? "0000").replace(/-/g, "").slice(0, 6).toUpperCase();
  return `LKDJC${prefix}${suffix}`;
}

function toPharmacyPrescription(row: any): PharmacyPrescription {
  const p = row.patient ?? {};
  return {
    id: row.id,
    patientId: row.patientId ?? row.patient_id,
    patientCode: p.patientId ?? p.patient_id ?? "N/A",
    patientName: `${p.firstName ?? p.first_name ?? ""} ${p.lastName ?? p.last_name ?? ""}`.trim(),
    patientDob: p.dateOfBirth ?? p.date_of_birth ?? "",
    prescriptionDate: row.date ?? row.created_at ?? "",
    prescribedBy: `Dr. ${row.doctorId ?? row.doctor_id ?? "Unknown"}`,
    orderStatus: getOrderStatus(row.status),
    items: (row.items ?? []).map((item: any) => {
      const med = item.medication ?? {};
      return {
        id: item.id,
        medicationId: med.id ?? "",
        sku: med.sku ?? makeSku(med),
        itemName: med.name ?? "Unknown",
        strength: med.strength ?? "",
        packageType: med.dosageForm ?? med.dosage_form ?? "Tablet",
        unitOfMeasurement: med.dosageForm ?? med.dosage_form ?? "tablets",
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        route: item.route ?? "Oral",
        qtyPrescribed: item.qtyPrescribed ?? item.quantity ?? 1,
        qtyDispensed: 0,
        unitPrice: med.unitPrice ?? med.unit_price ?? 0,
      };
    }),
  };
}

export function usePrescriptionQueue() {
  return useQuery({
    queryKey: ["pharmacy-prescriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("*, patient:patients(*), items:prescription_items(*, medication:medications(*))")
        .order("date", { ascending: false });
      if (error) { console.error("Prescription query error:", error); throw error; }
      const camel = toCamel(data) as any[];
      return (camel ?? []).map(toPharmacyPrescription) as PharmacyPrescription[];
    },
  });
}

export function usePharmacyInventory() {
  return useQuery({
    queryKey: ["pharmacy-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medications")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      const camel = toCamel(data) as any[];
      return (camel ?? []).map((med: any): PharmacyInventoryItem => {
        const remaining = med.quantityInStock ?? med.quantity_in_stock ?? 0;
        const reorder = med.reorderLevel ?? med.reorder_level ?? 10;
        let status: StockStatus = "In Stock";
        if (remaining <= 0) status = "Out of Stock";
        else if (remaining <= reorder) status = "Low Stock";
        return {
          id: med.id,
          sku: makeSku(med),
          itemName: med.name ?? "Unknown",
          packageType: med.dosageForm ?? med.dosage_form ?? "Bottle",
          unitOfMeasurement: med.dosageForm ?? med.dosage_form ?? "tablets",
          unitsRemaining: remaining,
          reorderLevel: reorder,
          unitPrice: med.unitPrice ?? med.unit_price ?? 0,
          status,
        };
      });
    },
  });
}

export function useDispense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (prescription: PharmacyPrescription) => {
      const dispensedItems = prescription.items.filter((i) => i.qtyDispensed > 0);
      if (dispensedItems.length === 0) throw new Error("No items selected for dispensing");

      const isPartial = dispensedItems.length < prescription.items.length;
      const newStatus = isPartial ? "PartiallyDispensed" : "Dispensed";

      for (const item of dispensedItems) {
        if (!item.medicationId) continue;
        const { error: rpcError } = await (supabase.rpc as any)("decrement_stock", {
          med_id: item.medicationId,
          qty: item.qtyDispensed,
        });
        if (rpcError) throw rpcError;
      }

      const { error: presError } = await (supabase as any)
        .from("prescriptions")
        .update({ status: newStatus })
        .eq("id", prescription.id);
      if (presError) throw presError;

      const invNumber = `INV-PHARM-${Date.now().toString(36).toUpperCase()}`;
      const subtotal = Number(dispensedItems.reduce((s, i) => s + i.qtyDispensed * i.unitPrice, 0).toFixed(2));
      const tax = Number((subtotal * 0.075).toFixed(2));
      const total = Number((subtotal + tax).toFixed(2));

      const invItems = dispensedItems.map((i) => ({
        description: `${i.itemName} ${i.strength} x${i.qtyDispensed}`,
        quantity: i.qtyDispensed,
        unit_price: i.unitPrice,
        total: Number((i.qtyDispensed * i.unitPrice).toFixed(2)),
      }));

      const { data: invId, error: invError } = await (supabase.rpc as any)("create_pharmacy_invoice", {
        p_invoice_number: invNumber,
        p_patient_id: prescription.patientId,
        p_total_amount: total,
        p_items: JSON.stringify(invItems),
      });
      if (invError) throw new Error(invError.message || "Failed to create invoice");
      if (!invId) throw new Error("Failed to create invoice");

      return {
        prescriptionId: prescription.id,
        invoiceId: invId,
        invoiceNumber: invNumber,
        totalCost: total,
        tax,
        subtotal,
        items: invItems.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unit_price,
          total: i.total,
        })),
        isPartial,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-prescriptions"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-invoices"] });
    },
  });
}

export function useAddInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: {
      name: string;
      sku: string;
      packageType: string;
      unitOfMeasurement: string;
      unitPrice: number;
      initialStock: number;
      reorderLevel: number;
    }) => {
      const { data, error } = await (supabase.rpc as any)("insert_medication", {
        p_name: item.name,
        p_dosage_form: item.packageType,
        p_unit_price: item.unitPrice,
        p_quantity_in_stock: item.initialStock,
        p_reorder_level: item.reorderLevel,
      });
      if (error) throw new Error(error.message || "Failed to add item");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-inventory"] });
    },
  });
}

export function useBulkAddInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (items: Array<{
      name: string;
      dosage_form: string;
      unit_price: number;
      quantity_in_stock: number;
      reorder_level: number;
    }>) => {
      const { data, error } = await (supabase.rpc as any)("bulk_insert_medications", {
        p_items: JSON.stringify(items),
      });
      if (error) throw new Error(error.message || "Failed to bulk add items");
      return data ?? items.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-inventory"] });
    },
  });
}

export function usePharmacyInvoices() {
  return useQuery({
    queryKey: ["pharmacy-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, patient:patients(*)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return toCamel(data) as any[];
    },
  });
}

export function useAnalyticsData(): AnalyticsData {
  return {
    totalRevenue: 284750.00,
    totalPrescriptions: 1248,
    avgOrderValue: 228.17,
    revenueByMonth: [
      { month: "Jan", revenue: 18500, prescriptions: 89 },
      { month: "Feb", revenue: 22300, prescriptions: 102 },
      { month: "Mar", revenue: 19800, prescriptions: 95 },
      { month: "Apr", revenue: 26100, prescriptions: 118 },
      { month: "May", revenue: 24200, prescriptions: 111 },
      { month: "Jun", revenue: 28900, prescriptions: 134 },
      { month: "Jul", revenue: 32100, prescriptions: 147 },
      { month: "Aug", revenue: 27500, prescriptions: 128 },
      { month: "Sep", revenue: 29400, prescriptions: 136 },
      { month: "Oct", revenue: 31200, prescriptions: 142 },
      { month: "Nov", revenue: 28450, prescriptions: 130 },
      { month: "Dec", revenue: 34100, prescriptions: 156 },
    ],
    topDrugs: [
      { name: "Paracetamol 500mg", count: 312, revenue: 15600 },
      { name: "Amoxicillin 250mg", count: 245, revenue: 29400 },
      { name: "Salbutamol Inhaler", count: 187, revenue: 42075 },
      { name: "Metformin 500mg", count: 156, revenue: 3900 },
      { name: "Amlodipine 5mg", count: 134, revenue: 6700 },
    ],
  };
}
