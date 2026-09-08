"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ text }: { text: string }) {
  return (
    <div className="[&_pre]:bg-muted [&_code]:bg-muted text-sm leading-relaxed [&_a]:underline [&_a]:underline-offset-2 [&_code]:rounded [&_code]:px-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:p-2 [&_pre]:text-xs [&_table]:w-full [&_td]:border [&_th]:border [&_ul]:list-disc [&_ul]:pl-5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        // Opportunistic allowlist (Task 13, defense-in-depth:
        // react-markdown's defaultUrlTransform already strips javascript: —
        // verified in node_modules/react-markdown/lib/index.js:124,421-444).
        components={{
          a: ({ href, children }) => {
            const safe =
              href && /^(https?:|mailto:)/i.test(href) ? href : undefined;
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
