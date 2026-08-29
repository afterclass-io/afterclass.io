import { beforeEach, describe, expect, it, vi } from "vitest";

type TextCall = { type: "text"; text: string };
type WidgetCallArgs = { props: Record<string, unknown>; output: unknown };

const widgetMock = vi.fn((args: WidgetCallArgs) => ({ widget: true, ...args }));
const textMock = vi.fn((t: string): unknown => ({ text: t }));
const errorMock = vi.fn((t: string): unknown => ({ error: t }));

vi.mock("mcp-use/server", () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  widget: (...args: unknown[]) => widgetMock(...(args as [WidgetCallArgs])),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  text: (...args: unknown[]) => textMock(...(args as [string])),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  error: (...args: unknown[]) => errorMock(...(args as [string])),
}));

const buildToolContextMock = vi.fn();
vi.mock("./user", () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  buildToolContext: (...args: unknown[]) => buildToolContextMock(...args),
}));

// Must import after the mocks above.
import { makeHandler, toMcpUseResponse } from "./register";
import type { ToolContext } from "@/server/mcp/types";

const fakeCtx: ToolContext = {
  user: {
    id: "u1",
    email: "a@smu.edu.sg",
    username: "u1",
    isVerified: true,
    universityId: 1,
    firstName: null,
    lastName: null,
    telegramId: null,
    photoUrl: null,
    facultyId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  caller: {} as unknown as ToolContext["caller"],
};

beforeEach(() => {
  vi.clearAllMocks();
  buildToolContextMock.mockResolvedValue(fakeCtx);
});

describe("makeHandler widgetProps plumbing", () => {
  it("prefers result.widgetProps over tool.toWidgetProps when both are present", async () => {
    const toWidgetProps = vi.fn((result: { content: TextCall[] }) => ({
      fromLegacy: result.content[0]?.text,
    }));
    const tool: Parameters<typeof makeHandler>[0] = {
      name: "dummy",
      description: "x",
      inputSchema: {} as never,
      readOnly: true,
      widgetName: "calendar-links",
      toWidgetProps,
      run: async () => ({
        content: [{ type: "text", text: "hello" }],
        widgetProps: { feedUrl: "https://x/api/ical/tok" },
      }),
    };
    const handler = makeHandler(
      tool,
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      (ctx, args) => tool.run(ctx, args as never),
    );
    await handler({}, { auth: { user: { userId: "u1" } } });
    expect(toWidgetProps).not.toHaveBeenCalled();
    expect(widgetMock).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const call = widgetMock.mock.calls[0]![0] as WidgetCallArgs;
    expect(call.props).toEqual({ feedUrl: "https://x/api/ical/tok" });
  });

  it("falls back to toWidgetProps when result has no widgetProps (regression guard)", async () => {
    const toWidgetProps = vi.fn((result: { content: TextCall[] }) => ({
      parsed: result.content[0]?.text,
    }));
    const tool: Parameters<typeof makeHandler>[0] = {
      name: "dummy2",
      description: "x",
      inputSchema: {} as never,
      readOnly: true,
      widgetName: "bid-recommendation",
      toWidgetProps,
      run: async () => ({
        content: [{ type: "text", text: '{"a":1}' }],
      }),
    };
    const handler = makeHandler(
      tool,
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      (ctx, args) => tool.run(ctx, args as never),
    );
    await handler({}, { auth: { user: { userId: "u1" } } });
    expect(toWidgetProps).toHaveBeenCalledTimes(1);
    expect(widgetMock).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const call = widgetMock.mock.calls[0]![0] as WidgetCallArgs;
    expect(call.props).toEqual({ parsed: '{"a":1}' });
  });
});

describe("toMcpUseResponse", () => {
  it("returns error/text shapes", () => {
    expect(toMcpUseResponse({ content: [{ type: "text", text: "boom" }], isError: true })).toBeDefined();
    expect(toMcpUseResponse({ content: [{ type: "text", text: "ok" }] })).toBeDefined();
  });
});
