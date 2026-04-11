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
  updatedAt: string;
}

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

  const activeBeliefs = beliefs.filter((b) => b.status !== "resolved");
  const resolvedBeliefs = beliefs.filter((b) => b.status === "resolved");

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h2 className="text-xl font-semibold mb-1">Your Beliefs About Smoking</h2>
        <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
          These are the beliefs you have expressed or implied during our conversations.
          We track them so we can examine each one honestly.
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
            {activeBeliefs.length > 0 && (
              <div className="mb-10">
                <h3 className="text-sm font-medium mb-4 uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                  Under examination ({activeBeliefs.length})
                </h3>
                <div className="space-y-3">
                  {activeBeliefs.map((belief) => (
                    <BeliefCard key={belief.id} belief={belief} />
                  ))}
                </div>
              </div>
            )}

            {resolvedBeliefs.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-4 uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                  Resolved ({resolvedBeliefs.length})
                </h3>
                <div className="space-y-3">
                  {resolvedBeliefs.map((belief) => (
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

      <div className="mt-3 flex items-center gap-3">
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          Confidence: {belief.confidence}
        </span>
      </div>
    </div>
  );
}
