import { cn } from "@/lib/utils";
import { STATUS_LABEL, type ReqStatus } from "@/lib/types";

const styles: Record<ReqStatus, string> = {
  confirmed: "bg-confirmed-soft text-confirmed",
  proposed: "bg-proposed-soft text-proposed",
  unresolved: "bg-unresolved-soft text-unresolved",
  deferred: "bg-deferred-soft text-deferred",
  excluded: "bg-deferred-soft text-deferred line-through",
};
export function StatusBadge({ status, className }: { status: ReqStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", styles[status], className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}
