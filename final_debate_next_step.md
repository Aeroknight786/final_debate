# Final Debate — Next Iteration Handoff

This document is the corrective brief for the current app build.

The current repo is **structurally good**. It already has the right broad scaffolding:
- staged modules
- belief objects
- learnings screen
- roadmap
- ritual gate
- hidden readiness / summaries

However, the build is still **too much like a sophisticated cessation app** and **not enough like a psychologically sharp smoker's debate**.

The next iteration must focus primarily on the **conversation engine and module progression behavior**, not on adding more surfaces or polish.

---

## Core correction

The product is **not**:
- a supportive quit coach
- a generic therapist-like conversation app
- a habit tracker with good prompts
- a beautiful shell around Allen Carr-like ideas

The product **is**:
- a **debate-first smoking conversion program**
- a system that invites the smoker to defend cigarettes
- a system that progressively collapses the smoker's logic
- a system that stores unresolved beliefs and returns to them later
- a system that should feel like the user is being **cornered into realization**, not merely guided through modules

The app should make the user feel:
- understood as a smoker
- not judged as weak or stupid
- but unable to keep their justifications intact

Warm toward the addict. Sharp toward the addiction.

---

## What is currently working

Keep and preserve these:
- route structure and major screens
- belief object architecture
- module roadmap concept
- hidden summaries and readiness state
- ritual gating concept
- non-medical coach framing
- later-topic leakage controls

Do **not** rewrite the whole app from scratch.

---

## What is missing

### 1. The chat is not sharp enough
The biggest problem is that the live conversation still feels too much like a broad LLM coach.

What we actually need is a **tighter dialectical loop** inside each module:
1. user claim
2. probe for specifics
3. narrow the logic
4. expose contradiction
5. reframe in the user's own words
6. test whether the belief actually weakened
7. resolve or defer

The system should **not** drift into generic reflection when a contradiction is available.

### 2. Progression is too soft / automatic
Advancement should not happen because the conversation has gone on for a while and the model feels good enough.

Progression should depend on:
- required concepts actually being covered
- at least one belief being genuinely stress-tested
- derivative module-end checks
- unresolved beliefs being explicitly deferred, not hand-waved away

### 3. There is not enough visible unresolved tension
The product should not pretend every module ends in clean agreement.

If the user resists, the product should say so clearly:
- this belief is still active
- this belief will return later
- we are not done with it

This should appear in both:
- hidden state
- visible UI summaries

### 4. Learnings are too generic
The learnings screen should not just be a soft summary.

It should show:
- what the user thought
- what contradiction was uncovered
- what new framing was reached
- what still resists

### 5. The first experience is not yet distinctive enough
The opening should feel more like:
- “bring me your strongest argument for smoking”
- “tell me exactly what a cigarette gives you”
- “let's see if your reasons survive scrutiny”

And less like:
- “tell me about your relationship with smoking”

The hook is **smoker's debate**, not generic onboarding.

---

## Product truth to preserve

The method must keep these truths at the center:
- smoking persists through two entangled layers:
  - chemical dependence
  - mental narrative dependence
- each is manageable separately
- together they feel like an impossible trap
- the job is not to help the user “cope with deprivation”
- the job is to dismantle the belief that cigarettes provide anything worth missing
- the user should finish the program understanding that they **do not actually enjoy smoking**

---

## Required redesign of the conversation engine

Implement a **module-level debate engine**.

Each module should have:
- target beliefs
- target contradictions
- allowed explanations
- withheld future concepts
- test questions
- completion criteria

### Proposed per-module conversation state machine
For each target belief in the module:

1. **Elicit**
   Ask the user for their version of the belief.
   Example: “What exactly does smoking do for you when you're stressed?”

2. **Localize**
   Ask for concrete situations.
   Example: “Take yesterday. When did it help? Before the cigarette, during it, or after the craving eased?”

3. **Compress**
   Force the belief into a smaller and more testable claim.
   Example: “So is the cigarette creating calm, or just ending agitation?”

4. **Contradict**
   Use the user's own evidence against the belief.
   Example: “If it relaxed you, why were you tense until you lit it?”

5. **Reframe**
   State the corrected frame with conviction.
   Example: “What you felt was not a gift from smoking. It was relief from the discomfort smoking had created.”

6. **Test**
   Ask a derivative question that reveals whether the belief actually weakened.

