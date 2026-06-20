import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import { logAudit } from "@/src/lib/auditLogger";
import type { LineItem, InvoiceSummary, CatalogItem } from "./billingTypes";
import { computeLineItemAmount, MOCK_MEDICATIONS, MOCK_LAB_TESTS } from "./billingTypes";
import { createIncomeFromPayment } from "../Accounting/hooks";
import { toast } from "sonner";

export function useInvoices() {
  return useQuery<InvoiceSummary[]>({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("invoices")
        .select("*, patient:patients(*), items:invoice_items(*)")
        .order("created_at", { ascending: false });
      if (error) return [];
      return (toCamel(data) as InvoiceSummary[]) || [];
    },
    staleTime: 1000 * 30,
  });
}

export function usePatients(query: string) {
  return useQuery({
    queryKey: ["patients", query],
    queryFn: async () => {
      if (!query.trim() || query.trim().length < 2) return [];

      const lower = query.toLowerCase();
      const local: { id: string; patientId: string; firstName: string; lastName: string }[] = [
        { id: "mock-pt-1", patientId: "MD/0016/23", firstName: "Jerel Kevin", lastName: "Parocha" },
        { id: "mock-pt-2", patientId: "EG/0042/99", firstName: "Charity", lastName: "Enyioko" },
        { id: "mock-pt-3", patientId: "FL/0051/88", firstName: "Amara", lastName: "Okafor" },
        { id: "mock-pt-4", patientId: "AB/0033/77", firstName: "Chuka", lastName: "Okafor" },
        { id: "mock-pt-5", patientId: "CD/0022/11", firstName: "Ibrahim", lastName: "Musa" },
      ].filter(
        (p) =>
          p.firstName.toLowerCase().includes(lower) ||
          p.lastName.toLowerCase().includes(lower) ||
          p.patientId.toLowerCase().includes(lower)
      );

      try {
        const { data, error } = await (supabase as any)
          .from("patients")
          .select("id, patient_id, first_name, last_name")
          .or(
            `first_name.ilike.%${query}%,last_name.ilike.%${query}%,patient_id.ilike.%${query}%`
          )
          .limit(8);
        if (error) return local;
        const supabaseResults = toCamel(data) as {
          id: string;
          patientId: string;
          firstName: string;
          lastName: string;
        }[];
        return supabaseResults.length > 0 ? supabaseResults : local;
      } catch {
        return local;
      }
    },
    enabled: query.trim().length >= 2,
  });
}

export function useDoctors() {
  return useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("staff")
          .select("staff_id, name")
          .eq("is_clinician", true)
          .neq("availability_status", "On Leave");
        if (error) return [];
        const results = toCamel(data) as { staffId: string; name: string }[];
        return results.map((d) => ({ id: d.staffId, fullName: d.name }));
      } catch {
        return [];
      }
    },
  });
}

export function useMedications(query: string) {
  return useQuery({
    queryKey: ["medications", query],
    queryFn: async () => {
      const lower = query.toLowerCase();
      const filtered = MOCK_MEDICATIONS.filter(
        (m) => m.name.toLowerCase().includes(lower)
      );

      try {
        const { data, error } = await (supabase as any)
          .from("medications")
          .select("id, name, price")
          .ilike("name", `%${query}%`)
          .limit(10);
        if (error) return filtered;
        const results = toCamel(data) as CatalogItem[];
        return results.length > 0 ? results : filtered;
      } catch {
        return filtered;
      }
    },
    enabled: query.trim().length >= 1,
  });
}

export function useLabTests(query: string) {
  return useQuery({
    queryKey: ["labTests", query],
    queryFn: async () => {
      const lower = query.toLowerCase();
      const filtered = MOCK_LAB_TESTS.filter(
        (t) => t.name.toLowerCase().includes(lower)
      );

      try {
        const { data, error } = await (supabase as any)
          .from("lab_tests")
          .select("id, name, price")
          .ilike("name", `%${query}%`)
          .limit(10);
        if (error) return filtered;
        const results = toCamel(data) as CatalogItem[];
        return results.length > 0 ? results : filtered;
      } catch {
        return filtered;
      }
    },
    enabled: query.trim().length >= 1,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      patientId,
      patientInfo,
      sourceType,
      lineItems,
      invoiceNumber,
    }: {
      patientId: string;
      patientInfo?: { firstName: string; lastName: string; patientId: string };
      sourceType: string;
      lineItems: LineItem[];
      invoiceNumber: string;
    }) => {
      const totalAmount = lineItems.reduce(
        (sum, item) => sum + computeLineItemAmount(item.price, item.qty),
        0
      );

      const supabaseInvoicePayload: Record<string, any> = {
        invoice_number: invoiceNumber,
        patient_id: patientId,
        total_amount: totalAmount,
        amount_paid: 0,
        balance: totalAmount,
        status: "Unpaid",
        source_type: sourceType,
      };

      const { data: invoiceData, error: invoiceError } = await (supabase as any)
        .from("invoices")
        .insert(supabaseInvoicePayload)
        .select("id")
        .single();
      if (invoiceError) throw invoiceError;

      const invoiceId = invoiceData.id;

      const itemsPayload = lineItems
        .filter((item) => item.name.trim() && item.price > 0)
        .map((item) => ({
          invoice_id: invoiceId,
          description: item.name,
          quantity: item.qty,
          unit_price: item.price,
          total: computeLineItemAmount(item.price, item.qty),
        }));

      const { error: itemsError } = await (supabase as any)
        .from("invoice_items")
        .insert(itemsPayload);

      if (itemsError) throw itemsError;

      return invoiceId;
    },
    onSuccess: (invoiceId) => {
      toast.success("Invoice created successfully");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      logAudit("Generated invoice", "Invoice", invoiceId);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create invoice");
    },
  });
}

