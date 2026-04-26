"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/components/UserProvider";

interface ModuleState {
  id: string;
  name: string;
  shortName: string;
  goal: string;
  order: number;
  status: string;
  completedAt: string | null;
}

interface ReadinessView {
  ready: boolean;
  reason: string;
  blockers: string[];
  stressTested: string[];
  rulesBlocked: boolean;
}

export default function RoadmapPage() {
  const { userId, loading } = useUser();
  const [modules, setModules] = useState<ModuleState[]>([]);
  const [fetching, setFetching] = useState(true);
  const [assessing, setAssessing] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [readiness, setReadiness] = useState<ReadinessView | null>(null);

  async function fetchModules() {
    if (!userId) return;
    try {
      const res = await fetch(`/api/modules?userId=${userId}`);
      const data = await res.json();
      setModules(data.modules || []);
    } catch (error) {
      console.error("Failed to fetch modules:", error);
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (!userId) return;
    fetchModules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function handleAssess() {
    if (!userId) return;
    setAssessing(true);
    setReadiness(null);
    try {
      const res = await fetch(`/api/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "assess" }),
      });
      const data = await res.json();
      const a = data.assessment ?? {};
      setReadiness({
        ready: !!a.ready,
        reason: a.reason ?? "",
        blockers: a.blockers ?? [],
        stressTested: a.stress_tested_beliefs ?? [],
        rulesBlocked: !!a.rules_blocked,
      });
    } catch (error) {
      console.error("Failed to assess readiness:", error);
    } finally {
      setAssessing(false);
    }
  }

  async function handleAdvance() {
    if (!userId) return;
    setAdvancing(true);
    try {
      const res = await fetch(`/api/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "advance" }),
      });
      const data = await res.json();
      if (data.advanced) {
        setModules(data.modules || []);
        setReadiness(null);
      } else {
        // Advance refused (rules re-check failed). Re-run assess to show why.
        await handleAssess();
      }
    } catch (error) {
      console.error("Failed to advance:", error);
    } finally {
      setAdvancing(false);
    }
  }

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: "var(--muted)" }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h2 className="text-xl font-semibold mb-1">Your Journey</h2>
        <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
          This is not a checklist. It is a path through ideas, each building on the last.
          You move forward when you are ready, not when a timer says so.
        </p>

        <div className="relative">
          {/* Vertical line */}
          <div
            className="absolute left-4 top-0 bottom-0 w-px"
            style={{ background: "var(--border)" }}
          />

          <div className="space-y-1">
            {modules.map((mod, idx) => {
              const isCompleted = mod.status === "completed";
              const isActive = mod.status === "active" || mod.status === "in_progress";
              const isLocked = mod.status === "locked";
              const isLast = idx === modules.length - 1;

              return (
                <div key={mod.id} className="relative flex gap-4 pl-0">
                  {/* Node */}
                  <div className="relative z-10 flex-shrink-0 flex items-start pt-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                        isLast && !isCompleted ? "" : ""
                      }`}
                      style={{
                        borderColor: isCompleted
                          ? "var(--success)"
                          : isActive
                            ? "var(--accent)"
                            : "var(--border)",
                        background: isCompleted
                          ? "var(--success)"
                          : isActive
                            ? "var(--accent)"
                            : "var(--surface)",
                      }}
                    >
                      {isCompleted ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : isActive ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-white" />
                      ) : (
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ background: "var(--border)" }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div
                    className={`flex-1 rounded-xl border p-4 my-1.5 transition-opacity ${
                      isLocked ? "opacity-50" : ""
                    }`}
                    style={{
                      borderColor: isActive ? "var(--accent)" : "var(--border)",
                      background: "var(--surface)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <h3
                        className="font-medium text-[15px]"
                        style={{
                          color: isLocked ? "var(--muted)" : "var(--foreground)",
                        }}
                      >
                        {mod.name}
                      </h3>
                      {isActive && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ color: "var(--accent)", background: "#fef2ee" }}
                        >
                          Current
                        </span>
                      )}
                    </div>
                    <p
                      className="text-sm mt-1"
                      style={{ color: "var(--muted)" }}
                    >
                      {mod.goal}
                    </p>
                    {isCompleted && mod.completedAt && (
                      <p className="text-xs mt-2" style={{ color: "var(--success)" }}>
                        Completed
                      </p>
                    )}

                    {isActive && mod.order < 7 && (
                      <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                        <div className="flex gap-2">
                          <button
                            onClick={handleAssess}
                            disabled={assessing || advancing}
                            className="text-xs px-3 py-1.5 rounded-lg border transition-opacity disabled:opacity-50"
                            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                          >
                            {assessing ? "Checking..." : "Am I ready to move on?"}
                          </button>
                          {readiness?.ready && (
                            <button
                              onClick={handleAdvance}
                              disabled={advancing}
                              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity disabled:opacity-50"
                              style={{ background: "var(--accent)", color: "#fff" }}
                            >
                              {advancing ? "Advancing..." : "Advance"}
                            </button>
                          )}
                        </div>

                        {readiness && (
                          <div className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
                            {readiness.ready ? (
                              <p style={{ color: "var(--success)" }}>
                                {readiness.reason || "Ready to move on."}
                              </p>
                            ) : (
                              <div>
                                <p className="mb-1" style={{ color: "var(--foreground)" }}>
                                  Not yet — here&apos;s what&apos;s still open:
                                </p>
                                <ul className="space-y-1 list-disc pl-4">
                                  {readiness.blockers.map((b, i) => (
                                    <li key={i}>{b}</li>
                                  ))}
                                </ul>
                                {readiness.reason && (
                                  <p className="mt-2 italic">{readiness.reason}</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
