import markdownIt from "markdown-it";
import { icon } from "./src/_config/icons.js";

const md = markdownIt({ html: false, linkify: true, breaks: true });

// Colecciones administrables desde el panel (cada archivo = un elemento).
const COLECCIONES = [
  "especialidades",
  "laboratorio",
  "procedimientos",
  "ocupacional",
  "promociones",
  "medicos",
  "blog",
  "paginas",
];

const publicado = (item) => item.data.publicado !== false;
const porOrden = (a, b) =>
  (a.data.orden ?? 999) - (b.data.orden ?? 999) ||
  String(a.data.titulo || a.data.nombre || "").localeCompare(String(b.data.titulo || b.data.nombre || ""), "es");

const aFecha = (v) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v).length <= 10 ? `${v}T00:00:00` : v);
  return isNaN(d) ? null : d;
};
const isoDia = (v) => {
  const d = aFecha(v);
  return d ? d.toISOString().slice(0, 10) : "";
};
const hoyISO = () => new Date().toISOString().slice(0, 10);

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/admin/config.yml": "admin/config.yml" });
  eleventyConfig.addPassthroughCopy({ "src/admin/index.html": "admin/index.html" });
  eleventyConfig.addPassthroughCopy({ "src/assets/img/favicon.svg": "favicon.svg" });
  eleventyConfig.ignores.add("src/admin/**");
  eleventyConfig.addWatchTarget("src/assets/");

  for (const nombre of COLECCIONES) {
    eleventyConfig.addCollection(nombre, (api) =>
      api.getFilteredByGlob(`src/content/${nombre}/*.md`).filter(publicado).sort(porOrden)
    );
  }
  // Blog ordenado por fecha descendente
  eleventyConfig.addCollection("articulos", (api) =>
    api
      .getFilteredByGlob("src/content/blog/*.md")
      .filter(publicado)
      .sort((a, b) => b.date - a.date)
  );

  // ---------- Shortcodes ----------
  eleventyConfig.addShortcode("icon", (name, cls) => icon(name, cls));
  eleventyConfig.addShortcode("anio", () => String(new Date().getFullYear()));

  // ---------- Filtros ----------
  eleventyConfig.addFilter("md", (s) => (s ? md.render(String(s)) : ""));
  eleventyConfig.addFilter("mdInline", (s) => (s ? md.renderInline(String(s)) : ""));
  eleventyConfig.addFilter("json", (v) => JSON.stringify(v ?? null));
  eleventyConfig.addFilter("enc", (s) => encodeURIComponent(String(s ?? "")));
  eleventyConfig.addFilter("tel", (s) => "tel:" + String(s || "").replace(/[^\d+]/g, ""));
  eleventyConfig.addFilter("wa", (numero, texto) =>
    `https://wa.me/${String(numero || "").replace(/\D/g, "")}${texto ? "?text=" + encodeURIComponent(texto) : ""}`
  );
  eleventyConfig.addFilter("porGrupo", (items, grupo) => (items || []).filter((i) => i.data.grupo === grupo));
  eleventyConfig.addFilter("destacadas", (items) => (items || []).filter((i) => i.data.destacada));
  eleventyConfig.addFilter("limite", (arr, n) => (arr || []).slice(0, n));
  eleventyConfig.addFilter("isoDia", isoDia);
  eleventyConfig.addFilter("faqSchema", (items) =>
    JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: (items || []).map((f) => ({
        "@type": "Question",
        name: f.pregunta,
        acceptedAnswer: { "@type": "Answer", text: f.respuesta },
      })),
    }).replace(/</g, "\\u003c")
  );
  eleventyConfig.addFilter("fechaLarga", (v) => {
    const d = aFecha(v);
    return d
      ? d.toLocaleDateString("es-PA", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
      : "";
  });
  // Promociones vigentes al momento de la publicación (el navegador vuelve a verificar con main.js)
  eleventyConfig.addFilter("vigentes", (items) => {
    const hoy = hoyISO();
    return (items || []).filter((i) => {
      const hasta = isoDia(i.data.vigencia_hasta);
      const desde = isoDia(i.data.vigencia_desde);
      return (!hasta || hasta >= hoy) && (!desde || desde <= hoy);
    });
  });
  eleventyConfig.addFilter("activo", (pageUrl, url) => {
    if (!pageUrl || !url) return false;
    if (url === "/") return pageUrl === "/";
    return pageUrl.startsWith(url.split("#")[0]) && url.split("#")[0] !== "/";
  });
  eleventyConfig.addFilter("absUrl", (path, base) => {
    try {
      return new URL(path || "/", base).href;
    } catch {
      return path;
    }
  });

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md"],
  };
}
