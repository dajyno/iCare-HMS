import { useState, useRef, useCallback } from "react";
import type * as React from "react";
import { cn } from "@/lib/utils";
import { Upload, File, X } from "lucide-react";

const ACCEPTED_TYPES = [".zip", ".sql", ".db"];

interface FileDropzoneProps {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  className?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileDropzone({ value, onChange, disabled, className }: FileDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = useCallback((file: File): boolean => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_TYPES.includes(ext)) {
      setError(`Unsupported file type "${ext}". Accepted: ${ACCEPTED_TYPES.join(", ")}`);
      return false;
    }
    setError(null);
    return true;
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file && validate(file)) onChange(file);
  }, [disabled, onChange, validate]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleBrowse = () => inputRef.current?.click();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validate(file)) onChange(file);
    e.target.value = "";
  };

  const handleClear = () => {
    onChange(null);
    setError(null);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleBrowse}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors",
          dragOver
            ? "border-blue-400 bg-blue-50/50"
            : value
              ? "border-emerald-300 bg-emerald-50/30"
              : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100/50",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        {value ? (
          <>
            <File className="h-8 w-8 text-emerald-500" />
            <div className="text-center">
              <p className="text-sm font-medium text-slate-800">{value.name}</p>
              <p className="text-xs text-slate-500">{formatSize(value.size)}</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
              className="absolute top-2 right-2 rounded-full p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-slate-400" />
            <div className="text-center">
              <p className="text-sm text-slate-600">
                <span className="font-medium text-blue-600">Click to browse</span> or drag and drop
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Accepted: {ACCEPTED_TYPES.join(", ")}
              </p>
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
          {error}
        </p>
      )}
    </div>
  );
}
