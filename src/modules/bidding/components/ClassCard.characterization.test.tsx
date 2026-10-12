// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => null,
  useRouter: () => ({ push: vi.fn() }),
}));

// ProgressLink needs the progress context.
vi.mock("@/common/providers/ProgressProvider", () => ({
  useProgress: () => ({ start: vi.fn(), done: vi.fn() }),
}));

import { ClassCard } from "./ClassCard";

const course = { code: "CS101", name: "Introduction to Computer Science" };
const professor = { name: "Dr. Jane Doe", slug: "jane-doe" };
const examDate = new Date("2025-12-15T00:00:00Z");

describe("ClassCard venue rows (characterization)", () => {
  it("shows class and exam venues and hides TBA venues", () => {
    const { container } = render(
      <ClassCard
        course={course}
        section="T01"
        classId="12345"
        professor={professor}
        classTiming={[
          {
            dayOfWeek: "MON",
            startTime: "10:00",
            endTime: "12:00",
            venue: "COM1-201",
          },
          {
            dayOfWeek: "WED",
            startTime: "10:00",
            endTime: "12:00",
            venue: "TBA",
          },
        ]}
        examTiming={[
          {
            date: examDate,
            dayOfWeek: "MON",
            startTime: "09:00",
            endTime: "12:00",
            venue: "COM1-202",
          },
        ]}
      />,
    );
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<a class="md:text-base transition-all disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg:not([class*='size-'])]:size-4 shrink-0 [&amp;_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive shadow-xs hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 has-[>svg]:px-3 hover:bg-secondary focus-ring bg-card flex h-auto w-64 cursor-pointer flex-col items-start justify-start gap-2 rounded-md border p-4 text-left font-normal whitespace-normal md:gap-4" data-umami-event="boss-bid-class-select" data-umami-event-class-id="12345" data-umami-event-prof-slug="jane-doe" href="/bidding/analytics?course=CS101&amp;section=T01&amp;classId=12345"><div class="flex w-full flex-col items-start gap-1"><div class="flex items-center gap-2"><h1 class="font-sans font-semibold text-primary text-xl tracking-tight">CS101</h1><div class="inline-flex items-center select-none appearance-none rounded-md font-medium text-sm transition-[background-color] data-[clickable=true]:cursor-pointer h-6 [&amp;>.label]:px-2 [&amp;>.start-icon]:size-5 [&amp;>.start-icon>span]:size-5 [&amp;>.start-icon>svg]:size-5 [&amp;>.start-icon]:ml-0.5 [&amp;>.start-icon]:-mr-1 [&amp;>.deletable]:mr-0.5 [&amp;>.deletable]:-ml-1 text-primary bg-primary/15 data-[clickable=true]:hover:bg-primary/35" data-clickable="false"><div class="label align-middle">T01</div></div></div><h1 class="text-accent-foreground font-sans w-full font-bold tracking-tight whitespace-normal">Introduction to Computer Science</h1><div class="flex items-center gap-2"><svg height="24" role="presentation" viewBox="0 0 20 20" width="24" xmlns="http://www.w3.org/2000/svg" fill="none" class="shrink-0"><path d="M13.3331 7.77783H6.66645C6.66645 7.77783 3.88867 11.1112 3.88867 13.3334C3.88867 15.5556 9.99978 19.4445 9.99978 19.4445C9.99978 19.4445 16.1109 15.5556 16.1109 13.3334C16.1109 11.1112 13.3331 7.77783 13.3331 7.77783Z" fill="#5039D4"></path><path d="M10.9111 0.711058C10.4106 0.319947 9.59057 0.319947 9.09002 0.711058L0.910573 7.09772C0.410017 7.48884 0.410017 8.12884 0.910573 8.51995L9.08946 14.9061C9.59057 15.2972 10.41 15.2972 10.9106 14.9061L19.0895 8.51995C19.5906 8.12884 19.5906 7.48884 19.0895 7.09772L10.9111 0.711058Z" fill="#292F33"></path><path d="M10.9111 0.711058C10.4106 0.319947 9.59057 0.319947 9.09002 0.711058L0.910573 7.09772C0.410017 7.48884 0.410017 8.12884 0.910573 8.51995L9.08946 14.9061C9.59002 15.2972 10.41 15.2972 10.9106 14.9061L19.09 8.51995C19.5906 8.12884 19.5906 7.48884 19.09 7.09772L10.9111 0.711058Z" fill="#394146"></path><path d="M4.44461 13.8889C4.44461 13.8889 3.3335 15 3.3335 15.5556V18.8889C3.3335 18.8889 3.3335 20 4.44461 20C5.55572 20 5.55572 18.8889 5.55572 18.8889V15.5556C5.55572 15 4.44461 13.8889 4.44461 13.8889Z" fill="#FCAB40"></path><path d="M4.4445 16.1112C5.36497 16.1112 6.11117 15.365 6.11117 14.4445C6.11117 13.524 5.36497 12.7778 4.4445 12.7778C3.52402 12.7778 2.77783 13.524 2.77783 14.4445C2.77783 15.365 3.52402 16.1112 4.4445 16.1112Z" fill="#FDD888"></path><path d="M4.44484 15C4.2975 15 4.15619 14.9414 4.05201 14.8373C3.94782 14.7331 3.88929 14.5918 3.88929 14.4444V12.2455C3.86595 11.8933 3.99318 11.1144 4.62095 10.6433L9.63318 6.24887C9.74433 6.15431 9.88822 6.10728 10.0338 6.11794C10.1793 6.12861 10.3148 6.19611 10.411 6.30586C10.5072 6.41561 10.5563 6.5588 10.5478 6.70448C10.5392 6.85017 10.4737 6.98664 10.3654 7.08442L5.32095 11.5055C4.9854 11.7589 4.99984 12.2122 4.99984 12.2166L5.00095 14.4444C5.00095 14.5174 4.98657 14.5897 4.95861 14.6572C4.93066 14.7246 4.88969 14.7859 4.83804 14.8375C4.78639 14.889 4.72508 14.93 4.65761 14.9578C4.59015 14.9857 4.51785 15 4.44484 15Z" fill="#FCAB40"></path><path d="M10.0002 8.889C10.9206 8.889 11.6668 8.14281 11.6668 7.22233C11.6668 6.30186 10.9206 5.55566 10.0002 5.55566C9.07969 5.55566 8.3335 6.30186 8.3335 7.22233C8.3335 8.14281 9.07969 8.889 10.0002 8.889Z" fill="#31373D"></path></svg><span class="w-full tracking-tight whitespace-normal">Dr. Jane Doe</span></div></div><div class="flex flex-col gap-2"><div><div class="flex items-center gap-1"><svg height="16" role="presentation" viewBox="0 0 24 24" width="16" xmlns="http://www.w3.org/2000/svg" fill="none" class="mr-1"><path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"></path></svg><span class="max-w-16 text-sm">MON</span><span class="text-sm">10:00-12:00</span></div><div class="flex items-center gap-1"><svg height="16" role="presentation" viewBox="0 0 36 36" width="16" xmlns="http://www.w3.org/2000/svg" fill="none" class="mr-1"><ellipse cx="18" cy="34.5" fill="#292f33" rx="4" ry="1.5"></ellipse><path fill="#99aab5" d="M14.339 10.725S16.894 34.998 18.001 35s3.66-24.275 3.66-24.275z"></path><circle cx="18" cy="8" r="8" fill="#dd2e44"></circle></svg><span class="text-muted-foreground text-xs">COM1-201</span></div></div><span class="text-muted-foreground pl-6 text-xs">+1 more session</span></div><div class="flex flex-col gap-2"><div><div class="flex items-center gap-1"><svg height="16" role="presentation" viewBox="0 0 36 36" width="16" xmlns="http://www.w3.org/2000/svg" fill="none" class="mr-1"><path fill="#ccd6dd" d="M31 32a4 4 0 0 1-4 4H5a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4h22a4 4 0 0 1 4 4z"></path><path fill="#99aab5" d="M27 24a1 1 0 0 1-1 1H6a1 1 0 1 1 0-2h20a1 1 0 0 1 1 1m-16 4a1 1 0 0 1-1 1H6a1 1 0 1 1 0-2h4a1 1 0 0 1 1 1M27 8a1 1 0 0 1-1 1H6a1 1 0 0 1 0-2h20a1 1 0 0 1 1 1m0 4a1 1 0 0 1-1 1H6a1 1 0 1 1 0-2h20a1 1 0 0 1 1 1m0 4a1 1 0 0 1-1 1H6a1 1 0 1 1 0-2h20a1 1 0 0 1 1 1m0 4a1 1 0 0 1-1 1H6a1 1 0 1 1 0-2h20a1 1 0 0 1 1 1"></path><path fill="#66757f" d="M31 6.272c-.827-.535-1.837-.579-2.521-.023l-.792.646l-1.484 1.211l-.1.08l-2.376 1.938l-11.878 9.686c-.437.357-.793 1.219-1.173 2.074c-.378.85-.969 2.852-1.443 4.391c-.148.25-1.065 1.846-.551 2.453c.52.615 2.326.01 2.568-.076c1.626-.174 3.731-.373 4.648-.58c.924-.211 1.854-.395 2.291-.752c.008-.006.01-.018.017-.023l11.858-9.666l.792-.646l.144-.118z"></path><path fill="#d99e82" d="M18.145 22.526s-1.274-1.881-2.117-2.553c-.672-.843-2.549-2.116-2.549-2.116c-.448-.446-1.191-.48-1.629-.043c-.437.438-.793 1.366-1.173 2.291c-.472 1.146-1.276 4.154-1.768 5.752c-.083.272.517-.45.503-.21c-.01.187.027.394.074.581l-.146.159l.208.067l.068.21l.159-.146c.187.047.394.084.58.074c.24-.014-.483.587-.21.503c1.598-.493 4.607-1.296 5.752-1.768c.924-.381 1.854-.736 2.291-1.174c.439-.435.406-1.178-.043-1.627"></path><path fill="#ea596e" d="M25.312 4.351a2.24 2.24 0 0 0 0 3.168l3.167 3.168a2.24 2.24 0 0 0 3.168 0l3.169-3.168a2.24 2.24 0 0 0 0-3.168l-3.169-3.168a2.24 2.24 0 0 0-3.168 0z"></path><path fill="#ffcc4d" d="m11.849 17.815l3.17 3.17l3.165 3.166l11.881-11.879l-6.337-6.336z"></path><path fill="#292f33" d="M11.298 26.742s-2.06 1.133-2.616.576c-.557-.558.581-2.611.581-2.611s1.951.036 2.035 2.035"></path><path fill="#ccd6dd" d="m23.728 5.935l3.96-3.96l6.336 6.337l-3.96 3.96z"></path><path fill="#99aab5" d="m26.103 3.558l.792-.792l6.336 6.335l-.792.792zM24.52 5.142l.791-.791l6.336 6.335l-.792.792z"></path></svg><span class="text-sm">15 Dec 2025<br>MON&nbsp;09:00-12:00</span></div><div class="flex items-center gap-1"><svg height="16" role="presentation" viewBox="0 0 36 36" width="16" xmlns="http://www.w3.org/2000/svg" fill="none" class="mr-1"><ellipse cx="18" cy="34.5" fill="#292f33" rx="4" ry="1.5"></ellipse><path fill="#99aab5" d="M14.339 10.725S16.894 34.998 18.001 35s3.66-24.275 3.66-24.275z"></path><circle cx="18" cy="8" r="8" fill="#dd2e44"></circle></svg><span class="text-muted-foreground text-xs">COM1-202</span></div></div></div></a>"`,
    );
  });

  it("omits the venue row when the exam venue is null or empty", () => {
    const { container } = render(
      <ClassCard
        course={course}
        section="T01"
        classId="12345"
        professor={null}
        classTiming={[
          {
            dayOfWeek: "TUE",
            startTime: "14:00",
            endTime: "16:00",
            venue: null,
          },
        ]}
        examTiming={[
          {
            date: examDate,
            dayOfWeek: "MON",
            startTime: "09:00",
            endTime: "12:00",
            venue: null,
          },
          {
            date: examDate,
            dayOfWeek: "MON",
            startTime: "13:00",
            endTime: "15:00",
            venue: "",
          },
        ]}
      />,
    );
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<a class="md:text-base transition-all disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg:not([class*='size-'])]:size-4 shrink-0 [&amp;_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive shadow-xs hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 has-[>svg]:px-3 hover:bg-secondary focus-ring bg-card flex h-auto w-64 cursor-pointer flex-col items-start justify-start gap-2 rounded-md border p-4 text-left font-normal whitespace-normal md:gap-4" data-umami-event="boss-bid-class-select" data-umami-event-class-id="12345" href="/bidding/analytics?course=CS101&amp;section=T01&amp;classId=12345"><div class="flex w-full flex-col items-start gap-1"><div class="flex items-center gap-2"><h1 class="font-sans font-semibold text-primary text-xl tracking-tight">CS101</h1><div class="inline-flex items-center select-none appearance-none rounded-md font-medium text-sm transition-[background-color] data-[clickable=true]:cursor-pointer h-6 [&amp;>.label]:px-2 [&amp;>.start-icon]:size-5 [&amp;>.start-icon>span]:size-5 [&amp;>.start-icon>svg]:size-5 [&amp;>.start-icon]:ml-0.5 [&amp;>.start-icon]:-mr-1 [&amp;>.deletable]:mr-0.5 [&amp;>.deletable]:-ml-1 text-primary bg-primary/15 data-[clickable=true]:hover:bg-primary/35" data-clickable="false"><div class="label align-middle">T01</div></div></div><h1 class="text-accent-foreground font-sans w-full font-bold tracking-tight whitespace-normal">Introduction to Computer Science</h1><div class="flex items-center gap-2"><svg height="24" role="presentation" viewBox="0 0 20 20" width="24" xmlns="http://www.w3.org/2000/svg" fill="none" class="shrink-0"><path d="M13.3331 7.77783H6.66645C6.66645 7.77783 3.88867 11.1112 3.88867 13.3334C3.88867 15.5556 9.99978 19.4445 9.99978 19.4445C9.99978 19.4445 16.1109 15.5556 16.1109 13.3334C16.1109 11.1112 13.3331 7.77783 13.3331 7.77783Z" fill="#5039D4"></path><path d="M10.9111 0.711058C10.4106 0.319947 9.59057 0.319947 9.09002 0.711058L0.910573 7.09772C0.410017 7.48884 0.410017 8.12884 0.910573 8.51995L9.08946 14.9061C9.59057 15.2972 10.41 15.2972 10.9106 14.9061L19.0895 8.51995C19.5906 8.12884 19.5906 7.48884 19.0895 7.09772L10.9111 0.711058Z" fill="#292F33"></path><path d="M10.9111 0.711058C10.4106 0.319947 9.59057 0.319947 9.09002 0.711058L0.910573 7.09772C0.410017 7.48884 0.410017 8.12884 0.910573 8.51995L9.08946 14.9061C9.59002 15.2972 10.41 15.2972 10.9106 14.9061L19.09 8.51995C19.5906 8.12884 19.5906 7.48884 19.09 7.09772L10.9111 0.711058Z" fill="#394146"></path><path d="M4.44461 13.8889C4.44461 13.8889 3.3335 15 3.3335 15.5556V18.8889C3.3335 18.8889 3.3335 20 4.44461 20C5.55572 20 5.55572 18.8889 5.55572 18.8889V15.5556C5.55572 15 4.44461 13.8889 4.44461 13.8889Z" fill="#FCAB40"></path><path d="M4.4445 16.1112C5.36497 16.1112 6.11117 15.365 6.11117 14.4445C6.11117 13.524 5.36497 12.7778 4.4445 12.7778C3.52402 12.7778 2.77783 13.524 2.77783 14.4445C2.77783 15.365 3.52402 16.1112 4.4445 16.1112Z" fill="#FDD888"></path><path d="M4.44484 15C4.2975 15 4.15619 14.9414 4.05201 14.8373C3.94782 14.7331 3.88929 14.5918 3.88929 14.4444V12.2455C3.86595 11.8933 3.99318 11.1144 4.62095 10.6433L9.63318 6.24887C9.74433 6.15431 9.88822 6.10728 10.0338 6.11794C10.1793 6.12861 10.3148 6.19611 10.411 6.30586C10.5072 6.41561 10.5563 6.5588 10.5478 6.70448C10.5392 6.85017 10.4737 6.98664 10.3654 7.08442L5.32095 11.5055C4.9854 11.7589 4.99984 12.2122 4.99984 12.2166L5.00095 14.4444C5.00095 14.5174 4.98657 14.5897 4.95861 14.6572C4.93066 14.7246 4.88969 14.7859 4.83804 14.8375C4.78639 14.889 4.72508 14.93 4.65761 14.9578C4.59015 14.9857 4.51785 15 4.44484 15Z" fill="#FCAB40"></path><path d="M10.0002 8.889C10.9206 8.889 11.6668 8.14281 11.6668 7.22233C11.6668 6.30186 10.9206 5.55566 10.0002 5.55566C9.07969 5.55566 8.3335 6.30186 8.3335 7.22233C8.3335 8.14281 9.07969 8.889 10.0002 8.889Z" fill="#31373D"></path></svg><span class="w-full tracking-tight whitespace-normal">TBA</span></div></div><div class="flex flex-col gap-2"><div><div class="flex items-center gap-1"><svg height="16" role="presentation" viewBox="0 0 24 24" width="16" xmlns="http://www.w3.org/2000/svg" fill="none" class="mr-1"><path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"></path></svg><span class="max-w-16 text-sm">TUE</span><span class="text-sm">14:00-16:00</span></div></div></div><div class="flex flex-col gap-2"><div><div class="flex items-center gap-1"><svg height="16" role="presentation" viewBox="0 0 36 36" width="16" xmlns="http://www.w3.org/2000/svg" fill="none" class="mr-1"><path fill="#ccd6dd" d="M31 32a4 4 0 0 1-4 4H5a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4h22a4 4 0 0 1 4 4z"></path><path fill="#99aab5" d="M27 24a1 1 0 0 1-1 1H6a1 1 0 1 1 0-2h20a1 1 0 0 1 1 1m-16 4a1 1 0 0 1-1 1H6a1 1 0 1 1 0-2h4a1 1 0 0 1 1 1M27 8a1 1 0 0 1-1 1H6a1 1 0 0 1 0-2h20a1 1 0 0 1 1 1m0 4a1 1 0 0 1-1 1H6a1 1 0 1 1 0-2h20a1 1 0 0 1 1 1m0 4a1 1 0 0 1-1 1H6a1 1 0 1 1 0-2h20a1 1 0 0 1 1 1m0 4a1 1 0 0 1-1 1H6a1 1 0 1 1 0-2h20a1 1 0 0 1 1 1"></path><path fill="#66757f" d="M31 6.272c-.827-.535-1.837-.579-2.521-.023l-.792.646l-1.484 1.211l-.1.08l-2.376 1.938l-11.878 9.686c-.437.357-.793 1.219-1.173 2.074c-.378.85-.969 2.852-1.443 4.391c-.148.25-1.065 1.846-.551 2.453c.52.615 2.326.01 2.568-.076c1.626-.174 3.731-.373 4.648-.58c.924-.211 1.854-.395 2.291-.752c.008-.006.01-.018.017-.023l11.858-9.666l.792-.646l.144-.118z"></path><path fill="#d99e82" d="M18.145 22.526s-1.274-1.881-2.117-2.553c-.672-.843-2.549-2.116-2.549-2.116c-.448-.446-1.191-.48-1.629-.043c-.437.438-.793 1.366-1.173 2.291c-.472 1.146-1.276 4.154-1.768 5.752c-.083.272.517-.45.503-.21c-.01.187.027.394.074.581l-.146.159l.208.067l.068.21l.159-.146c.187.047.394.084.58.074c.24-.014-.483.587-.21.503c1.598-.493 4.607-1.296 5.752-1.768c.924-.381 1.854-.736 2.291-1.174c.439-.435.406-1.178-.043-1.627"></path><path fill="#ea596e" d="M25.312 4.351a2.24 2.24 0 0 0 0 3.168l3.167 3.168a2.24 2.24 0 0 0 3.168 0l3.169-3.168a2.24 2.24 0 0 0 0-3.168l-3.169-3.168a2.24 2.24 0 0 0-3.168 0z"></path><path fill="#ffcc4d" d="m11.849 17.815l3.17 3.17l3.165 3.166l11.881-11.879l-6.337-6.336z"></path><path fill="#292f33" d="M11.298 26.742s-2.06 1.133-2.616.576c-.557-.558.581-2.611.581-2.611s1.951.036 2.035 2.035"></path><path fill="#ccd6dd" d="m23.728 5.935l3.96-3.96l6.336 6.337l-3.96 3.96z"></path><path fill="#99aab5" d="m26.103 3.558l.792-.792l6.336 6.335l-.792.792zM24.52 5.142l.791-.791l6.336 6.335l-.792.792z"></path></svg><span class="text-sm">15 Dec 2025<br>MON&nbsp;09:00-12:00</span></div></div><div><div class="flex items-center gap-1"><svg height="16" role="presentation" viewBox="0 0 36 36" width="16" xmlns="http://www.w3.org/2000/svg" fill="none" class="mr-1"><path fill="#ccd6dd" d="M31 32a4 4 0 0 1-4 4H5a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4h22a4 4 0 0 1 4 4z"></path><path fill="#99aab5" d="M27 24a1 1 0 0 1-1 1H6a1 1 0 1 1 0-2h20a1 1 0 0 1 1 1m-16 4a1 1 0 0 1-1 1H6a1 1 0 1 1 0-2h4a1 1 0 0 1 1 1M27 8a1 1 0 0 1-1 1H6a1 1 0 0 1 0-2h20a1 1 0 0 1 1 1m0 4a1 1 0 0 1-1 1H6a1 1 0 1 1 0-2h20a1 1 0 0 1 1 1m0 4a1 1 0 0 1-1 1H6a1 1 0 1 1 0-2h20a1 1 0 0 1 1 1m0 4a1 1 0 0 1-1 1H6a1 1 0 1 1 0-2h20a1 1 0 0 1 1 1"></path><path fill="#66757f" d="M31 6.272c-.827-.535-1.837-.579-2.521-.023l-.792.646l-1.484 1.211l-.1.08l-2.376 1.938l-11.878 9.686c-.437.357-.793 1.219-1.173 2.074c-.378.85-.969 2.852-1.443 4.391c-.148.25-1.065 1.846-.551 2.453c.52.615 2.326.01 2.568-.076c1.626-.174 3.731-.373 4.648-.58c.924-.211 1.854-.395 2.291-.752c.008-.006.01-.018.017-.023l11.858-9.666l.792-.646l.144-.118z"></path><path fill="#d99e82" d="M18.145 22.526s-1.274-1.881-2.117-2.553c-.672-.843-2.549-2.116-2.549-2.116c-.448-.446-1.191-.48-1.629-.043c-.437.438-.793 1.366-1.173 2.291c-.472 1.146-1.276 4.154-1.768 5.752c-.083.272.517-.45.503-.21c-.01.187.027.394.074.581l-.146.159l.208.067l.068.21l.159-.146c.187.047.394.084.58.074c.24-.014-.483.587-.21.503c1.598-.493 4.607-1.296 5.752-1.768c.924-.381 1.854-.736 2.291-1.174c.439-.435.406-1.178-.043-1.627"></path><path fill="#ea596e" d="M25.312 4.351a2.24 2.24 0 0 0 0 3.168l3.167 3.168a2.24 2.24 0 0 0 3.168 0l3.169-3.168a2.24 2.24 0 0 0 0-3.168l-3.169-3.168a2.24 2.24 0 0 0-3.168 0z"></path><path fill="#ffcc4d" d="m11.849 17.815l3.17 3.17l3.165 3.166l11.881-11.879l-6.337-6.336z"></path><path fill="#292f33" d="M11.298 26.742s-2.06 1.133-2.616.576c-.557-.558.581-2.611.581-2.611s1.951.036 2.035 2.035"></path><path fill="#ccd6dd" d="m23.728 5.935l3.96-3.96l6.336 6.337l-3.96 3.96z"></path><path fill="#99aab5" d="m26.103 3.558l.792-.792l6.336 6.335l-.792.792zM24.52 5.142l.791-.791l6.336 6.335l-.792.792z"></path></svg><span class="text-sm">15 Dec 2025<br>MON&nbsp;13:00-15:00</span></div></div></div></a>"`,
    );
  });
});