7. **Resolve or defer**
   Mark the belief as:
   - resolved
   - weakened
   - deferred

Do not skip these steps just because the model can produce a nice paragraph.

---

## Add module-end belief tests

Each module must end with **2 to 4 subtle derivative questions**.

These should not just ask whether the user agrees.
They should test whether the user now reasons differently.

Examples:
- “Why does a cigarette after stress feel relieving?”
- “If smoking truly relaxed you, why did it create the tension that made relief necessary?”
- “What is the difference between pleasure and relief from withdrawal?”

If the user answers antagonistically or shallowly:
- reinsert challenge
- do not auto-advance
- mark active unresolved beliefs

---

## UI changes required

### 1. Make unresolved beliefs visible
On the beliefs / doubts screen, distinguish clearly between:
- cracked beliefs
- active beliefs
- beliefs deferred for later dismantling

The user should feel that the system is tracking the debate, not just collecting notes.

### 2. Improve learnings screen
Each learning item should ideally contain:
- original belief
- contradiction found
- corrected frame
- confidence or stability
- linked deferred belief if still unresolved

### 3. Roadmap copy needs sharpening
The roadmap should feel less like clean product UX and more like a guided dismantling process.

Module names can stay elegant, but the descriptions should reflect things like:
- what smokers usually believe here
- what illusion is being examined
- what must break before the user moves on

### 4. Opening experience
Revise the landing and first chat interactions so the experience begins as a challenge.

Examples of acceptable openings:
- “Bring me your strongest argument for smoking.”
- “Tell me what a cigarette actually gives you.”
- “You think smoking helps. Let's test that.”

Avoid soft general wellness language.

---

## Prompt architecture changes

The current prompt strategy should be tightened.

### Add explicit module prompt contracts
For each module, define:
- beliefs under examination
- contradictions to surface
- concepts not yet to be revealed
- acceptable direct teachings
- derivative test questions
- completion conditions

### Add debate-style response constraints
The assistant should:
- ask fewer but sharper questions
- challenge specific logic, not just feelings
- use the user's own examples repeatedly
- avoid generic motivational filler
- avoid sounding like a therapist unless the user is distressed
- soften only when the user destabilizes

### Tone guidance
The assistant should sound:
- warm toward the smoker
- exacting toward the logic
- calm, lucid, and unhurried
- repetitive in meaning, but with varied phrasing
- confident enough to contradict the user directly when needed

The assistant should never make the user feel pathetic for smoking.
But it should make their cigarette logic hard to defend.

---

## Readiness and progression changes

Replace or strengthen the current auto-advance behavior.

Progression should require:
- module objectives covered
- target beliefs confronted
- at least one module-end test attempted
- no major unresolved blocker unless formally deferred
- readiness determined by both rules and model judgment

Use **rules + model judgment**, not model judgment alone.

---

## Suggested implementation tasks

### Phase 1 — tighten debate loop
- Refactor chat orchestration so each module runs a structured debate loop
- Add explicit per-module target beliefs and contradictions
- Add derivative test questions to module definitions
- Prevent easy auto-advance

### Phase 2 — improve state visibility
- Upgrade learnings model and UI
- Show unresolved/deferred beliefs clearly
- Link learnings to beliefs

### Phase 3 — sharpen first-run experience
- Rewrite opening and first module copy
- Make the first interaction unmistakably a smoker's debate

### Phase 4 — evaluation and testing
Add tests/evals for:
- future-concept leakage
- contradiction detection
- belief defer vs resolve correctness
- stage progression correctness
- tone consistency
- whether responses remain sharp instead of generic

---

## What success looks like after this iteration

A smoker using the app should feel:
- “This thing actually understood my argument.”
- “It didn't shame me.”
- “It didn't just comfort me.”
- “It kept narrowing the point until I couldn't defend it properly.”
- “It remembers exactly what I still believe.”
- “It isn't just teaching me chapters. It's dismantling my reasons.”

That is the target.

---

## Exact instruction to follow now

Do not add new broad features.
Do not spend time polishing visuals first.
Do not overbuild voice, audio, analytics, or commercial layers.

**Focus the next iteration almost entirely on the method engine.**

Preserve the app shell.
Sharpen the debate.
Strengthen progression.
Make unresolved beliefs part of the lived product.

