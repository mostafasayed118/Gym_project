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
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce the query so we don't fire a Convex search per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const results = useQuery(
    api.exerciseDb.search,
    open ? { query: debounced || undefined, limit: 12 } : "skip",
  );

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
          <CommandList>
            {results === undefined && (
              <div className="flex items-center gap-2 py-4 text-center text-xs text-zinc-500">
                <Loader2 className="size-3.5 animate-spin" />
                Searching catalog…
              </div>
            )}
            {results !== undefined && catalogEmpty && (
              <CommandEmpty>
                {debounced.trim().length === 0
                  ? "Catalog is empty — sync it from Mission Control, or type a custom name."
                  : `No matches for "${debounced}". Press Enter to use it as a custom exercise.`}
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
