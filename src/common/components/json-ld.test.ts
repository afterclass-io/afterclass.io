import { describe, expect, it } from "vitest";

import { serializeJsonLd } from "./json-ld";

describe("serializeJsonLd", () => {
  it("escapes < so a record cannot close the script tag", () => {
    const name = "</script><script>alert(1)</script>";
    const out = serializeJsonLd({ "@type": "Course", name });

    expect(out).not.toContain("</script>");
    expect(out).toContain("\\u003c/script");
    expect(JSON.parse(out)).toMatchObject({ name });
  });
});
