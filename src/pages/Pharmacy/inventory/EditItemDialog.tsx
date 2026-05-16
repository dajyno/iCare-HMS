import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/src/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import type { PharmacyInventoryItem } from "../types";

const EditItemDialog = ({
  item,
  open,
  onOpenChange,
}: {
  item: PharmacyInventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const queryClient = useQueryClient();
  const [unitsRemaining, setUnitsRemaining] = useState(0);
  const [reorderLevel, setReorderLevel] = useState(0);
  const [unitPrice, setUnitPrice] = useState(0);

  useEffect(() => {
    if (item) {
      setUnitsRemaining(item.unitsRemaining);
      setReorderLevel(item.reorderLevel);
      setUnitPrice(item.unitPrice);
    }
  }, [item]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!item) return;
      const { error } = await (supabase as any)
        .from("medications")
        .update({
          quantity_in_stock: unitsRemaining,
          reorder_level: reorderLevel,
          unit_price: unitPrice,
        })
        .eq("id", item.id);
      if (error) throw new Error(error.message || "Failed to update item");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-inventory"] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-4 h-4 text-sky-500" />
            {item?.itemName ?? "Edit Item"}
          </DialogTitle>
          <DialogDescription>
            SKU: <span className="font-mono text-[11px]">{item?.sku ?? "—"}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Units Remaining</Label>
            <Input
              type="number"
              min={0}
              value={unitsRemaining}
              onChange={(e) => setUnitsRemaining(parseInt(e.target.value) || 0)}
              className="h-9 text-sm font-mono tabular-nums"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Reorder Level</Label>
            <Input
              type="number"
              min={0}
              value={reorderLevel}
              onChange={(e) => setReorderLevel(parseInt(e.target.value) || 0)}
              className="h-9 text-sm font-mono tabular-nums"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Unit Price (₦)</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={unitPrice}
              onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
              className="h-9 text-sm font-mono tabular-nums"
            />
          </div>

          {updateMutation.error && (
            <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {(updateMutation.error as any)?.message || "Failed to update"}
            </div>
          )}
        </div>

        <DialogFooter className="pt-1">
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm" className="h-9">Cancel</Button>
          </DialogClose>
          <Button
            type="button"
            size="sm"
            className="h-9 bg-sky-600 hover:bg-sky-700 gap-1.5"
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : null}
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditItemDialog;
