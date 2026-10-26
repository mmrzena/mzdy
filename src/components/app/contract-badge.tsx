import { Badge } from "@/components/ui/badge";
import { CONTRACT_LABEL, type ContractType } from "@/lib/attendance/model";
import { cn } from "@/lib/utils";

/** Same colours as the PDF and the clinic's sheet (theme tokens). */
const CONTRACT_CLASS: Record<ContractType, string> = {
  HPP: "bg-contract-hpp text-contract-hpp-foreground",
  DPC: "bg-contract-dpc text-contract-dpc-foreground",
  DPP: "bg-contract-dpp text-contract-dpp-foreground",
};

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
      title={CONTRACT_LABEL[contract].long}
      className={cn("border-transparent", CONTRACT_CLASS[contract], className)}
    >
      {CONTRACT_LABEL[contract].short}
    </Badge>
  );
}
