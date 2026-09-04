import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Generic page skeleton: title, KPI cards, and a content block. */
export function PageSkeleton({
  cards = 4,
  wide = false,
}: {
  cards?: number;
  wide?: boolean;
}) {
  return (
    <div
      aria-busy="true"
      className={cn("mx-auto grid max-w-6xl gap-4", wide && "max-w-5xl")}
    >
      <div className="grid gap-1">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {cards > 0 && (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {Array.from({ length: cards }).map((_, i) => (
            <Skeleton key={i} className="h-[76px] rounded-xl" />
          ))}
        </div>
      )}
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
