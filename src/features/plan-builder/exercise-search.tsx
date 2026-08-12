"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { ChevronsUpDown, Dumbbell, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface ExerciseSearchProps {
  /** Current exercise name bound to the form field. */
  value: string;
  /** Fired when the user picks a catalog exercise or commits custom text. */
  onSelect: (exercise: { name: string; exerciseDbId?: string }) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Searchable exercise picker backed by the synced ExerciseDB catalog
 * (`exerciseDb.search`). Keyboard-navigable via cmdk.
 *
 * Free-text fallback: typing a name that matches nothing and pressing Enter
 * (or clicking outside) commits the typed text as a custom exercise — plan
 * building keeps working even before the catalog has been synced.
 */
export function ExerciseSearch({
  value,
  onSelect,
  placeholder = "Exercise name",
  className,
}: ExerciseSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [bodyPartFilter, setBodyPartFilter] = useState<string | null>(null);
  const [equipmentFilter, setEquipmentFilter] = useState<string | null>(null);
  const [targetFilter, setTargetFilter] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce the query so we don't fire a Convex search per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const results = useQuery(
    api.exerciseDb.search,
    open
      ? {
          query: debounced || undefined,
          bodyPart: bodyPartFilter || undefined,
          equipment: equipmentFilter || undefined,
          target: targetFilter || undefined,
          limit: 12,
        }
      : "skip",
  );

  // Distinct body parts / equipment / target muscles for the filter chips.
  // Only fetched while the picker is open — these scan the catalog, so we
  // don't want them running for every ExerciseRow on the page.
  const bodyParts = useQuery(api.exerciseDb.listBodyParts, open ? {} : "skip");
  const equipmentList = useQuery(api.exerciseDb.listEquipment, open ? {} : "skip");
  const targets = useQuery(api.exerciseDb.listTargets, open ? {} : "skip");

  // Close when clicking outside the widget.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const catalogEmpty = results !== undefined && results.length === 0;

  function commit(name: string, exerciseDbId?: string) {
    onSelect({ name, exerciseDbId });
    setOpen(false);
    setQuery("");
    setDebounced("");
    setBodyPartFilter(null);
    setEquipmentFilter(null);
    setTargetFilter(null);
  }

  // Enter with no highlighted/selected item commits free text.
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && query.trim().length > 0) {
      e.preventDefault();
      e.stopPropagation();
      commit(query.trim());
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setOpen(true);
          }}
          className="flex h-10 w-full items-center gap-2 rounded-lg border border-transparent px-2 text-sm font-medium text-zinc-200 placeholder:text-zinc-600 transition-colors hover:bg-zinc-900/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700"
        >
          <Dumbbell className="size-3.5 shrink-0 text-zinc-600" />
          <span className={cn("truncate", !value && "text-zinc-600")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-auto size-3.5 shrink-0 text-zinc-600" />
        </button>
      ) : (
        <Command
          className="rounded-xl border border-zinc-700/60 bg-zinc-900/60 shadow-xl"
          shouldFilter={false}
        >
          <CommandInput
            autoFocus
            value={query}
            onValueChange={(v) => {
              setQuery(v);
              setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="h-10"
          />
          <FilterChips
            bodyParts={bodyParts ?? []}
            equipmentList={equipmentList ?? []}
            targets={targets ?? []}
            bodyPartFilter={bodyPartFilter}
            equipmentFilter={equipmentFilter}
            targetFilter={targetFilter}
            onToggleBodyPart={(v) =>
              setBodyPartFilter((cur) => (cur === v ? null : v))
            }
            onToggleEquipment={(v) =>
              setEquipmentFilter((cur) => (cur === v ? null : v))
            }
            onToggleTarget={(v) =>
              setTargetFilter((cur) => (cur === v ? null : v))
            }
          />
          <CommandList>
            {results === undefined && (
              <div className="flex items-center gap-2 py-4 text-center text-xs text-zinc-500">
                <Loader2 className="size-3.5 animate-spin" />
                Searching catalog…
              </div>
            )}
            {results !== undefined && catalogEmpty && (
              <CommandEmpty>
                {debounced.trim().length > 0
                  ? `No matches for "${debounced}". Press Enter to use it as a custom exercise.`
                  : bodyPartFilter || equipmentFilter || targetFilter
                    ? "No exercises match this filter — clear a chip or type a custom name."
                    : "Catalog is empty — sync it from Mission Control, or type a custom name."}
              </CommandEmpty>
            )}
            {results && results.length > 0 && (
              <CommandGroup heading="ExerciseDB">
                {results.map((ex) => (
                  <CommandItem
                    key={ex._id}
                    value={ex.name}
                    onSelect={() => commit(ex.name, ex.exerciseDbId)}
                    className="flex items-center gap-2 py-2"
                  >
                    <Dumbbell className="size-3.5 shrink-0 text-zinc-600" />
                    <span className="min-w-0 flex-1 truncate">{ex.name}</span>
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-zinc-500">
                      {ex.bodyPart} · {ex.equipment}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {results !== undefined && !catalogEmpty && query.trim() && (
              <CommandItem
                value={`__custom__${query.trim()}`}
                onSelect={() => commit(query.trim())}
                className="flex items-center gap-2 py-2"
              >
                <Search className="size-3.5 shrink-0 text-zinc-600" />
                <span className="min-w-0 flex-1 truncate">
                  Use &quot;{query.trim()}&quot; as custom name
                </span>
              </CommandItem>
            )}
          </CommandList>
        </Command>
      )}
    </div>
  );
}

// ─── Filter chips ───────────────────────────────────────────────────

interface FilterChipsProps {
  bodyParts: string[];
  equipmentList: string[];
  targets: string[];
  bodyPartFilter: string | null;
  equipmentFilter: string | null;
  targetFilter: string | null;
  onToggleBodyPart: (value: string) => void;
  onToggleEquipment: (value: string) => void;
  onToggleTarget: (value: string) => void;
}

/**
 * Horizontal chip rows for browsing the catalog by muscle group / equipment /
 * primary target muscle. Toggling a chip filters `exerciseDb.search` results;
 * clicking it again clears the filter. Chips render as soon as the distinct
 * lists load — until then the rows stay out of the way (no layout jump).
 */
function FilterChips({
  bodyParts,
  equipmentList,
  targets,
  bodyPartFilter,
  equipmentFilter,
  targetFilter,
  onToggleBodyPart,
  onToggleEquipment,
  onToggleTarget,
}: FilterChipsProps) {
  if (bodyParts.length === 0 && equipmentList.length === 0 && targets.length === 0)
    return null;

  const row = (label: string, values: string[], active: string | null, onToggle: (v: string) => void) =>
    values.length > 0 ? (
      <div className="flex items-center gap-1.5 border-b border-zinc-800/60 px-3 py-2">
        <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider text-zinc-600">
          {label}
        </span>
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {values.map((v) => {
            const isActive = active === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => onToggle(v)}
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize transition-colors",
                  isActive
                    ? "border-[oklch(0.85_0.2_145)/0.5] bg-[oklch(0.85_0.2_145)/0.15] text-[oklch(0.85_0.2_145)]"
                    : "border-zinc-800/60 bg-zinc-950/40 text-zinc-500 hover:border-zinc-700/60 hover:text-zinc-300",
                )}
              >
                {v}
              </button>
            );
          })}
        </div>
      </div>
    ) : null;

  return (
    <>
      {row("Body", bodyParts, bodyPartFilter, onToggleBodyPart)}
      {row("Muscle", targets, targetFilter, onToggleTarget)}
      {row("Gear", equipmentList, equipmentFilter, onToggleEquipment)}
    </>
  );
}
