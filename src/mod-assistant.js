import { spawn } from "node:child_process";

const ALLOWED_DOCUMENTATION_HOSTS = new Set([
  "docs.fabricmc.net",
  "fabricmc.net",
  "docs.minecraftforge.net",
  "developer.minecraft.net",
]);

export function validateDocumentationUrl(value) {
  const url = new URL(value);

  if (url.protocol !== "https:" || !ALLOWED_DOCUMENTATION_HOSTS.has(url.hostname)) {
    throw new Error(`Only HTTPS URLs from supported Minecraft documentation are allowed: ${url.hostname}`);
  }

  return url;
}

function htmlToText(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20_000);
}

export async function collectResearch(urls, fetchImpl = fetch) {
  return Promise.all(
    urls.map(async (value) => {
      const url = validateDocumentationUrl(value);
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(10_000) });

      if (!response.ok) {
        throw new Error(`Could not read ${url}: HTTP ${response.status}`);
      }

      return { url: url.toString(), content: htmlToText(await response.text()) };
    }),
  );
}

export async function askModdingAssistant(question, sources, {
  endpoint = process.env.MODMAKER_AI_URL,
  apiKey = process.env.MODMAKER_AI_KEY,
  fetchImpl = fetch,
} = {}) {
  if (!endpoint || !apiKey) {
    throw new Error("Set MODMAKER_AI_URL and MODMAKER_AI_KEY to use the AI assistant.");
  }

  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      authorization: ["Bearer", apiKey].join(" "),
      "content-type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content: "You are a Minecraft modding expert. Give safe, version-aware implementation advice using only the supplied official documentation.",
        },
        {
          role: "user",
          content: `Question: ${question}\n\nDocumentation:\n${sources.map(({ url, content }) => `Source: ${url}\n${content}`).join("\n\n")}`,
        },
      ],
    }),
  });

  if (!response.ok) throw new Error(`The AI service returned HTTP ${response.status}`);
  const data = await response.json();
  const answer = data.choices?.[0]?.message?.content;
  if (typeof answer !== "string") throw new Error("The AI service returned no answer.");
  return answer;
}

export function runCommand(command, cwd) {
  if (!Array.isArray(command) || command.length === 0 || !command.every((part) => typeof part === "string")) {
    throw new Error("A verification command must be a non-empty array of strings.");
  }

  return new Promise((resolve) => {
    const child = spawn(command[0], command.slice(1), { cwd, shell: false });
    let output = "";

    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", (error) => resolve({ passed: false, output: error.message }));
    child.on("close", (code) => resolve({ passed: code === 0, output, code }));
  });
}

export async function verifyMod(config, cwd) {
  const build = await runCommand(config.buildCommand, cwd);
  if (!build.passed || !config.clientCommand) {
    return { build };
  }

  return { build, client: await runCommand(config.clientCommand, cwd) };
}
