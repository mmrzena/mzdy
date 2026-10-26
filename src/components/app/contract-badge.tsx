import { Badge } from "@/components/ui/badge";
import { CONTRACT_LABEL, type ContractType } from "@/lib/attendance/model";
import { cn } from "@/lib/utils";

/** "HPP" / "DPČ" / "DPP" with the full contract name as a tooltip. */
export function ContractBadge({
  contract,
  className,
}: {
  contract: ContractType;
  className?: string;
}) {
  return (
    <Badge
      variant={contract === "HPP" ? "secondary" : "outline"}
      title={CONTRACT_LABEL[contract].long}
      className={cn(className)}
    >
      {CONTRACT_LABEL[contract].short}
    </Badge>
  );
}
