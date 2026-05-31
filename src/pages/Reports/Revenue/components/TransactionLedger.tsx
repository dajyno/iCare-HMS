import { motion, AnimatePresence } from "motion/react";
import { TableSkeleton } from "@/src/components/skeletons/TableSkeleton";
import { cn } from "@/lib/utils";
import type { CashierTransaction } from "../types";
import { PAYMENT_METHOD_STYLES, TRANSACTION_STATUS_STYLES } from "../types";

interface TransactionLedgerProps {
  transactions: CashierTransaction[] | undefined;
  loading: boolean;
}

export default function TransactionLedger({ transactions, loading }: TransactionLedgerProps) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Recent Cashier Transactions</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {transactions ? `Showing ${transactions.length} records` : "Live feed"}
          </p>
        </div>
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
          Last 24h
        </span>
      </div>

      {loading ? (
        <TableSkeleton rows={6} columns={5} searchable={false} />
      ) : !transactions || transactions.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400 italic">No transactions recorded yet today.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <caption className="sr-only">Live cashier transaction ledger for the current shift</caption>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th scope="col" className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Patient Info</th>
                <th scope="col" className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Department</th>
                <th scope="col" className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Payment Method</th>
                <th scope="col" className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Amount</th>
                <th scope="col" className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
              </tr>
            </thead>
            <AnimatePresence mode="wait">
              <motion.tbody
                key="transactions"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {transactions.map((txn, idx) => (
                  <tr
                    key={txn.id}
                    className={cn(
                      "border-b border-slate-50 transition-colors hover:bg-slate-50/80",
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                    )}
                  >
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-slate-900 truncate max-w-[180px]">
                          {txn.patientName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 truncate max-w-[180px]">
                          {txn.patientId}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">{txn.department}</td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border",
                          PAYMENT_METHOD_STYLES[txn.paymentMethod]?.badge
                        )}
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full", PAYMENT_METHOD_STYLES[txn.paymentMethod]?.dot)} />
                        {txn.paymentMethod}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-sm text-slate-900 tabular-nums whitespace-nowrap">
                      ₦{txn.amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                          TRANSACTION_STATUS_STYLES[txn.status]
                        )}
                      >
                        {txn.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </motion.tbody>
            </AnimatePresence>
          </table>
        </div>
      )}
    </div>
  );
}
