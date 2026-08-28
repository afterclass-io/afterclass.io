export type WelcomePrefs = { lastShownAt: string | null; shownCount: number };

export const WELCOME_BUBBLE_KEY = "ac:assistant:welcome:v1";
export const WELCOME_INTERVAL_DAYS = 7;
export const WELCOME_MAX_SHOWS = 3;
export const WELCOME_SHOW_DELAY_MS = 4000;
export const WELCOME_AUTO_DISMISS_MS = 12000;

const DAY_MS = 86_400_000;

export const ENGAGEMENT_MESSAGES: readonly string[] = [
  "Ask me about courses, professors & bid amounts.",
  "I can help you plan your timetable for next term.",
  "Need a bid recommendation? I can help.",
  "Try asking me to search for a course.",
  "I can read your roadmaps and help you plan.",
];

export function shouldShowWelcome(prefs: WelcomePrefs, now: number): boolean {
  if (prefs.shownCount >= WELCOME_MAX_SHOWS) return false;
  if (!prefs.lastShownAt) return true;
  return now - Date.parse(prefs.lastShownAt) >= WELCOME_INTERVAL_DAYS * DAY_MS;
}

export function markShown(prefs: WelcomePrefs): WelcomePrefs {
  return { lastShownAt: new Date().toISOString(), shownCount: prefs.shownCount + 1 };
}

export function pickEngagementMessage(hasConnectedAgent: boolean, remaining: number, quota: number): string {
  if (hasConnectedAgent) return "Unlimited via your connected agent - ask me anything.";
  if (remaining <= Math.max(1, Math.floor(quota * 0.2)))
    return `${remaining} free messages left - connect your agent for unlimited.`;
  return ENGAGEMENT_MESSAGES[Math.floor(Math.random() * ENGAGEMENT_MESSAGES.length)]!;
}
