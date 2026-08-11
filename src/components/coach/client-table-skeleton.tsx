import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ROW_COUNT = 5;

export function ClientTableSkeleton() {
  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800/60 hover:bg-transparent">
            <TableHead className="font-semibold text-muted-foreground">
              Client
            </TableHead>
            <TableHead className="font-semibold text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="font-semibold text-muted-foreground">
              Active Plan
            </TableHead>
            <TableHead className="font-semibold text-muted-foreground">
              Last Workout
            </TableHead>
            <TableHead className="font-semibold text-muted-foreground">
              Engagement
            </TableHead>
            <TableHead className="text-right font-semibold text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: ROW_COUNT }).map((_, i) => (
            <TableRow key={i} className="border-zinc-800/40">
              <TableCell>
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 shrink-0 rounded-full bg-zinc-800/60" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28 bg-zinc-800/60" />
                    <Skeleton className="h-3 w-36 bg-zinc-800/40" />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-20 rounded-full bg-zinc-800/60" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-24 rounded-full bg-zinc-800/60" />
              </TableCell>
              <TableCell>
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-16 bg-zinc-800/60" />
                  <Skeleton className="h-3 w-12 bg-zinc-800/40" />
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-1.5 w-16 rounded-full bg-zinc-800/60" />
                  <Skeleton className="h-3 w-8 bg-zinc-800/40" />
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Skeleton className="size-7 rounded-md bg-zinc-800/60" />
                  <Skeleton className="size-7 rounded-md bg-zinc-800/60" />
                  <Skeleton className="size-7 rounded-md bg-zinc-800/60" />
                  <Skeleton className="size-7 rounded-md bg-zinc-800/60" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
