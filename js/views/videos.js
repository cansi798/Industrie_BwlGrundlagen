import { h, topbar } from "../lib/dom.js";
import { loadVideos } from "../lib/data.js";

// Videozusammenfassungen: Liste mit eingebettetem Player.
export async function render(root) {
  const v = await loadVideos();
  root.append(
    topbar(v.titel, "#/"),
    h("div", { class: "page" },
      h("p", { class: "muted intro" }, v.untertitel),
      ...v.videos.map((x) => h("article", { class: "card video-karte" },
        h("video", { class: "video", controls: true, preload: "metadata", playsinline: true, poster: x.bild, src: x.datei },
          "Dein Browser kann dieses Video nicht abspielen."),
        h("div", { class: "video-info" },
          h("p", { class: "video-meta" }, [x.tage, x.dauer].filter(Boolean).join(" · ")),
          h("h2", {}, x.titel),
          h("p", { class: "muted" }, x.beschreibung))))));
}
