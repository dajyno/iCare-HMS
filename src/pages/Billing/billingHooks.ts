import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import type { LineItem } from "./billingTypes";
import { computeLineItemAmount } from "./billingTypes";

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  patientId: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: string;
  sourceType: string;
  paymentMethod: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    patientId: string;
    firstName: string;
    lastName: string;
  } | null;
  items: {
    id: string;
    invoiceId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
}

export function useInvoices() {
  return useQuery<InvoiceSummary[]>({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("invoices")
        .select("*, patient:patients(*), items:invoice_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return toCamel(data) as InvoiceSummary[];
    },
  });
}

export function usePatients(query: string) {
  return useQuery({
    queryKey: ["patients", query],
    queryFn: async () => {
      if (!query.trim() || query.trim().length < 2) return [];
      const { data, error } = await (supabase as any)
        .from("patients")
        .select("id, patient_id, first_name, last_name")
        .or(
          `first_name.ilike.%${query}%,last_name.ilike.%${query}%,patient_id.ilike.%${query}%`
        )
        .limit(8);
      if (error) throw error;
      return toCamel(data) as {
        id: string;
        patientId: string;
        firstName: string;
        lastName: string;
      }[];
    },
    enabled: query.trim().length >= 2,
  });
}

export function useDoctors() {
  return useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("users")
        .select("id, full_name")
        .eq("role", "Doctor")
        .eq("status", "active");
      if (error) throw error;
      return toCamel(data) as { id: string; fullName: string }[];
    },
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      patientId,
      sourceType,
      lineItems,
      taxRate,
      createdBy,
      invoiceNumber,
    }: {
      patientId: string;
      sourceType: string;
      lineItems: LineItem[];
      taxRate: number;
      createdBy: string | null;
      invoiceNumber: string;
    }) => {
      const subtotal = lineItems.reduce(
        (sum, item) => sum + computeLineItemAmount(item.price, item.qty),
        0
      );
      const taxAmount = subtotal * taxRate;
      const totalAmount = subtotal + taxAmount;

      const invoicePayload = {
        invoice_number: invoiceNumber,
        patient_id: patientId,
        total_amount: totalAmount,
        amount_paid: 0,
        balance: totalAmount,
        status: "Unpaid",
        source_type: sourceType,
        created_by: createdBy,
      };

      const { data: invoiceData, error: invoiceError } = await (supabase as any)
        .from("invoices")
        .insert(invoicePayload)
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

      if (taxRate > 0) {
        itemsPayload.push({
          invoice_id: invoiceId,
          description: "VAT",
          quantity: 1,
          unit_price: subtotal * taxRate,
          total: subtotal * taxRate,
        });
      }

      const { error: itemsError } = await (supabase as any)
        .from("invoice_items")
        .insert(itemsPayload);

      if (itemsError) throw itemsError;

      return invoiceId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      amountPaid,
    }: {
      id: string;
      status: string;
      amountPaid?: number;
    }) => {
      const updatePayload: any = { status };

      if (status === "Paid") {
        updatePayload.amount_paid = amountPaid || 0;
        updatePayload.balance = 0;
      }

      const { error } = await (supabase as any)
        .from("invoices")
        .update(updatePayload)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}
