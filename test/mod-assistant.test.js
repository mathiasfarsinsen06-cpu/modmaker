import test from "node:test";
import assert from "node:assert/strict";
import {
  askModdingAssistant,
  collectResearch,
  runCommand,
  validateDocumentationUrl,
  verifyMod,
} from "../src/mod-assistant.js";

test("accepts only supported HTTPS documentation URLs", () => {
  assert.equal(validateDocumentationUrl("https://docs.fabricmc.net/develop/").hostname, "docs.fabricmc.net");
  assert.throws(() => validateDocumentationUrl("http://docs.fabricmc.net/develop/"), /Only HTTPS/);
  assert.throws(() => validateDocumentationUrl("https://example.com/"), /Only HTTPS/);
});

test("collects readable text from validated documentation", async () => {
  const result = await collectResearch(["https://docs.fabricmc.net/develop/"], async () => ({
    ok: true,
    text: async () => "<h1>Fabric</h1><script>secret()</script><p>Guide</p>",
  }));

  assert.deepEqual(result, [{ url: "https://docs.fabricmc.net/develop/", content: "Fabric Guide" }]);
});

test("runs configured verification commands without a shell", async () => {
  const pass = await runCommand([process.execPath, "-e", "console.log('ok')"], process.cwd());
  const fail = await verifyMod({ buildCommand: [process.execPath, "-e", "process.exit(1)"] }, process.cwd());

  assert.equal(pass.passed, true);
  assert.match(pass.output, /ok/);
  assert.equal(fail.build.passed, false);
  assert.equal(fail.client, undefined);
});

test("sends research to an AI endpoint and returns its answer", async () => {
  let request;
  const answer = await askModdingAssistant("How do I register an item?", [{ url: "https://docs.fabricmc.net/", content: "Registry guide" }], {
    endpoint: "https://ai.example.test/v1/chat",
    apiKey: "test-key",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ choices: [{ message: { content: "Use a registry." } }] }) };
    },
  });

  assert.equal(answer, "Use a registry.");
  assert.equal(request.options.headers.authorization, ["Bearer", "test-key"].join(" "));
  assert.match(request.options.body, /Registry guide/);
});
