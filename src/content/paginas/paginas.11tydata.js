// Páginas creadas desde el panel: se publican en /<nombre-del-archivo>/
// Para mostrarlas en el menú, agréguelas en "Configuración > Menú de navegación".
export default {
  layout: "layouts/page.njk",
  eleventyComputed: {
    permalink: (d) => (d.publicado === false ? false : `/${d.page.fileSlug}/`),
  },
};
