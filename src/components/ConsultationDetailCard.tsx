import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Stethoscope, Thermometer, HeartPulse, Droplets, Scale, Activity,
  Pill, FlaskConical, ChevronDown, ChevronUp, Bone, FileText, ClipboardList,
} from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  VitalsRecorded: { label: "Vitals Recorded", color: "text-amber-600", bg: "bg-amber-50" },
  InProgress: { label: "In Progress", color: "text-blue-600", bg: "bg-blue-50" },
  Completed: { label: "Completed", color: "text-emerald-600", bg: "bg-emerald-50" },
};

const rxStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  Pending: { label: "Pending", color: "text-slate-500", bg: "bg-slate-50" },
  Unpaid: { label: "Unpaid", color: "text-amber-600", bg: "bg-amber-50" },
  Paid: { label: "Paid", color: "text-emerald-600", bg: "bg-emerald-50" },
  Dispensed: { label: "Dispensed", color: "text-blue-600", bg: "bg-blue-50" },
  PartiallyDispensed: { label: "Partially Dispensed", color: "text-blue-600", bg: "bg-blue-50" },
  Cancelled: { label: "Cancelled", color: "text-red-600", bg: "bg-red-50" },
};

interface ConsultationDetailCardProps {
  key?: string | number;
  consultation: any;
  prescriptions?: any[];
  labRequests?: any[];
  radiologyRequests?: any[];
}

