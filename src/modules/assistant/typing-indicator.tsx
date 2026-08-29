"use client";

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-6 py-1" role="status" aria-label="Assistant is typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}
