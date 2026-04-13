"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/components/UserProvider";

interface Belief {
  id: string;
  canonicalLabel: string;
  label: string;
  userWording: string | null;
  confidence: string;
  status: string;
  contradictions: string | null;
  evidenceFromUser: string | null;
  targetModule: string | null;
  updatedAt: string;
}

const moduleNames: Record<string, string> = {
  module_0: "The Challenge",
  module_1: "The Trap",
  module_2: "Nicotine vs Meaning",
  module_3: "The Illusions of Relief",
  module_4: "What You Think You're Giving Up",
  module_5: "Why Prior Quits Failed",
  module_6: "The Last Cigarette Logic",
  module_7: "Final Ritual",
  module_8: "Freedom",
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "#c45d3e", bg: "#fef2ee" },
  under_challenge: { label: "Under examination", color: "#c49a3e", bg: "#fef9ee" },
  weakened: { label: "Weakening", color: "#4a7c59", bg: "#eef6f0" },
  deferred: { label: "Revisiting later", color: "#6b6b6b", bg: "#f3f1ee" },
  resolved: { label: "Resolved", color: "#4a7c59", bg: "#e3f0e7" },
};

export default function BeliefsPage() {
  const { userId, loading } = useUser();
  const [beliefs, setBeliefs] = useState<Belief[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!userId) return;

    async function fetchBeliefs() {
      try {
        const res = await fetch(`/api/beliefs?userId=${userId}`);
        const data = await res.json();
        setBeliefs(data.beliefs || []);
      } catch (error) {
        console.error("Failed to fetch beliefs:", error);
      } finally {
        setFetching(false);
      }
    }

    fetchBeliefs();
  }, [userId]);

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: "var(--muted)" }}>
        Loading...
      </div>
    );
  }

  const underExamination = beliefs.filter((b) =>
    ["active", "under_challenge", "weakened"].includes(b.status)
  );
  const deferred = beliefs.filter((b) => b.status === "deferred");
  const cracked = beliefs.filter((b) => b.status === "resolved");

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h2 className="text-xl font-semibold mb-1">Your Beliefs About Smoking</h2>
        <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
          This is the live debate. Beliefs you defend stay under examination
          until they crack or get formally parked for a later module. Nothing
          here is hand-waved away.
        </p>

        {beliefs.length === 0 ? (
          <div
            className="text-center py-16 rounded-xl border"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <p style={{ color: "var(--muted)" }}>
              No beliefs tracked yet. Start the debate and your beliefs will appear here as we identify them together.
            </p>
          </div>
        ) : (
          <>
            {underExamination.length > 0 && (
              <div className="mb-10">
                <h3
                  className="text-sm font-medium mb-1 uppercase tracking-wide"
                  style={{ color: "var(--muted)" }}
                >
                  Under examination ({underExamination.length})
                </h3>
                <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
                  Currently in play. We are actively testing whether these
                  hold up.
                </p>
                <div className="space-y-3">
                  {underExamination.map((belief) => (
                    <BeliefCard key={belief.id} belief={belief} />
                  ))}
                </div>
              </div>
            )}

            {deferred.length > 0 && (
              <div className="mb-10">
                <h3
                  className="text-sm font-medium mb-1 uppercase tracking-wide"
                  style={{ color: "var(--muted)" }}
                >
                  Deferred — we&apos;ll come back to these ({deferred.length})
                </h3>
                <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
                  Parked on purpose. Each of these belongs to a later module
                  where it will be properly dismantled. Not forgotten, not
                  resolved.
                </p>
                <div className="space-y-3">
                  {deferred.map((belief) => (
                    <BeliefCard key={belief.id} belief={belief} />
                  ))}
                </div>
              </div>
            )}

            {cracked.length > 0 && (
              <div>
                <h3
                  className="text-sm font-medium mb-1 uppercase tracking-wide"
                  style={{ color: "var(--muted)" }}
                >
                  Cracked ({cracked.length})
                </h3>
                <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
                  Beliefs whose logic no longer survives your own examples.
                </p>
                <div className="space-y-3">
                  {cracked.map((belief) => (
                    <BeliefCard key={belief.id} belief={belief} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function BeliefCard({ belief }: { belief: Belief }) {
  const config = statusConfig[belief.status] || statusConfig.active;
  const contradictions = belief.contradictions ? JSON.parse(belief.contradictions) : [];

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-medium text-[15px]">{belief.label}</p>
          {belief.userWording && (
            <p className="text-sm mt-1 italic" style={{ color: "var(--muted)" }}>
              &ldquo;{belief.userWording}&rdquo;
            </p>
          )}
        </div>
        <span
          className="text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap"
          style={{ color: config.color, background: config.bg }}
        >
          {config.label}
        </span>
      </div>

      {contradictions.length > 0 && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
            Contradictions found:
          </p>
          <ul className="space-y-1">
            {contradictions.map((c: string, i: number) => (
              <li key={i} className="text-sm" style={{ color: "var(--foreground)" }}>
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          Confidence: {belief.confidence}
        </span>
        {belief.status === "deferred" && belief.targetModule && (
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            Returns in: {moduleNames[belief.targetModule] ?? belief.targetModule}
          </span>
        )}
      </div>
    </div>
  );
}
