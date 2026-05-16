import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Upload, FileSpreadsheet, CheckCircle2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { useBulkAddInventory } from "../hooks";

const UploadCsvDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<{ count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bulkAdd = useBulkAddInventory();

  const reset = useCallback(() => {
    setFile(null);
    setProgress(0);
    setParsing(false);
    setResult(null);
    setError(null);
    setDragOver(false);
  }, []);

  const parseCSV = (text: string) => {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row");

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const nameIdx = headers.findIndex((h) => h === "name" || h === "item_name");
    const packageIdx = headers.findIndex((h) => h.includes("package") || h === "dosage_form");
    const priceIdx = headers.findIndex((h) => h.includes("price") || h === "unit_price");
    const stockIdx = headers.findIndex((h) => h.includes("stock") || h === "quantity_in_stock");
    const reorderIdx = headers.findIndex((h) => h.includes("reorder") || h === "reorder_level");

    if (nameIdx === -1) throw new Error("CSV must have a 'name' column");

    return lines.slice(1).map((line) => {
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      return {
        name: cols[nameIdx] || "",
        dosage_form: packageIdx >= 0 ? cols[packageIdx] || "Tablet" : "Tablet",
        unit_price: priceIdx >= 0 ? parseFloat(cols[priceIdx]) || 0 : 0,
        quantity_in_stock: stockIdx >= 0 ? parseInt(cols[stockIdx]) || 0 : 0,
        reorder_level: reorderIdx >= 0 ? parseInt(cols[reorderIdx]) || 10 : 10,
      };
    }).filter((item) => item.name);
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setError(null);

    const f = e.dataTransfer.files[0];
    if (!f) return;
    if (!f.name.endsWith(".csv") && !f.name.endsWith(".xlsx") && !f.name.endsWith(".xls")) {
      setError("Please upload a CSV or Excel file");
      return;
    }

    setFile(f);
    setParsing(true);

    const text = await f.text();
    try {
      const items = parseCSV(text);
      if (items.length === 0) throw new Error("No valid items found in CSV");

      // Simulate liquid fill progress
      const duration = Math.min(items.length * 30, 2000);
      const startTime = Date.now();
      return new Promise<void>((resolve) => {
        const tick = () => {
          const elapsed = Date.now() - startTime;
          const pct = Math.min(elapsed / duration, 1);
          setProgress(pct);
          if (pct < 1) {
            requestAnimationFrame(tick);
          } else {
            resolve();
          }
        };
        requestAnimationFrame(tick);
      }).then(async () => {
        await bulkAdd.mutateAsync(items);
        setResult({ count: items.length });
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setParsing(false);
    }
  }, [bulkAdd]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Inventory</DialogTitle>
          <DialogDescription>Drop a CSV or Excel file to bulk-add inventory items.</DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 py-6"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-slate-900">
                {result.count} item{result.count !== 1 ? "s" : ""} added successfully
              </p>
              <Button size="sm" className="h-9 mt-2" onClick={handleClose}>
                Done
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                  dragOver
                    ? "border-sky-400 bg-sky-50/50"
                    : file
                    ? "border-emerald-300 bg-emerald-50/30"
                    : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
                }`}
              >
                {file ? (
                  <div className="flex flex-col items-center gap-3">
                    <FileSpreadsheet className="w-8 h-8 text-emerald-500" />
                    <p className="text-sm font-medium text-slate-700">{file.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>

                    {/* Liquid fill progress bar */}
                    <div className="w-full max-w-xs h-2.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400"
                        initial={{ width: "0%" }}
                        animate={{ width: `${Math.min(progress * 100, 100)}%` }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      />
                    </div>

                    {parsing && (
                      <p className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Processing...
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-slate-300" />
                    <p className="text-sm text-slate-500">
                      Drag & drop your file here, or{" "}
                      <label className="text-sky-600 font-semibold cursor-pointer hover:text-sky-700">
                        browse
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          className="hidden"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              setFile(f);
                              setParsing(true);
                              const text = await f.text();
                              try {
                                const items = parseCSV(text);
                                if (items.length === 0) throw new Error("No valid items found");
                                const duration = Math.min(items.length * 30, 2000);
                                const startTime = Date.now();
                                await new Promise<void>((resolve) => {
                                  const tick = () => {
                                    const elapsed = Date.now() - startTime;
                                    const pct = Math.min(elapsed / duration, 1);
                                    setProgress(pct);
                                    if (pct < 1) requestAnimationFrame(tick);
                                    else resolve();
                                  };
                                  requestAnimationFrame(tick);
                                });
                                await bulkAdd.mutateAsync(items);
                                setResult({ count: items.length });
                              } catch (err: any) {
                                setError(err.message);
                              } finally {
                                setParsing(false);
                              }
                            }
                          }}
                        />
                      </label>
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Supported: .csv, .xlsx, .xls
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2"
                >
                  <X className="w-3 h-3 shrink-0" />
                  {error}
                </motion.div>
              )}

              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Expected CSV Format</p>
                <code className="text-[10px] text-slate-500 font-mono">
                  name,package_type,unit_price,quantity_in_stock,reorder_level
                </code>
                <p className="text-[10px] text-slate-400 mt-1">
                  Only the <strong>name</strong> column is required. Other columns are optional.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default UploadCsvDialog;
