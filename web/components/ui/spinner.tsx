import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <div className="flex items-center justify-center">
      <Loader2 className={cn("size-6 animate-spin text-primary-600", className)} />
    </div>
  );
}

export function FullPageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-subtle">
      <Loader2 className="size-8 animate-spin text-primary-600" />
      {label && <p className="text-sm text-text-secondary">{label}</p>}
    </div>
  );
}