import { type JsonLdDocument } from "@/common/tools/seo";

/**
 * JSON for a `<script>` block. `<` is escaped so a record containing
 * `</script>` cannot break out of the tag.
 */
export const serializeJsonLd = (data: JsonLdDocument): string =>
  JSON.stringify(data).replaceAll("<", "\\u003c");

/**
 * Emits one `application/ld+json` block from a plain object. A server
 * component, so the markup is in the HTML a crawler receives.
 */
export const JsonLd = ({ data }: { data: JsonLdDocument }) => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
  />
);
