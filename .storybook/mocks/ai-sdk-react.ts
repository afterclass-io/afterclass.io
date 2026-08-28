// Storybook-only mock of @ai-sdk/react: re-exports the real module and swaps
// `useChat` for one driven by story `parameters.chatState`
// ({ messages?, status?, error? }). Mirrors the vi.mock strategy used by the
// assistant unit tests, but at module-resolution time (webpack alias in
// .storybook/main.ts) instead of in the test runner.
//
// Mechanism notes:
// - The real module is imported via a RELATIVE path into node_modules, NOT the
//   bare specifier "@ai-sdk/react". The webpack alias maps the bare specifier
//   to THIS file, so `import ... from "@ai-sdk/react"` here would be circular.
//   Type-only imports of "@ai-sdk/react" stay clean: tsc resolves them to the
//   real package (the alias is webpack-only) and they are erased before webpack
//   sees them.
// - Chat state flows from the `withAssistant` decorator to this mock through
//   module-scope state (`__setChatState` / `chatStateParam`) instead of
//   `useParameter`. The preview hooks context behind `useParameter` is only
//   active during the SYNCHRONOUS story render; `ChatPage` re-renders after
//   the decorator's store seed (outside that pass) and would throw. See the
//   note by `__setChatState` below.
import { useEffect, useRef } from "react";
import { useChat as realUseChat } from "../../node_modules/@ai-sdk/react/dist/index.js";
import type { ChatStatus, UIMessage } from "ai";
import type { UseChatHelpers, UseChatOptions } from "@ai-sdk/react";

/** Story parameter driving the mocked chat: `parameters: { chatState: {...} }`. */
type ChatStateParam = {
  messages?: UIMessage[];
  status?: ChatStatus;
  error?: Error;
};

// Chat state is handed to the mock by the `withAssistant` decorator via
// module-scope communication instead of `useParameter`. WHY: `useParameter`
// reads the preview hooks context, which Storybook only sets during the
// SYNCHRONOUS story render pass. `ChatPage` subscribes to the zustand store's
// `hydrated` slice; the decorator's `useEffect` seeds the store (setting
// `hydrated: true`), which re-renders `ChatPage` OUTSIDE that pass, where
// `useParameter` throws. Module scope always holds the latest value: the
// decorator sets it before the story renders and again on every re-render.
let chatStateParam: ChatStateParam | undefined;
export const __setChatState = (state: ChatStateParam | undefined) => {
  chatStateParam = state;
};

export const useChat = <UI_MESSAGE extends UIMessage = UIMessage>(
  options?: UseChatOptions<UI_MESSAGE>,
): UseChatHelpers<UI_MESSAGE> => {
  const chatState = chatStateParam;
  const firedErrorRef = useRef(false);

  // Mirror the real hook's onError wiring. ChatPage/ChatPanel route gate
  // errors (quota/spend) to their ConnectGate surface inside `options.onError`,
  // so a gate error declared via `parameters.chatState.error` must reach that
  // callback or the gate never renders. Fire once per story mount (ref guard);
  // idempotent - the gate string is stable, so repeated calls bail out.
  useEffect(() => {
    if (firedErrorRef.current) return;
    if (!chatState?.error || !options?.onError) return;
    firedErrorRef.current = true;
    options.onError(chatState.error);
  }, [chatState, options]);

  // No chatState parameter -> behave exactly like the real hook. The
  // empty/initial stories need no mock (useChat makes no request on mount).
  // `realUseChat` intentionally does not start with "use" so the
  // react-hooks/rules-of-hooks check does not treat this as a conditional hook.
  if (!chatState) {
    return realUseChat(options);
  }

  const status: ChatStatus = chatState.status ?? "ready";

  return {
    id: "mock-chat",
    messages: (chatState.messages ?? []) as UI_MESSAGE[],
    setMessages: () => undefined,
    error: chatState.error,
    sendMessage: async () => undefined,
    regenerate: async () => undefined,
    stop: () => undefined,
    resumeStream: async () => undefined,
    addToolResult: () => undefined,
    addToolOutput: () => undefined,
    addToolApprovalResponse: () => undefined,
    clearError: () => undefined,
    status,
  };
};

// Re-export everything else from the real module so any future import of
// "@ai-sdk/react" (beyond `useChat`) keeps working. The explicit `useChat`
// above shadows the star re-export.
export * from "../../node_modules/@ai-sdk/react/dist/index.js";
