"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles, Star, X, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { LeadCardData } from "@/lib/capella-data-api";

type Stage = "new" | "outreach" | "in-call" | "closed";
type Urgency = "high" | "medium" | "low";

type Task = {
  label: string;
  done: boolean;
};

type DragItem = {
  id: string;
  stage: Stage;
};

const STAGES: Array<{
  key: Stage;
  label: string;
  bar: string;
}> = [
  { key: "new", label: "New", bar: "bg-sky-400" },
  {
    key: "outreach",
    label: "Outreach",
    bar: "bg-amber-400",
  },
  {
    key: "in-call",
    label: "In call",
    bar: "bg-violet-400",
  },
  {
    key: "closed",
    label: "Closed",
    bar: "bg-emerald-400",
  },
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 0,
  }).format(value);
}

function urgencyStyles(urgency: Urgency) {
  if (urgency === "high") return "bg-rose-50 text-rose-700 border-rose-200";
  if (urgency === "medium") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (score >= 60) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-slate-600 bg-slate-50 border-slate-200";
}

function LeadCard({
  lead,
  onOpen,
  onToggleStar,
  onMove,
}: {
  lead: LeadCardData;
  onOpen: (id: string) => void;
  onToggleStar: (id: string) => void;
  onMove: (id: string, stage: Stage) => void;
}) {
  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: "lead-card",
      item: { id: lead.id, stage: lead.stage } satisfies DragItem,
      end: (item, monitor) => {
        const dropResult = monitor.getDropResult<{ stage?: Stage }>();
        if (item && dropResult?.stage && dropResult.stage !== item.stage) {
          onMove(item.id, dropResult.stage);
        }
      },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [lead.id, lead.stage, onMove]
  );

  return (
    <div
      ref={(node) => {
        dragRef(node);
      }}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(lead.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(lead.id);
        }
      }}
      className={cn(
        "group rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm transition",
        "hover:border-slate-300 hover:bg-white hover:shadow-md",
        isDragging && "opacity-40"
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 border border-slate-200 bg-slate-100">
          <AvatarFallback className="bg-slate-100 text-sm font-semibold text-slate-700">
            {lead.company.slice(0, 1)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">
                {lead.company}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{lead.name}</p>
            </div>

             <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleStar(lead.id);
                }}
                className="rounded-full p-1 text-amber-500 transition hover:bg-amber-50"
                aria-label={lead.starred ? "Unstar lead" : "Star lead"}
              >
                <Star
                  className={cn("h-4 w-4", lead.starred && "fill-current")}
                />
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-900">
              {formatMoney(lead.dealValue)}
            </span>
            <Badge
              variant="outline"
              className={cn("border text-[11px] font-medium", urgencyStyles(lead.urgency))}
            >
              {lead.urgency}
            </Badge>
          </div>

          <div className="mt-3">
            <Progress value={lead.progress} className="h-1.5 bg-slate-100" />
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500">
            <span>{lead.score}% fit</span>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex items-center gap-1 text-violet-600 transition hover:text-violet-700"
                  aria-label="AI insight"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px]">
                {lead.aiHint}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({
  stage,
  leads,
  onOpen,
  onToggleStar,
  onMove,
}: {
  stage: (typeof STAGES)[number];
  leads: LeadCardData[];
  onOpen: (id: string) => void;
  onToggleStar: (id: string) => void;
  onMove: (id: string, stage: Stage) => void;
}) {
  const [{ isOver, canDrop }, dropRef] = useDrop(
    () => ({
      accept: "lead-card",
      drop: () => ({ stage: stage.key }),
      collect: (monitor) => ({
        isOver: monitor.isOver({ shallow: true }),
        canDrop: monitor.canDrop(),
      }),
    }),
    [stage.key]
  );

  const total = leads.reduce((sum, lead) => sum + lead.dealValue, 0);

  return (
    <section
      ref={(node) => {
        dropRef(node);
      }}
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
        isOver && canDrop && "ring-2 ring-violet-300"
      )}
    >
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{stage.label}</h2>
            <p className="mt-1 text-xs text-slate-500">{leads.length} leads</p>
          </div>

          <span className="text-sm font-semibold text-slate-900">
            {formatMoney(total)}
          </span>
        </div>
        <div className={cn("mt-3 h-1.5 rounded-full", stage.bar)} />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="space-y-3">
          {leads.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-3 py-8 text-center text-sm text-slate-500">
              Drop a lead here.
            </div>
          ) : (
            leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onOpen={onOpen}
                onToggleStar={onToggleStar}
                onMove={onMove}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default function CRMDashboard() {
  const [leads, setLeads] = useState<LeadCardData[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("summary");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadLeads = async () => {
      try {
        const response = await fetch("/api/leads", {
          cache: "no-store",
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: unknown }
            | null;
          const errorMessage =
            payload && typeof payload.error === "string"
              ? payload.error
              : `Failed to load leads (${response.status})`;

          throw new Error(errorMessage);
        }

        const data = (await response.json()) as LeadCardData[];

        if (!cancelled) {
          setLeads(Array.isArray(data) ? data : []);
          setLoadError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load leads"
          );
        }
      }
    };

    void loadLeads();

    return () => {
      cancelled = true;
    };
  }, []);

  const persistLeadPatch = useCallback(
    async (id: string, changes: Partial<LeadCardData>) => {
      try {
        const response = await fetch(`/api/leads/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(changes),
        });

        if (!response.ok) {
          throw new Error(`Failed to update lead (${response.status})`);
        }
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Failed to save lead changes"
        );
      }
    },
    []
  );

  const visibleLeads = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return leads;
    return leads.filter(
      (lead) =>
        lead.name.toLowerCase().includes(term) ||
        lead.company.toLowerCase().includes(term)
    );
  }, [leads, search]);

  const grouped = useMemo(
    () =>
      STAGES.map((stage) => ({
        ...stage,
        leads: visibleLeads.filter((lead) => lead.stage === stage.key),
      })),
    [visibleLeads]
  );

  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) ?? null;

  const hasLeads = leads.length > 0;

  useEffect(() => {
    if (!selectedLead) {
      setSelectedLeadId(null);
    }
  }, [selectedLead]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedLeadId(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const moveLead = (id: string, stage: Stage) => {
    setLeads((current) =>
      current.map((lead) => (lead.id === id ? { ...lead, stage } : lead))
    );
    void persistLeadPatch(id, { stage });
  };

  const toggleStar = (id: string) => {
    let nextStarred = false;

    setLeads((current) =>
      current.map((lead) => {
        if (lead.id !== id) {
          return lead;
        }

        nextStarred = !lead.starred;
        return { ...lead, starred: nextStarred };
      })
    );
    void persistLeadPatch(id, { starred: nextStarred });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <TooltipProvider delayDuration={120}>
        <main className="flex min-h-screen flex-col bg-white text-slate-900">
          <header className="border-b border-slate-200 bg-white">
            <div className="flex items-center gap-4 px-6 py-4">
              <Link href="/" className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                  A
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Agora CRM</p>
                  <p className="text-xs text-slate-500">Leads board</p>
                </div>
              </Link>

              <span className="hidden rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 md:inline">
                Leads
              </span>

              <div className="hidden w-full max-w-sm flex-1 sm:block">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search leads"
                  className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
                />
              </div>

              <div className="ml-auto flex items-center gap-3">
                <span className="hidden text-sm text-slate-500 sm:inline">
                  {visibleLeads.length} leads
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-500 text-xs font-semibold text-white">
                  AJ
                </div>
              </div>
            </div>
            {loadError && (
              <div className="border-t border-rose-200 bg-rose-50 px-6 py-2 text-sm text-rose-700">
                {loadError}
              </div>
            )}
          </header>

          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 overflow-x-auto bg-slate-50 p-4 sm:p-6">
              <div className="grid h-full min-w-[1080px] grid-cols-4 gap-4">
                {grouped.map((stage) => (
                  <KanbanColumn
                    key={stage.key}
                    stage={stage}
                    leads={stage.leads}
                    onOpen={(id) => {
                      setSelectedLeadId(id);
                      setActiveTab("summary");
                    }}
                    onToggleStar={toggleStar}
                    onMove={moveLead}
                  />
                ))}
              </div>
            </div>

              {!hasLeads && !loadError && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                  <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-600 shadow-sm">
                    No leads found in Couchbase yet.
                  </div>
                </div>
              )}

            {selectedLead && (
              <>
                <button
                  type="button"
                  aria-label="Close lead details"
                  className="fixed inset-0 z-40 bg-black/25"
                  onClick={() => setSelectedLeadId(null)}
                />

                <aside className="fixed right-0 top-0 z-50 h-full w-[400px] border-l border-slate-200 bg-white shadow-2xl">
                  <div
                    className="flex h-full flex-col"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-base font-semibold text-slate-900">
                            {selectedLead.name}
                          </h3>
                          <Badge
                            variant="outline"
                            className={cn("border text-[11px] font-medium", scoreTone(selectedLead.score))}
                          >
                            {selectedLead.score}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          {selectedLead.company}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedLeadId(null)}
                        className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                        aria-label="Close panel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="border-b border-slate-200 px-5 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 bg-slate-100">
                            <AvatarFallback className="bg-slate-100 text-sm font-semibold text-slate-700">
                              {selectedLead.company.slice(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {selectedLead.company}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatMoney(selectedLead.dealValue)}
                            </p>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className={cn("border text-[11px] font-medium", urgencyStyles(selectedLead.urgency))}
                        >
                          {selectedLead.urgency} urgency
                        </Badge>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 py-4">
                      <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-4 bg-slate-100">
                          <TabsTrigger value="summary">Summary</TabsTrigger>
                          <TabsTrigger value="score">Score</TabsTrigger>
                          <TabsTrigger value="tasks">Tasks</TabsTrigger>
                          <TabsTrigger value="follow-up">Follow-up</TabsTrigger>
                        </TabsList>

                        <TabsContent value="summary" className="mt-4 space-y-3">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-sm leading-6 text-slate-700">
                              {selectedLead.summary}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 p-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                              <Sparkles className="h-4 w-4 text-violet-500" />
                              AI insight
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {selectedLead.aiHint}
                            </p>
                          </div>
                        </TabsContent>

                        <TabsContent value="score" className="mt-4 space-y-4">
                          <div className="rounded-2xl border border-slate-200 p-4">
                            <div className="flex items-baseline justify-between">
                              <div>
                                <p className="text-sm text-slate-500">Lead score</p>
                                <p className="text-3xl font-semibold text-slate-900">
                                  {selectedLead.score}
                                </p>
                              </div>
                              <ArrowUpRight className="h-5 w-5 text-emerald-500" />
                            </div>
                            <Progress value={selectedLead.progress} className="mt-4 h-2 bg-slate-100" />
                          </div>

                          <div className="grid gap-3">
                            {selectedLead.scoreNotes.map((note) => (
                              <div
                                key={note}
                                className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                              >
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                {note}
                              </div>
                            ))}
                          </div>
                        </TabsContent>

                        <TabsContent value="tasks" className="mt-4 space-y-3">
                          {selectedLead.tasks.map((task) => (
                            <div
                              key={task.label}
                              className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3"
                            >
                              <span
                                className={cn(
                                  "flex h-5 w-5 items-center justify-center rounded-full border text-[11px]",
                                  task.done
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                                    : "border-slate-300 text-slate-400"
                                )}
                              >
                                {task.done ? "✓" : ""}
                              </span>
                              <span
                                className={cn(
                                  "text-sm",
                                  task.done ? "text-slate-400 line-through" : "text-slate-700"
                                )}
                              >
                                {task.label}
                              </span>
                            </div>
                          ))}
                        </TabsContent>

                        <TabsContent value="follow-up" className="mt-4">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                              {selectedLead.followUp}
                            </p>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
                </aside>
              </>
            )}
          </div>
        </main>
      </TooltipProvider>
    </DndProvider>
  );
}
