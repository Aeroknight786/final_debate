import { getModule, getNextModule, isRitualModule, MODULES } from "../src/lib/modules/definitions";

// Basic module definition tests (no external dependencies)
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`PASS: ${message}`);
}

function runTests() {
  // Test: All modules exist and have sequential order
  assert(MODULES.length === 9, "Should have 9 modules");
  MODULES.forEach((mod, idx) => {
    assert(mod.order === idx, `Module ${mod.id} should have order ${idx}`);
  });

  // Test: getModule returns correct module
  const mod0 = getModule("module_0");
  assert(mod0 !== undefined, "module_0 should exist");
  assert(mod0!.name === "The Challenge", "module_0 should be 'The Challenge'");

  // Test: getNextModule works
  const next = getNextModule("module_0");
  assert(next !== undefined, "module_0 should have a next module");
  assert(next!.id === "module_1", "Next after module_0 should be module_1");

  // Test: Last module has no next
  const lastNext = getNextModule("module_8");
  assert(lastNext === undefined, "module_8 should have no next module");

  // Test: Ritual module detection
  assert(isRitualModule("module_7"), "module_7 should be the ritual module");
  assert(!isRitualModule("module_0"), "module_0 should not be the ritual module");

  // Test: Module 0 has target beliefs
  assert(mod0!.targetBeliefs.length > 0, "module_0 should have target beliefs");

  // Test: Module 7 (ritual) has no target beliefs
  const mod7 = getModule("module_7");
  assert(mod7!.targetBeliefs.length === 0, "Ritual module should have no target beliefs");

  // Test: All non-ritual modules have completion criteria
  MODULES.filter((m) => m.order < 7).forEach((mod) => {
    assert(
      mod.completionCriteria.length > 0,
      `${mod.id} should have completion criteria`
    );
  });

  // Test: All non-ritual modules have at least 2 derivative tests
  // (module-end probes of reasoning change, not surface agreement)
  MODULES.filter((m) => m.order < 7).forEach((mod) => {
    assert(
      mod.derivativeTests.length >= 2,
      `${mod.id} should have >= 2 derivative tests`
    );
  });

  // Test: Ritual module has no derivative tests
  assert(
    mod7!.derivativeTests.length === 0,
    "module_7 (ritual) should have no derivative tests"
  );

  // Test: Stage discipline — early modules defer later topics
  const mod0Defers = mod0!.deferTopics;
  assert(mod0Defers.length > 0, "module_0 should have deferred topics");
  assert(
    mod0Defers.includes("final cigarette planning"),
    "module_0 should defer final cigarette planning"
  );

  console.log("\nAll module definition tests passed.");
}

runTests();
