"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/components/UserProvider";

interface RitualState {
  eligible: boolean;
  ritual: {
    completedAt: string | null;
    confirmedFinal: boolean;
    statementText: string | null;
  } | null;
}

export default function RitualPage() {
  const { userId, loading } = useUser();
  const [ritualState, setRitualState] = useState<RitualState | null>(null);
  const [statement, setStatement] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!userId) return;

    async function fetchRitual() {
      try {
        const res = await fetch(`/api/ritual?userId=${userId}`);
        const data = await res.json();
        setRitualState(data);
        if (data.ritual?.confirmedFinal) {
          setCompleted(true);
          setStatement(data.ritual.statementText || "");
        }
      } catch (error) {
        console.error("Failed to fetch ritual state:", error);
      } finally {
        setFetching(false);
      }
    }

    fetchRitual();
  }, [userId]);

  async function handleComplete() {
    if (!userId || !statement.trim()) return;
    setSubmitting(true);

    try {
      // Begin the ritual
      await fetch("/api/ritual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "begin" }),
      });

      // Complete it
      const res = await fetch("/api/ritual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action: "complete",
          statementText: statement,
        }),
      });
      const data = await res.json();

      if (data.programCompleted) {
        setCompleted(true);
      }
    } catch (error) {
      console.error("Ritual completion failed:", error);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: "var(--muted)" }}>
        Loading...
      </div>
    );
  }

  // Completed state
  if (completed) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-lg mx-auto px-6 py-16 text-center">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ background: "#e3f0e7" }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4a7c59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h2 className="text-2xl font-semibold mb-3">You are free.</h2>
          <p className="text-[15px] mb-6" style={{ color: "var(--muted)" }}>
            You have completed the Final Debate About Smoking. You are not quitting.
            You are not giving anything up. You are a non-smoker who has been released.
          </p>

          {statement && (
            <div
              className="rounded-xl border p-5 text-left"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <p className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                Your statement of release
              </p>
              <p className="text-[15px] italic">&ldquo;{statement}&rdquo;</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Not eligible yet
  if (!ritualState?.eligible) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-lg mx-auto px-6 py-16 text-center">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ background: "var(--surface-alt)" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <h2 className="text-xl font-semibold mb-3">The Final Ritual</h2>
          <p className="text-[15px] mb-4" style={{ color: "var(--muted)" }}>
            This is where the program ends and your freedom begins. But not yet.
          </p>
          <p className="text-[15px]" style={{ color: "var(--muted)" }}>
            The ritual unlocks when you have worked through enough of the program
            that the last cigarette can be a genuine act of release, not a willpower test.
            Continue the debate.
          </p>
        </div>
      </div>
    );
  }

  // Eligible — show the ritual
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-lg mx-auto px-6 py-12">
        <h2 className="text-2xl font-semibold mb-2 text-center">The Final Cigarette</h2>
        <p className="text-[15px] text-center mb-10" style={{ color: "var(--muted)" }}>
          You have worked through the program. You now understand the trap.
          This is your last cigarette — not because you are depriving yourself,
          but because you no longer need it.
        </p>

        <div
          className="rounded-xl border p-6 mb-6"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <h3 className="font-medium mb-4">Before you smoke your last cigarette:</h3>
          <ol className="space-y-3 text-[15px]" style={{ color: "var(--foreground)" }}>
            <li>1. Light it consciously. Pay attention to every drag.</li>
            <li>2. Notice what it actually does. Not what you used to think it did.</li>
            <li>3. Ask yourself: &ldquo;Is this giving me anything real?&rdquo;</li>
            <li>4. When you put it out, you are not quitting. You are being released.</li>
          </ol>
        </div>

        <div
          className="rounded-xl border p-6"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <h3 className="font-medium mb-3">Your statement of release</h3>
          <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
            In your own words, say what you now understand. This is for you.
          </p>
          <textarea
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            rows={4}
            className="w-full rounded-lg border p-3 text-[15px] resize-none outline-none"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface-alt)",
              color: "var(--foreground)",
            }}
            placeholder="I am free because..."
          />
          <button
            onClick={handleComplete}
            disabled={submitting || !statement.trim()}
            className="mt-4 w-full py-3 rounded-lg text-sm font-medium transition-opacity disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {submitting ? "Confirming..." : "I have smoked my last cigarette"}
          </button>
        </div>
      </div>
    </div>
  );
}
