import { readFileSync } from "node:fs";

// Datos estructurados (SEO local). Se generan a partir de "Configuración > Datos de la clínica".
export default function () {
  const c = JSON.parse(readFileSync(new URL("./clinica.json", import.meta.url), "utf8"));
  const base = (c.url_sitio || "").replace(/\/$/, "");
  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    "@id": `${base}/#clinica`,
    name: c.nombre,
    url: base + "/",
    description: c.descripcion_seo,
    telephone: (c.telefonos || []).map((t) => `${c.prefijo_pais} ${t}`),
    address: {
      "@type": "PostalAddress",
      streetAddress: c.direccion,
      addressLocality: c.ciudad,
      addressRegion: c.region,
      addressCountry: c.pais,
    },
    openingHoursSpecification: (c.horarios || []).filter((h) => (h.schema_dias || []).length && /^\d{2}:\d{2}$/.test(h.abre || "") && /^\d{2}:\d{2}$/.test(h.cierra || "")).map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.schema_dias,
      opens: h.abre,
      closes: h.cierra,
    })),
    sameAs: c.instagram ? [`https://www.instagram.com/${c.instagram}/`] : [],
    areaServed: { "@type": "Country", name: "Panamá" },
    medicalSpecialty: ["PrimaryCare", "Dentistry", "Psychiatric", "Orthopedic", "DietNutrition"],
    availableService: [
      "Laboratorio clínico",
      "Ultrasonido",
      "Electrocardiograma",
      "Salud ocupacional y evaluaciones médicas laborales",
    ].map((name) => ({ "@type": "MedicalProcedure", name })),
  };
  if (c.logo) schema.logo = base + c.logo;
  if (c.latitud && c.longitud) {
    schema.geo = { "@type": "GeoCoordinates", latitude: Number(c.latitud), longitude: Number(c.longitud) };
  }
  return schema;
}
