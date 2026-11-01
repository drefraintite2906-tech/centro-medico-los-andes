export default {
  layout: "layouts/post.njk",
  eleventyComputed: {
    permalink: (d) => (d.publicado === false ? false : `/blog/${d.page.fileSlug}/`),
  },
};
