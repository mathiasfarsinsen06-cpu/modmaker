# Modmaker

Et lille CLI-værktøj til Minecraft-modudvikling. Det kan hente vejledning fra
officiel Fabric-, Forge- og Minecraft-dokumentation og køre de build- og
klientkommandoer, som dit modprojekt bruger.

## Brug

```sh
npm test
npx modmaker research https://docs.fabricmc.net/develop/
npx modmaker ask "Hvordan registrerer jeg en blok?" https://docs.fabricmc.net/develop/
cp modmaker.config.example.json modmaker.config.json
npx modmaker verify
```

For `ask` skal du sætte `MODMAKER_AI_URL` og `MODMAKER_AI_KEY` til en
OpenAI-kompatibel chat-endpoint og dens API-nøgle. Værktøjet sender spørgsmålet
og den hentede officielle dokumentation til modellen, så svaret har et
afgrænset, relevant kildemateriale.

`verify` kører først `buildCommand` og kun `clientCommand`, hvis bygningen
består. Konfigurationskommandoer er arrays (ikke shell-strenge), så argumenter
sendes sikkert til Gradle. `runClient` starter Minecraft-klienten; bekræft
selve gameplay-testen i den åbnede klient.

Netværksopslag er bevidst begrænset til HTTPS på de understøttede officielle
dokumentationsdomæner. Det beskytter værktøjet mod at hente vilkårlige interne
eller usikre adresser.