async function processPaymentSideEffects(
  invoice: InvoiceSummary,
  queryClient: QueryClient
) {
  const sourceType = invoice.sourceType;
  const patientId = invoice.patientId;

  if (sourceType === "Pharmacy") {
    const prescriptionId = (invoice as any).prescriptionId;
    if (prescriptionId) {
      try {
        await (supabase as any)
          .from("prescriptions")
          .update({ status: "Paid" })
          .eq("id", prescriptionId);
      } catch {
        // Prescriptions not in Supabase, skip
      }
    }
    queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
    queryClient.invalidateQueries({ queryKey: ["pharmacy-prescriptions"] });
  }

  if (sourceType === "Inpatient") {
    try {
      const { data: admissions } = await (supabase as any)
        .from("admissions")
        .select("id, bed_id")
        .eq("patient_id", patientId)
        .eq("status", "Admitted")
        .limit(1)
        .single();

      if (admissions) {
        await (supabase as any)
          .from("admissions")
          .update({ status: "Cleared for Discharge" })
          .eq("id", admissions.id);

        if (admissions.bed_id) {
          await (supabase as any)
            .from("beds")
            .update({ status: "Cleaning" })
            .eq("id", admissions.bed_id);
        }
      }
    } catch {
      // Local fallback — not supported
    }
    queryClient.invalidateQueries({ queryKey: ["admissions"] });
  }

  if (sourceType === "Lab & Radiology") {
    try {
      await (supabase as any)
        .from("lab_requests")
        .update({ payment_status: "Paid" })
        .eq("invoice_id", invoice.id);
    } catch {
      // Local fallback
    }
    queryClient.invalidateQueries({ queryKey: ["lab-requests"] });

    try {
      await (supabase as any)
        .from("radiology_requests")
        .update({ payment_status: "Paid" })
        .eq("invoice_id", invoice.id);
    } catch {
      // Local fallback
    }
    queryClient.invalidateQueries({ queryKey: ["radiology-requests"] });
  }
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    onMutate: async ({ id, amountPaid }) => {
      await queryClient.cancelQueries({ queryKey: ["invoices"] });
      const previousInvoices = queryClient.getQueryData<InvoiceSummary[]>(["invoices"]);

      const currentInvoice = previousInvoices?.find((inv) => inv.id === id);
      if (currentInvoice) {
        const currentPaid = currentInvoice.amountPaid || 0;
        const newAmountPaid = currentPaid + amountPaid;
        const newBalance = Math.max(0, currentInvoice.balance - amountPaid);
        const status = newBalance <= 0 ? "Paid" : amountPaid > 0 ? "PartiallyPaid" : currentInvoice.status;

        queryClient.setQueryData<InvoiceSummary[]>(["invoices"], (old) =>
          old?.map((inv) =>
            inv.id === id
              ? { ...inv, amountPaid: newAmountPaid, balance: newBalance, status }
              : inv
          )
        );
      }

      return { previousInvoices };
    },
    mutationFn: async ({
      id,
      amountPaid,
      paymentMethod,
      bankAccountId,
    }: {
      id: string;
      amountPaid: number;
      paymentMethod: "Cash" | "Card" | "Bank Transfer" | "Insurance Split";
      bankAccountId?: string | null;
    }) => {
      const cache = queryClient.getQueryData<InvoiceSummary[]>(["invoices"]);
      const currentInvoice = cache?.find((inv) => inv.id === id);
      if (!currentInvoice) throw new Error("Invoice not found");

      const currentPaid = currentInvoice.amountPaid || 0;
      const newAmountPaid = currentPaid + amountPaid;
      const newBalance = Math.max(0, currentInvoice.balance - amountPaid);

      const status =
        newBalance <= 0
          ? "Paid"
          : amountPaid > 0
            ? "PartiallyPaid"
            : currentInvoice.status;

      const paidAt = status === "Paid" ? new Date().toISOString() : null;

      const updatePayload: Record<string, any> = {
        amount_paid: newAmountPaid,
        balance: newBalance,
        status,
        payment_method: paymentMethod,
      };
      if (paidAt) updatePayload.paid_at = paidAt;

      const { error } = await (supabase as any)
        .from("invoices")
        .update(updatePayload)
        .eq("id", id);
      if (error) throw error;

      if (amountPaid > 0) {
        const patientName = currentInvoice.patient
          ? `${currentInvoice.patient.firstName} ${currentInvoice.patient.lastName}`
          : undefined;
        await createIncomeFromPayment({
          amount: amountPaid,
          category: currentInvoice.sourceType,
          bankAccountId: bankAccountId ?? null,
          paymentMethod,
          patientId: currentInvoice.patientId,
          patientName,
          invoiceNumber: currentInvoice.invoiceNumber,
        });
      }

      if (status === "Paid") {
        await processPaymentSideEffects(currentInvoice, queryClient);
      }
    },
    onSuccess: () => {
      toast.success("Invoice payment updated successfully");
    },
    onError: (_err, _vars, context) => {
      if (context?.previousInvoices) {
        queryClient.setQueryData(["invoices"], context.previousInvoices);
      }
      toast.error("Failed to update invoice payment");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["accounting"] });
      queryClient.invalidateQueries({ queryKey: ["revenue"] });
    },
  });
}
