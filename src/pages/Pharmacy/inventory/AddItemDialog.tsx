import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2 } from "lucide-react";
import type { SubmitHandler } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useAddInventoryItem } from "../hooks";

const schema = z.object({
  name: z.string().min(1, "Item name is required"),
  sku: z.string().min(1, "SKU is required"),
  packageType: z.string().min(1, "Package type is required"),
  unitOfMeasurement: z.string().min(1, "Unit is required"),
  unitPrice: z.coerce.number().positive("Price must be positive"),
  initialStock: z.coerce.number().int().min(0, "Stock cannot be negative"),
  reorderLevel: z.coerce.number().int().min(0, "Reorder level cannot be negative"),
}) as unknown as z.ZodObject<{
  name: z.ZodString;
  sku: z.ZodString;
  packageType: z.ZodString;
  unitOfMeasurement: z.ZodString;
  unitPrice: z.ZodNumber;
  initialStock: z.ZodNumber;
  reorderLevel: z.ZodNumber;
}>;

type FormData = z.input<typeof schema>;

const AddItemDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const addItem = useAddInventoryItem();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      sku: "",
      packageType: "Bottle",
      unitOfMeasurement: "tablets",
      unitPrice: 0,
      initialStock: 0,
      reorderLevel: 10,
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      await addItem.mutateAsync(data);
      reset();
      onOpenChange(false);
    } catch {
      // error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Inventory Item</DialogTitle>
          <DialogDescription>Add a new medication to the pharmacy stock ledger.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold text-slate-600">Item Name</Label>
              <Input id="name" {...register("name")} placeholder="e.g. Paracetamol" className="h-9 text-sm" />
              {errors.name && <p className="text-[10px] text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sku" className="text-xs font-semibold text-slate-600">SKU</Label>
              <Input id="sku" {...register("sku")} placeholder="e.g. LKDJC-PARA" className="h-9 text-sm font-mono" />
              {errors.sku && <p className="text-[10px] text-red-500">{errors.sku.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="packageType" className="text-xs font-semibold text-slate-600">Package Type</Label>
              <Input id="packageType" {...register("packageType")} placeholder="e.g. Bottle, Box" className="h-9 text-sm" />
              {errors.packageType && <p className="text-[10px] text-red-500">{errors.packageType.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unitOfMeasurement" className="text-xs font-semibold text-slate-600">Unit of Measurement</Label>
              <Input id="unitOfMeasurement" {...register("unitOfMeasurement")} placeholder="e.g. tablets, ml" className="h-9 text-sm" />
              {errors.unitOfMeasurement && <p className="text-[10px] text-red-500">{errors.unitOfMeasurement.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="unitPrice" className="text-xs font-semibold text-slate-600">Unit Price (₦)</Label>
              <Input id="unitPrice" type="number" step="0.01" {...register("unitPrice")} className="h-9 text-sm font-mono tabular-nums" />
              {errors.unitPrice && <p className="text-[10px] text-red-500">{errors.unitPrice.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="initialStock" className="text-xs font-semibold text-slate-600">Initial Stock</Label>
              <Input id="initialStock" type="number" {...register("initialStock")} className="h-9 text-sm font-mono tabular-nums" />
              {errors.initialStock && <p className="text-[10px] text-red-500">{errors.initialStock.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reorderLevel" className="text-xs font-semibold text-slate-600">Reorder Level</Label>
              <Input id="reorderLevel" type="number" {...register("reorderLevel")} className="h-9 text-sm font-mono tabular-nums" />
              {errors.reorderLevel && <p className="text-[10px] text-red-500">{errors.reorderLevel.message}</p>}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm" className="h-9">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting} size="sm" className="h-9 bg-sky-600 hover:bg-sky-700 gap-1.5">
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              {isSubmitting ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddItemDialog;
