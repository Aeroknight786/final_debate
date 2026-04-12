import { ModuleDefinition } from "../modules/definitions";

export function buildModulePrompt(module: ModuleDefinition): string {
  return `## Current Module: ${module.name}

### Your objective
${module.goal}

### Themes to explore in this module
${module.themes.map((t) => `- ${t}`).join("\n")}

### Target beliefs — examine these (hard contract)
For each of these, run the full debate loop (Elicit → Localize → Compress → Contradict → Reframe → Test → Resolve/Defer). Do not settle for surface agreement.
${module.targetBeliefs.length > 0 ? module.targetBeliefs.map((b) => `- ${b}`).join("\n") : "- No specific target beliefs (this is a synthesis/ritual module)"}

### What counts as sufficient progress in this module
${module.completionCriteria.map((c) => `- ${c}`).join("\n")}

### Understanding test questions (use near module end to probe real understanding)
${module.understandingTests.length > 0 ? module.understandingTests.map((t) => `- "${t}"`).join("\n") : "- No specific tests for this module"}

### Derivative belief tests (DEPLOY near module end)
These are NOT comprehension checks. They probe whether the user is now REASONING differently. If the user answers shallowly, antagonistically, or with cached agreement, reinsert challenge. Do not advance. Mark the belief active.
${module.derivativeTests.length > 0 ? module.derivativeTests.map((t) => `- "${t}"`).join("\n") : "- No derivative tests for this module"}

### Topics to WITHHOLD (belong to later modules — partially acknowledge if asked, then redirect)
${module.deferTopics.length > 0 ? module.deferTopics.map((d) => `- ${d}`).join("\n") : "- No deferred topics"}

### Stage discipline
Stay within this module's scope. If the user asks about later topics, you may say something like:
"That does matter, and we will get there. But right now I want to stay with what you just said, because if that remains intact the later point won't land properly."`;
}

export function buildMemoryPrompt(context: {
  userProfile: {
    cigarettesPerDay?: number | null;
    yearsSmoking?: number | null;
    previousQuitAttempts?: number | null;
    smokingNarrative?: string | null;
  } | null;
  currentModule: string;
  activeBeliefs: Array<{
    label: string;
    userWording: string | null;
    status: string;
    confidence: string;
  }>;
  recentLearnings: Array<{
    summary: string;
    strength: string;
  }>;
  lastSummary: string | null;
}): string {
  const parts: string[] = ["## User Context"];

  if (context.userProfile) {
    const p = context.userProfile;
    const profileParts: string[] = [];
    if (p.cigarettesPerDay) profileParts.push(`Smokes ~${p.cigarettesPerDay}/day`);
    if (p.yearsSmoking) profileParts.push(`Has smoked for ~${p.yearsSmoking} years`);
    if (p.previousQuitAttempts) profileParts.push(`Previous quit attempts: ${p.previousQuitAttempts}`);
    if (p.smokingNarrative) profileParts.push(`Their story: "${p.smokingNarrative}"`);
    if (profileParts.length > 0) {
      parts.push("### Smoking Profile");
      parts.push(profileParts.join("\n"));
    }
  }

  if (context.activeBeliefs.length > 0) {
    parts.push("### Active Beliefs");
    parts.push(
      "These are beliefs the user currently holds about smoking. Use them to guide your questioning."
    );
    for (const b of context.activeBeliefs) {
      parts.push(
        `- [${b.status}] "${b.label}" (confidence: ${b.confidence})${b.userWording ? ` — in their words: "${b.userWording}"` : ""}`
      );
    }
  }

  if (context.recentLearnings.length > 0) {
    parts.push("### Recent Learnings");
    for (const l of context.recentLearnings) {
      parts.push(`- [${l.strength}] ${l.summary}`);
    }
  }

  if (context.lastSummary) {
    parts.push("### Last Session Summary");
    parts.push(context.lastSummary);
  }

  return parts.join("\n\n");
}

export function buildStageGovernorPrompt(
  currentModuleOrder: number,
  totalModules: number
): string {
  return `## Stage Governor Rules

You are in module ${currentModuleOrder + 1} of ${totalModules}.

STRICT RULES:
1. Do NOT fully explain concepts that belong to later modules. You may acknowledge them briefly but must redirect.
2. Do NOT encourage the user to quit smoking until the method has worked through enough modules (at minimum through module 5).
3. Do NOT rush through the current module. Depth matters more than speed.
4. If the user tries to skip ahead, redirect: the current foundation must be solid for later points to land.
5. The final cigarette ritual (module 7) is LOCKED until modules 0-6 are sufficiently completed.
6. Do not fake agreement. If a belief is unresolved, mark it for later rather than pretending it's been addressed.
7. If the user agrees too quickly or superficially, probe deeper — surface agreement is not real understanding.`;
}
