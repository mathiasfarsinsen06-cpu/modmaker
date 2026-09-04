#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { askModdingAssistant, collectResearch, verifyMod } from "../src/mod-assistant.js";

function usage() {
  console.log(`Usage:
  modmaker research <https://official-doc-url> [...]
  modmaker ask "<question>" <https://official-doc-url> [...]
  modmaker verify [path/to/modmaker.config.json]

Supported documentation hosts: docs.fabricmc.net, fabricmc.net,
docs.minecraftforge.net, developer.minecraft.net`);
}

async function main(args) {
  const [command, ...rest] = args;
  if (command === "research" && rest.length) {
    const sources = await collectResearch(rest);
    for (const source of sources) {
      console.log(`\n## ${source.url}\n${source.content}`);
    }
    return;
  }

  if (command === "ask" && rest.length >= 2) {
    const [question, ...urls] = rest;
    const answer = await askModdingAssistant(question, await collectResearch(urls));
    console.log(answer);
    return;
  }

  if (command === "verify") {
    const configPath = resolve(rest[0] ?? "modmaker.config.json");
    const config = JSON.parse(await readFile(configPath, "utf8"));
    const result = await verifyMod(config, resolve(configPath, ".."));
    console.log(result.build.output);
    if (result.client) console.log(result.client.output);
    if (!result.build.passed || (result.client && !result.client.passed)) process.exitCode = 1;
    return;
  }

  usage();
  process.exitCode = 1;
}

main(process.argv.slice(2)).catch((error) => {
  console.error(`modmaker: ${error.message}`);
  process.exitCode = 1;
});
