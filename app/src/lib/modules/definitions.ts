export interface ModuleDefinition {
  id: string;
  name: string;
  shortName: string;
  goal: string;
  themes: string[];
  targetBeliefs: string[];
  completionCriteria: string[];
  understandingTests: string[];
  deferTopics: string[]; // topics that belong to later modules
  order: number;
}

export const MODULES: ModuleDefinition[] = [
  {
    id: "module_0",
    name: "The Challenge",
    shortName: "Challenge",
    goal: "Get the user talking, not complying. Extract their theory of smoking before teaching yours.",
    themes: [
      "Do you actually like cigarettes?",
      "Why do you smoke if you know the costs?",
      "What happened when you tried to quit before?",
      "What do cigarettes do for you that nothing else does?",
    ],
    targetBeliefs: [
      "enjoyment",
      "stress_relief",
      "concentration_aid",
      "social_ease",
      "relaxation",
      "boredom_relief",
      "identity",
    ],
    completionCriteria: [
      "User has articulated at least 2-3 reasons they believe they smoke",
      "Initial smoking narrative has been captured",
      "User has shared at least one quit attempt or reason they haven't quit",
      "Key defended beliefs have been identified",
    ],
    understandingTests: [
      "Can you list the top reasons you think cigarettes help you?",
      "What would you miss most if you stopped smoking tomorrow?",
      "When you tried to quit before, what pulled you back?",
    ],
    deferTopics: [
      "nicotine withdrawal mechanics",
      "false relief explanation",
      "deprivation reframing",
      "final cigarette planning",
    ],
    order: 0,
  },
  {
    id: "module_1",
    name: "The Trap",
    shortName: "Trap",
    goal: "Establish that the user is not uniquely broken; the trap has structure. Normalize the addiction without excusing it.",
    themes: [
      "Nobody sets out wanting lifelong dependence",
      "The trap is subtle and well-designed",
      "The smoker's conflict is not mysterious weakness",
      "The addiction has two parts: narrative dependence and chemical dependence",
    ],
    targetBeliefs: ["weakness", "uniquely_addicted", "hopelessness", "shame"],
    completionCriteria: [
      "User understands addiction has two components (narrative + chemical)",
      "User shows reduced shame about being addicted",
      "User recognizes the trap structure rather than personal failing",
    ],
    understandingTests: [
      "What are the two parts of smoking addiction as we discussed them?",
      "If millions of smart people are trapped the same way, what does that tell you about the trap versus about you?",
      "When you feel ashamed of smoking, is that about you or about how the trap works?",
    ],
    deferTopics: [
      "specific false benefit dismantling",
      "deprivation reframing",
      "final cigarette",
    ],
    order: 1,
  },
  {
    id: "module_2",
    name: "Nicotine vs Meaning",
    shortName: "Nicotine",
    goal: "Separate chemical dependence from the stories built around it. The cigarette appears to solve discomfort it helped create.",
    themes: [
      "Withdrawal loop vs interpretation of withdrawal",
      "Relief is not the same as benefit",
      "The cigarette solves a problem it created",
      "Craving creates the illusion of value",
    ],
    targetBeliefs: [
      "enjoyment",
      "genuine_pleasure",
      "cigarettes_provide_something",
    ],
    completionCriteria: [
      "User can distinguish between relief from withdrawal and genuine benefit",
      "User understands the craving-relief cycle",
      "First direct challenge to 'I enjoy it' has landed",
    ],
    understandingTests: [
      "If a cigarette feels best after you haven't had one for hours, what does that tell you about what it's actually doing?",
      "What is the difference between ending craving and gaining a real benefit?",
      "Why might a non-smoker not need what the cigarette gives you?",
    ],
    deferTopics: [
      "specific stress/concentration dismantling",
      "fear of quitting",
      "final cigarette",
    ],
    order: 2,
  },
  {
    id: "module_3",
    name: "The Illusions of Relief",
    shortName: "Illusions",
    goal: "Dismantle the specific false benefits the user has assigned to cigarettes.",
    themes: [
      "Stress relief illusion",
      "Relaxation illusion",
      "Concentration illusion",
      "Boredom relief illusion",
      "Confidence / social ease illusion",
      "Each is withdrawal relief misread as benefit",
    ],
    targetBeliefs: [
      "stress_relief",
      "relaxation",
      "concentration_aid",
      "boredom_relief",
      "social_ease",
      "confidence",
    ],
    completionCriteria: [
      "User's primary false benefits have been individually addressed",
      "User can articulate why at least one of their beliefs was a misread of withdrawal relief",
      "User-specific map of false functions has been surfaced",
    ],
    understandingTests: [
      "If smoking relaxes you, why do you feel tension building before the cigarette?",
      "Why does a cigarette feel most necessary when you're most deprived?",
      "Can you think of a time you handled stress without a cigarette? What actually happened?",
    ],
    deferTopics: ["fear of quitting", "identity loss", "final cigarette"],
    order: 3,
  },
  {
    id: "module_4",
    name: "What You Think You're Giving Up",
    shortName: "Deprivation",
    goal: "Break the deprivation framing. Quitting is release, not loss.",
    themes: [
      "Fear of missing out",
      "Fear of identity loss",
      "Fear of social loss",
      "Fear that life becomes flatter",
      "The idea that quitting means sacrifice",
      "Reframing quitting as gaining freedom",
    ],
    targetBeliefs: [
      "deprivation_fear",
      "identity_loss",
      "social_loss",
      "life_flatter",
      "sacrifice",
    ],
    completionCriteria: [
      "User can articulate what they actually lose (nothing real)",
      "User has engaged with the freedom vs deprivation reframe",
      "Fear of quitting has been directly addressed",
    ],
    understandingTests: [
      "What exactly will you be giving up that has genuine value?",
      "If a non-smoker doesn't miss cigarettes, what does that tell you about what you'd actually lose?",
      "Is quitting more like escaping a prison or losing a friend?",
    ],
    deferTopics: ["final cigarette logistics", "post-quit life planning"],
    order: 4,
  },
  {
    id: "module_5",
    name: "Why Prior Quits Failed",
    shortName: "Past Quits",
    goal: "Recode previous failures as failed framing, not proof of impossible addiction.",
    themes: [
      "Not lack of character",
      "Not proof of impossible addiction",
      "Failed attempts as failed framing",
      "Willpower attempts preserve the illusion of loss",
      "This time is different because the understanding is different",
    ],
    targetBeliefs: [
      "cant_quit",
      "too_addicted",
      "willpower_failure",
      "previous_failure_proof",
    ],
    completionCriteria: [
      "User has reinterpreted at least one prior quit attempt",
      "User understands why willpower-based quitting tends to fail",
      "Fear about quitting has reduced",
    ],
    understandingTests: [
      "Why did willpower alone fail you in the past?",
      "If you still believed cigarettes gave you something, what would happen when you tried to resist?",
      "What's different about stopping when you no longer want the cigarette versus stopping while still wanting it?",
    ],
    deferTopics: ["final cigarette specifics"],
    order: 5,
  },
  {
    id: "module_6",
    name: "The Last Cigarette Logic",
    shortName: "Final Prep",
    goal: "Prepare the user for the decisive transition. Surface final blockers.",
    themes: [
      "Why not to quit too early in the program",
      'Why "just one" matters',
      "Why waiting forever is another trap",
      "Final identity shift: becoming a non-smoker",
      "There is nothing to fear",
    ],
    targetBeliefs: [
      "one_more_wont_hurt",
      "not_ready_yet",
      "fear_of_finality",
      "identity_as_smoker",
    ],
    completionCriteria: [
      "User has engaged with final blocker questions",
      "Readiness assessment shows sufficient understanding",
      "User expresses willingness or readiness for the final step",
    ],
    understandingTests: [
      "Why would having 'just one more' cigarette after quitting be dangerous?",
      "What are you actually afraid of about this being the last one?",
      "Are you a smoker who is quitting, or a non-smoker who has been freed?",
    ],
    deferTopics: [],
    order: 6,
  },
  {
    id: "module_7",
    name: "Final Ritual",
    shortName: "Ritual",
    goal: "Mark the deliberate end. The last cigarette is smoked with awareness, not grief.",
    themes: [
      "Final cigarette reflection",
      "Explicit meaning-making",
      "Statement of release",
      "Ritual confirmation",
      "You are now a non-smoker",
    ],
    targetBeliefs: [],
    completionCriteria: [
      "User has completed the final cigarette ritual",
      "User has made a statement of release",
      "Ritual confirmation recorded",
    ],
    understandingTests: [],
    deferTopics: [],
    order: 7,
  },
  {
    id: "module_8",
    name: "Freedom",
    shortName: "Freedom",
    goal: "Minimal post-program layer. Summary of what was learned. Path to restart if needed.",
    themes: [
      "Summary of the journey",
      "Top relapse rationalizations to watch for",
      "You are free, not deprived",
      "Restart path if needed",
    ],
    targetBeliefs: [],
    completionCriteria: ["User has reviewed their summary"],
    understandingTests: [],
    deferTopics: [],
    order: 8,
  },
];

export function getModule(moduleId: string): ModuleDefinition | undefined {
  return MODULES.find((m) => m.id === moduleId);
}

export function getNextModule(
  currentModuleId: string
): ModuleDefinition | undefined {
  const current = MODULES.find((m) => m.id === currentModuleId);
  if (!current) return undefined;
  return MODULES.find((m) => m.order === current.order + 1);
}

export function isRitualModule(moduleId: string): boolean {
  return moduleId === "module_7";
}

export function isPostProgram(moduleId: string): boolean {
  return moduleId === "module_8";
}
