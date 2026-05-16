import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import type { LineItem, InvoiceSummary } from "./billingTypes";
import { computeLineItemAmount, MOCK_INVOICES } from "./billingTypes";

export function useInvoices() {
  return useQuery<InvoiceSummary[]>({
    queryKey: ["invoices"],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("invoices")
          .select("*, patient:patients(*), items:invoice_items(*)")
          .order("created_at", { ascending: false });
        if (error) throw error;
        const supabaseInvoices = toCamel(data) as InvoiceSummary[];

        const { data: localData } = await (supabase as any)
          .from("invoices")
          .select("id");
        const hasSupabaseData = Array.isArray(localData) && localData.length > 0;

        const localKey = "icare_billing_local";
        const raw = localStorage.getItem(localKey);
        const localInvoices: InvoiceSummary[] = raw ? JSON.parse(raw) : [];

        if (!hasSupabaseData && supabaseInvoices.length === 0) {
          return [...MOCK_INVOICES, ...localInvoices];
        }

        return [...supabaseInvoices, ...localInvoices];
      } catch {
        const localKey = "icare_billing_local";
        const raw = localStorage.getItem(localKey);
        const localInvoices: InvoiceSummary[] = raw ? JSON.parse(raw) : [];
        return [...MOCK_INVOICES, ...localInvoices];
      }
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
      const local: { id: string; fullName: string }[] = [
        { id: "doc-1", fullName: "Adebayo" },
        { id: "doc-2", fullName: "Okonkwo" },
        { id: "doc-3", fullName: "Nnamdi" },
      ];

      try {
        const { data, error } = await (supabase as any)
          .from("users")
          .select("id, full_name")
          .eq("role", "Doctor")
          .eq("status", "active");
        if (error) return local;
        const results = toCamel(data) as { id: string; fullName: string }[];
        return results.length > 0 ? results : local;
      } catch {
        return local;
      }
    },
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
      taxRate,
      invoiceNumber,
    }: {
      patientId: string;
      patientInfo?: { firstName: string; lastName: string; patientId: string };
      sourceType: string;
      lineItems: LineItem[];
      taxRate: number;
      invoiceNumber: string;
    }) => {
      const subtotal = lineItems.reduce(
        (sum, item) => sum + computeLineItemAmount(item.price, item.qty),
        0
      );
      const taxAmount = subtotal * taxRate;
      const totalAmount = subtotal + taxAmount;

      const supabaseInvoicePayload: Record<string, any> = {
        invoice_number: invoiceNumber,
        patient_id: patientId,
        total_amount: totalAmount,
        amount_paid: 0,
        balance: totalAmount,
        status: "Unpaid",
        source_type: sourceType,
      };

      try {
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
      } catch {
        const localInvoice: InvoiceSummary = {
          id: `local-${Date.now()}`,
          invoiceNumber,
          patientId,
          totalAmount,
          amountPaid: 0,
          balance: totalAmount,
          status: "Unpaid",
          sourceType,
          paymentMethod: null,
          createdBy: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          patient: patientInfo
            ? {
                id: patientId,
                patientId: patientInfo.patientId,
                firstName: patientInfo.firstName,
                lastName: patientInfo.lastName,
              }
            : null,
          items: lineItems
            .filter((item) => item.name.trim() && item.price > 0)
            .map((item) => ({
              id: `local-item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              invoiceId: `local-${Date.now()}`,
              description: item.name,
              quantity: item.qty,
              unitPrice: item.price,
              total: computeLineItemAmount(item.price, item.qty),
            })),
        };

        const localKey = "icare_billing_local";
        const raw = localStorage.getItem(localKey);
        const existing: InvoiceSummary[] = raw ? JSON.parse(raw) : [];
        existing.unshift(localInvoice);
        localStorage.setItem(localKey, JSON.stringify(existing));

        return localInvoice.id;
      }
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
      try {
        const updatePayload: Record<string, any> = { status };

        if (status === "Paid") {
          updatePayload.amount_paid = amountPaid || 0;
          updatePayload.balance = 0;
        }

        const { error } = await (supabase as any)
          .from("invoices")
          .update(updatePayload)
          .eq("id", id);

        if (!error) return;
      } catch {
        const localKey = "icare_billing_local";
        const raw = localStorage.getItem(localKey);
        const existing: InvoiceSummary[] = raw ? JSON.parse(raw) : [];
        const idx = existing.findIndex((inv) => inv.id === id);
        if (idx !== -1) {
          existing[idx].status = status;
          if (status === "Paid") {
            existing[idx].amountPaid = amountPaid ?? existing[idx].balance;
            existing[idx].balance = 0;
          }
          localStorage.setItem(localKey, JSON.stringify(existing));
        }

        const cache = queryClient.getQueryData<InvoiceSummary[]>(["invoices"]);
        if (cache) {
          const updated = cache.map((inv) =>
            inv.id === id
              ? {
                  ...inv,
                  status,
                  amountPaid: status === "Paid" ? (amountPaid ?? inv.balance) : inv.amountPaid,
                  balance: status === "Paid" ? 0 : inv.balance,
                }
              : inv
          );
          queryClient.setQueryData(["invoices"], updated);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}
