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
    patientId: p.id ?? row.patientId ?? row.patient_id,
    patientCode: p.patientId ?? p.patient_id ?? "N/A",
    patientName: `${p.firstName ?? p.first_name ?? ""} ${p.lastName ?? p.last_name ?? ""}`.trim(),
    patientDob: p.dateOfBirth ?? p.date_of_birth ?? "",
    prescriptionDate: row.date ?? row.created_at ?? "",
    prescribedBy: (row.doctorName) ? `Dr. ${row.doctorName}` : `Doctor #${(row.doctorId ?? row.doctor_id ?? "?").slice(0, 6)}`,
    orderStatus: getOrderStatus(row.status),
    items: (row.items ?? []).map((item: any) => {
      const med = item.medication ?? {};
      return {
        id: item.id,
        medicationId: med.id ?? item.medicationId ?? item.medication_id ?? "",
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
      console.log("PHARMACY: Fetching prescriptions...");
      const { data, error } = await supabase
        .from("prescriptions")
        .select("*, patient:patients(*)")
        .order("date", { ascending: false });
      if (error) { console.error("PHARMACY query error:", error); throw error; }
      if (!data || !Array.isArray(data)) { console.log("PHARMACY: no data"); return []; }
      const rows = data as any[];
      console.log("PHARMACY: got", rows.length, "prescriptions");

      const rxIds = rows.map((r: any) => r.id);
      console.log("PHARMACY: fetching items for", rxIds.length, "prescriptions");
      const { data: allItems, error: itemsErr } = await supabase
        .from("prescription_items")
        .select("*")
        .in("prescription_id", rxIds);
      if (itemsErr) console.error("PHARMACY items error:", itemsErr);
      console.log("PHARMACY: got", (allItems as any[] ?? []).length, "items total");

      const itemsByRxId: Record<string, any[]> = {};
      for (const item of (allItems as any[] ?? [])) {
        const pid = item.prescription_id;
        if (!itemsByRxId[pid]) itemsByRxId[pid] = [];
        itemsByRxId[pid].push(item);
      }
      console.log("PHARMACY: prescriptions with items:", Object.keys(itemsByRxId).length);

      const medIds = new Set<string>();
      for (const item of (allItems as any[] ?? [])) {
        if (item.medication_id) medIds.add(item.medication_id);
      }
      const medMap: Record<string, any> = {};
      if (medIds.size > 0) {
        const { data: meds } = await supabase
          .from("medications")
          .select("*")
          .in("id", [...medIds]);
        if (meds) {
          for (const m of meds as any[]) medMap[m.id] = m;
        }
      }
      console.log("PHARMACY: medications fetched:", Object.keys(medMap).length);

      const enriched = rows.map((rx: any) => ({
        ...rx,
        items: (itemsByRxId[rx.id] ?? []).map((item: any) => ({
          ...item,
          medication: medMap[item.medication_id] ?? null,
        })),
      }));

      const camel = toCamel(enriched) as any[];
      const result = (camel ?? []).map(toPharmacyPrescription) as PharmacyPrescription[];
      console.log("PHARMACY: final count with items > 0:", result.filter((r: any) => r.items.length > 0).length);
      return result;
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
        const { data: med, error: readError } = await (supabase as any)
          .from("medications")
          .select("quantity_in_stock")
          .eq("id", item.medicationId)
          .single();
        if (readError) throw new Error(`Failed to read stock for ${item.itemName}: ${readError.message}`);
        const current = med?.quantity_in_stock ?? 0;
        const next = Math.max(current - item.qtyDispensed, 0);
        const { error: updateError } = await (supabase as any)
          .from("medications")
          .update({ quantity_in_stock: next })
          .eq("id", item.medicationId);
        if (updateError) throw new Error(`Failed to update stock for ${item.itemName}: ${updateError.message}`);
      }

      const { error: presError } = await (supabase as any)
        .from("prescriptions")
        .update({ status: newStatus })
        .eq("id", prescription.id);
      if (presError) throw new Error(presError.message || "Failed to update prescription status");

      const invNumber = `INV-PHARM-${Date.now().toString(36).toUpperCase()}`;
      const subtotal = Number(dispensedItems.reduce((s, i) => s + i.qtyDispensed * i.unitPrice, 0).toFixed(2));
      const tax = 0;
      const total = subtotal;

      const invItems = dispensedItems.map((i) => ({
        description: `${i.itemName} ${i.strength} x${i.qtyDispensed}`,
        quantity: i.qtyDispensed,
        unit_price: i.unitPrice,
        total: Number((i.qtyDispensed * i.unitPrice).toFixed(2)),
      }));

      const { error: invError } = await (supabase as any)
        .from("invoices")
        .insert({
          invoice_number: invNumber,
          patient_id: prescription.patientId,
          total_amount: total,
          amount_paid: 0,
          balance: total,
          status: "Unpaid",
        });
      if (invError) throw new Error(invError.message || "Failed to create invoice");

      const { data: invRows } = await (supabase as any)
        .from("invoices")
        .select("id")
        .eq("invoice_number", invNumber)
        .single();
      const invId = invRows?.id;
      if (!invId) throw new Error("Failed to retrieve invoice after creation");

      const { error: itemsError } = await (supabase as any).from("invoice_items").insert(
        invItems.map((li) => ({
          invoice_id: invId,
          description: li.description,
          quantity: li.quantity,
          unit_price: li.unit_price,
          total: li.total,
        }))
      );
      if (itemsError) throw new Error(itemsError.message || "Failed to create invoice items");

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
      const { error } = await (supabase as any).from("medications").insert({
        name: item.name,
        dosage_form: item.packageType,
        unit_price: item.unitPrice,
        quantity_in_stock: item.initialStock,
        reorder_level: item.reorderLevel,
        status: "available",
      });
      if (error) throw new Error(error.message || "Failed to add item");
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
      const { error } = await (supabase as any).from("medications").insert(items);
      if (error) throw new Error(error.message || "Failed to bulk add items");
      return items.length;
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
