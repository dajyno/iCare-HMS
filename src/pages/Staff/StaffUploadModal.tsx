import { useState, useRef } from "react";
import type * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function StaffUploadModal({ open, onClose }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [imported, setImported] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setImported(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setFileName(file.name);
      setImported(false);
    }
  };

  const handleImport = () => {
    if (!fileName) return;
    setImported(true);
    setTimeout(() => {
      onClose();
      setFileName(null);
      setImported(false);
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Import Staff</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to onboard multiple employees at once.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
              dragOver
                ? "border-sky-400 bg-sky-50"
                : "border-slate-300 hover:border-sky-300 hover:bg-sky-50/50"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            {fileName ? (
              <div className="flex flex-col items-center gap-2">
                <FileSpreadsheet className="w-10 h-10 text-sky-600" />
                <p className="text-sm font-medium text-slate-900">{fileName}</p>
                <p className="text-xs text-slate-400">
                  {imported ? "Imported successfully" : "Ready to import"}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-10 h-10 text-slate-300" />
                <p className="text-sm text-slate-600">
                  Drop your file here, or click to browse
                </p>
                <p className="text-xs text-slate-400">
                  Supports .csv, .xlsx, .xls files
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Required Columns
            </p>
            <p className="text-xs text-slate-500">
              First Name, Last Name, Email, Staff ID, Position, Department
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!fileName || imported}
            className={cn(
              "gap-2",
              imported
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-sky-600 hover:bg-sky-700"
            )}
          >
            {imported ? (
              <>
                <Check className="w-4 h-4" />
                Imported
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Import Staff
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
