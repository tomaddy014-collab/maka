#!/usr/bin/env node
/**
 * Builds the offline card database that Battle Desk searches.
 *
 * Three public sources, all cloned locally first:
 *
 *   node scripts/build-card-data.js <pokemon-tcg-data> <PokeAPI/sprites> <PokeAPI/pokeapi>
 *
 *   1. github.com/PokemonTCG/pokemon-tcg-data  — the card text (HP, attacks…)
 *   2. github.com/PokeAPI/sprites              — the pixel sprites
 *   3. github.com/PokeAPI/pokeapi              — the species name → number list
 *
 * Everything is written straight into pokemon-battle-tracker.html between the
 * CARD-DATA markers, so the page stays a single self-contained file that works
 * from a USB stick with no network.
 *
 * Only what a battle needs is kept — name, HP, types, attacks and their printed
 * damage, weakness, resistance, retreat cost — so ~26 MB of source JSON comes
 * out around a tenth of the size. Card images are left out on purpose: they are
 * the bulk of the data and they are not ours to redistribute. The 96px sprites
 * are small enough to embed (~1 MB for all 1,025 species) and are what the page
 * animates when a card is played.
 */

const fs = require("fs");
const path = require("path");

const SRC = process.argv[2];
const SPRITES = process.argv[3];
const POKEAPI = process.argv[4];
const OUT = path.join(__dirname, "..", "pokemon-battle-tracker.html");

if (!SRC || !fs.existsSync(path.join(SRC, "cards", "en"))) {
  console.error("usage: node scripts/build-card-data.js <pokemon-tcg-data> <sprites> <pokeapi>");
  process.exit(1);
}

/* Energy types compress to the single letters the cards themselves use. */
const ENERGY = {
  Colorless:"C", Darkness:"D", Dragon:"N", Fairy:"Y", Fighting:"F", Fire:"R",
  Grass:"G", Lightning:"L", Metal:"M", Psychic:"P", Water:"W"
};
const code = t => ENERGY[t] || "C";

/* ---- sets ---- */
const setsRaw = JSON.parse(fs.readFileSync(path.join(SRC, "sets", "en.json"), "utf8"));
const setIndex = {};
const sets = setsRaw.map((s, i) => {
  setIndex[s.id] = i;
  return [s.name, (s.releaseDate || "").slice(0, 4)];
});

/* ---- cards ---- */
const cardsDir = path.join(SRC, "cards", "en");
const byKey = new Map();
let seen = 0;

for (const file of fs.readdirSync(cardsDir).sort()) {
  if (!file.endsWith(".json")) continue;
  const setId = file.replace(/\.json$/, "");
  if (!(setId in setIndex)) continue;

  for (const c of JSON.parse(fs.readFileSync(path.join(cardsDir, file), "utf8"))) {
    if (c.supertype !== "Pokémon") continue;
    const hp = parseInt(c.hp, 10);
    if (!hp) continue;
    seen++;

    const attacks = (c.attacks || []).map(a => [
      a.name || "",
      (a.damage || "").trim(),
      (a.cost || []).map(code).join("")
    ]);
    const weak = (c.weaknesses || []).map(w => code(w.type) + (w.value || "")).join(" ");
    const resist = (c.resistances || []).map(r => code(r.type) + (r.value || "")).join(" ");

    /* Reprints with an identical stat line collapse into one search result that
       lists every printing, so students still find their exact card. */
    const key = JSON.stringify([c.name, hp, (c.types || []).map(code).join(""), attacks, weak, resist, c.convertedRetreatCost || 0]);
    let entry = byKey.get(key);
    if (!entry) {
      entry = {
        n: c.name,
        h: hp,
        t: (c.types || []).map(code).join(""),
        a: attacks,
        w: weak,
        r: resist,
        c: c.convertedRetreatCost || 0,
        p: []
      };
      byKey.set(key, entry);
    }
    if (entry.p.length < 6) entry.p.push([setIndex[setId], c.number]);
  }
}

const cards = [...byKey.values()]
  .sort((a, b) => a.n.localeCompare(b.n) || a.h - b.h)
  .map(e => [e.n, e.h, e.t, e.a, e.w, e.r, e.c, e.p]);

/* ---- species names and sprites ----
   The page resolves a sprite from whatever name is on screen, so a hand-typed
   "Pikachu" gets a sprite too, not just a card picked from the search. */
const species = {};
const sprites = {};
let spriteBytes = 0;

if (POKEAPI && SPRITES) {
  const csv = fs.readFileSync(path.join(POKEAPI, "data/v2/csv/pokemon_species.csv"), "utf8");
  const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

  for (const line of csv.trim().split("\n").slice(1)) {
    const [id, identifier] = line.split(",");
    const n = parseInt(id, 10);
    if (!n || n > 1025) continue;
    species[norm(identifier)] = n;

    const file = path.join(SPRITES, "sprites/pokemon", n + ".png");
    if (fs.existsSync(file)) {
      const buf = fs.readFileSync(file);
      spriteBytes += buf.length;
      sprites[n] = buf.toString("base64");
    }
  }
}

const payload = JSON.stringify({ s: sets, c: cards, sp: species, im: sprites });

/* ---- splice into the page ---- */
const START = "/*CARD-DATA-START*/";
const END = "/*CARD-DATA-END*/";
const html = fs.readFileSync(OUT, "utf8");
const i = html.indexOf(START), j = html.indexOf(END);
if (i < 0 || j < 0) {
  console.error("Could not find the CARD-DATA markers in " + OUT);
  process.exit(1);
}
fs.writeFileSync(OUT, html.slice(0, i + START.length) + "\nvar CARD_DB = " + payload + ";\n" + html.slice(j));

console.log(
  "cards read:   " + seen + "\n" +
  "stat lines:   " + cards.length + "\n" +
  "sets:         " + sets.length + "\n" +
  "species:      " + Object.keys(species).length + "\n" +
  "sprites:      " + Object.keys(sprites).length + " (" + (spriteBytes / 1048576).toFixed(2) + " MB raw)\n" +
  "data size:    " + (payload.length / 1048576).toFixed(2) + " MB"
);
