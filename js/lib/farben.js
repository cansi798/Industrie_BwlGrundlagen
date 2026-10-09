// Farbton (HSL-Hue) je Tag: Teil 1 grün/blau/türkis, Teil 2 violett/rot.
// Benachbarte Tage liegen weit auseinander, damit sie sich klar abheben.
const HUE = {
  1: 160, 2: 205, 3: 135, 4: 228, 5: 180, 6: 248, 7: 150, 8: 195, 9: 118, 10: 215,
  11: 272, 12: 332, 13: 296, 14: 356, 15: 312,
};

export function tagHue(nr) {
  return HUE[nr] ?? 200;
}

/** style-Attribut, das die Tagesfarbe als CSS-Variable setzt. */
export function tagStyle(nr) {
  return `--h:${tagHue(nr)}`;
}

/** "tag07" → 7 */
export function tagNr(tagId) {
  return Number(String(tagId).replace(/\D/g, "")) || 0;
}