export default function ConsultationDetailCard({
  consultation,
  prescriptions = [],
  labRequests = [],
  radiologyRequests = [],
}: ConsultationDetailCardProps) {
  const [expanded, setExpanded] = useState(false);
  const s = statusConfig[consultation.status] || statusConfig.Completed;
  const vs = consultation.vitalSigns || consultation.vital_signs;
  const doctorName = consultation.doctor?.fullName || consultation.doctor?.full_name || consultation._doctor?.fullName || consultation._doctor?.full_name || "Unknown";
  const createdAt = consultation.createdAt || consultation.created_at;

  const rxCount = prescriptions.length;
  const labCount = labRequests.length;
  const radCount = radiologyRequests.length;

  return (
    <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden">
      <CardContent className="p-0">
        {/* Header — always visible */}
        <div className="px-4 py-3 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Stethoscope className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="font-bold text-slate-900 truncate">{consultation.chiefComplaint || "Consultation"}</span>
              <Badge className={`${s.bg} ${s.color} border-0 font-semibold text-[10px]`}>{s.label}</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {createdAt ? new Date(createdAt).toLocaleString() : ""} — Dr. {doctorName}
            </p>

            {consultation.diagnosis && (
              <p className="text-sm text-slate-700 mt-2"><span className="font-semibold">Diagnosis:</span> {consultation.diagnosis}</p>
            )}

            {/* Vital Signs */}
            {vs && (vs.temperature != null || vs.bloodPressure || vs.pulseRate != null) && (
              <div className="flex flex-wrap gap-3 mt-3 text-xs">
                {vs.temperature != null && <span className="text-slate-500"><span className="font-semibold">Temp:</span> {vs.temperature}°C</span>}
                {vs.bloodPressure && <span className="text-slate-500"><span className="font-semibold">BP:</span> {vs.bloodPressure}</span>}
                {vs.pulseRate != null && <span className="text-slate-500"><span className="font-semibold">Pulse:</span> {vs.pulseRate} bpm</span>}
                {vs.oxygenSaturation != null && <span className="text-slate-500"><span className="font-semibold">SpO₂:</span> {vs.oxygenSaturation}%</span>}
                {vs.weight != null && <span className="text-slate-500"><span className="font-semibold">Weight:</span> {vs.weight} kg</span>}
                {vs.respiratoryRate != null && <span className="text-slate-500"><span className="font-semibold">RR:</span> {vs.respiratoryRate} /min</span>}
                {vs.bmi != null && <span className="text-slate-500"><span className="font-semibold">BMI:</span> {vs.bmi}</span>}
              </div>
            )}

            {/* Summary pills */}
            {(rxCount > 0 || labCount > 0 || radCount > 0) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {rxCount > 0 && (
                  <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    {rxCount} prescription{rxCount > 1 ? "s" : ""}
                  </span>
                )}
                {labCount > 0 && (
                  <span className="text-[11px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                    {labCount} lab test{labCount > 1 ? "s" : ""}
                  </span>
                )}
                {radCount > 0 && (
                  <span className="text-[11px] bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                    {radCount} radiology
                  </span>
                )}
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="border-t border-slate-100">
            <div className="p-4 space-y-6">
              {/* Clinical Notes */}
              {consultation.clinicalNotes && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-bold uppercase text-slate-400">Clinical Notes</span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{consultation.clinicalNotes}</p>
                </div>
              )}

              {/* Treatment Plan */}
              {consultation.treatmentPlan && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-bold uppercase text-slate-400">Treatment Plan</span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{consultation.treatmentPlan}</p>
                </div>
              )}

              {/* Prescriptions */}
              {prescriptions.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Pill className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-[10px] font-bold uppercase text-slate-400">Prescriptions</span>
                  </div>
                  <div className="space-y-2">
                    {prescriptions.map((rx: any) => {
                      const items = rx.items || rx.prescriptionItems || [];
                      const rxStatus = rxStatusConfig[rx.status] || rxStatusConfig.Pending;
                      return (
                        <div key={rx.id} className="bg-slate-50 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-600">{items.length} medication(s)</span>
                            <Badge className={`${rxStatus.bg} ${rxStatus.color} border-0 text-[10px]`}>{rxStatus.label}</Badge>
                          </div>
                          {items.map((item: any, i: number) => (
                            <div key={i} className="text-sm grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5">
                              <span className="font-medium text-slate-900">
                                {item.medication?.name || item.medication?.medicationName || "Unknown"}
                                {item.medication?.strength && <span className="text-slate-500 font-normal"> {item.medication.strength}</span>}
                              </span>
                              <span className="text-xs text-slate-500 text-right">
                                Qty: {item.quantity || 1}
                              </span>
                              <span className="text-xs text-slate-600 col-span-2">
                                {item.dosage} · {item.frequency} · {item.duration}
                                {item.instructions && <span className="text-slate-400"> · {item.instructions}</span>}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Lab Requests */}
              {labRequests.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <FlaskConical className="w-3.5 h-3.5 text-purple-500" />
                    <span className="text-[10px] font-bold uppercase text-slate-400">Lab Requests</span>
                  </div>
                  <div className="space-y-2">
                    {labRequests.map((lr: any) => (
                      <div key={lr.id}>
                        <Badge className="bg-purple-50 text-purple-700 border-0 text-[11px] font-medium">
                          {lr.test?.name || lr.testName || "Unknown test"}
                          <span className="text-purple-400 ml-1">· {lr.status || "Requested"}</span>
                        </Badge>
                        {lr.status === "Completed" && lr.results && (
                          <div className="mt-2 ml-2 bg-purple-50/50 rounded-lg p-3 text-sm space-y-1">
                            {lr.results.resultValue && <p><span className="font-semibold">Result:</span> {lr.results.resultValue}{lr.results.unit ? ` ${lr.results.unit}` : ""}</p>}
                            {lr.results.referenceRange && <p className="text-xs text-slate-500"><span className="font-semibold">Ref Range:</span> {lr.results.referenceRange}</p>}
                            {lr.results.interpretation && <p className="text-xs text-slate-600"><span className="font-semibold">Note:</span> {lr.results.interpretation}</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Radiology Requests */}
              {radiologyRequests.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Bone className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-[10px] font-bold uppercase text-slate-400">Radiology Requests</span>
                  </div>
                  <div className="space-y-2">
                    {radiologyRequests.map((rr: any) => (
                      <div key={rr.id}>
                        <Badge className="bg-orange-50 text-orange-700 border-0 text-[11px] font-medium">
                          {rr.exam?.name || rr.examName || "Unknown exam"}
                          <span className="text-orange-400 ml-1">· {rr.status || "Requested"}</span>
                        </Badge>
                        {rr.status === "Completed" && rr.result && (
                          <div className="mt-2 ml-2 bg-orange-50/50 rounded-lg p-3 text-sm space-y-1">
                            {rr.result.findings && <p><span className="font-semibold">Findings:</span> {rr.result.findings}</p>}
                            {rr.result.conclusion && <p className="text-xs text-slate-600"><span className="font-semibold">Conclusion:</span> {rr.result.conclusion}</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state for expanded */}
              {!consultation.clinicalNotes && !consultation.treatmentPlan && prescriptions.length === 0 && labRequests.length === 0 && radiologyRequests.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No additional details recorded</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
