import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle } from "lucide-react";

interface UpgradeSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceType: "seats" | "beds";
}

const RESOURCE_MESSAGES: Record<string, { title: string; description: string }> = {
  seats: {
    title: "Seat Limit Reached",
    description:
      "Upgrade your subscription tier in the admin console to add more personnel.",
  },
  beds: {
    title: "Bed Capacity Reached",
    description:
      "Upgrade your subscription tier to add more inpatient beds.",
  },
};

const UpgradeSubscriptionModal: React.FC<UpgradeSubscriptionModalProps> = ({
  open,
  onOpenChange,
  resourceType,
}) => {
  const msg = RESOURCE_MESSAGES[resourceType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <ArrowUpCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <DialogTitle>{msg.title}</DialogTitle>
              <DialogDescription>{msg.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeSubscriptionModal;
