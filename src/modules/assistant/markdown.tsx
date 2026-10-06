"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// http(s)/mailto, or a site-relative path. `//host` and `/\host` are excluded:
// browsers read both as protocol-relative, i.e. an off-site link.
const SAFE_HREF = /^(https?:|mailto:|\/(?![/\\]))/i;

export function Markdown({ text }: { text: string }) {
  return (
    <div className="[&_pre]:bg-muted [&_code]:bg-muted text-sm leading-relaxed [&_a]:underline [&_a]:underline-offset-2 [&_code]:rounded [&_code]:px-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:p-2 [&_pre]:text-xs [&_table]:w-full [&_td]:border [&_th]:border [&_ul]:list-disc [&_ul]:pl-5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        // Defense-in-depth allowlist: react-markdown's defaultUrlTransform
        // already strips javascript: — the explicit check below keeps only
        // http(s)/mailto and site-relative links. An href that fails it
        // renders as an anchor with no href (underlined but dead).
        components={{
          a: ({ href, children }) => {
            const safe = href && SAFE_HREF.test(href) ? href : undefined;
            return (
              <a href={safe} target="_blank" rel="noopener noreferrer nofollow">
                {children}
              </a>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
