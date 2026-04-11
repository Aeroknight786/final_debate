"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/components/UserProvider";

interface Learning {
  id: string;
  moduleId: string;
  summary: string;
  strength: string;
  evidence: string | null;
  createdAt: string;
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

const strengthColors: Record<string, string> = {
  strong: "#4a7c59",
  medium: "#c49a3e",
  weak: "#c45d3e",
};

export default function LearningsPage() {
  const { userId, loading } = useUser();
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!userId) return;

    async function fetchLearnings() {
      try {
        const res = await fetch(`/api/learnings?userId=${userId}`);
        const data = await res.json();
        setLearnings(data.learnings || []);
      } catch (error) {
        console.error("Failed to fetch learnings:", error);
      } finally {
        setFetching(false);
      }
    }

    fetchLearnings();
  }, [userId]);

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: "var(--muted)" }}>
        Loading...
      </div>
    );
  }

  // Group learnings by module
  const grouped = learnings.reduce<Record<string, Learning[]>>((acc, l) => {
    if (!acc[l.moduleId]) acc[l.moduleId] = [];
    acc[l.moduleId].push(l);
    return acc;
  }, {});

  const moduleOrder = Object.keys(moduleNames);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h2 className="text-xl font-semibold mb-1">What You&apos;ve Learned</h2>
        <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
          A cumulative record of insights from your journey through the program.
          These build on each other.
        </p>

        {learnings.length === 0 ? (
          <div
            className="text-center py-16 rounded-xl border"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <p style={{ color: "var(--muted)" }}>
              No learnings recorded yet. As you progress through the debate, insights will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {moduleOrder
              .filter((mod) => grouped[mod])
              .map((moduleId) => (
                <div key={moduleId}>
                  <h3 className="text-sm font-medium mb-3 uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                    {moduleNames[moduleId] || moduleId}
                  </h3>
                  <div className="space-y-3">
                    {grouped[moduleId].map((learning) => {
                      const evidence = learning.evidence
                        ? JSON.parse(learning.evidence)
                        : [];
                      return (
                        <div
                          key={learning.id}
                          className="rounded-xl border p-4"
                          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                              style={{
                                background: strengthColors[learning.strength] || strengthColors.medium,
                              }}
                            />
                            <div>
                              <p className="text-[15px]">{learning.summary}</p>
                              {evidence.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                                    Based on: {evidence.join("; ")}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
