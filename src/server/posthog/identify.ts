import { PostHogClient } from "./client";
import { type Users } from "@prisma/client";

/**
 * Linking events to specific users
 * see https://posthog.com/docs/product-analytics/identify
 * @param user user to be identified, should be returned on authentication
 * @returns same `user` object
 */
export async function identifyUser(user: Users) {
  const posthog = PostHogClient();

  // ignoring unnecessary fields
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, deprecatedPasswordDigest, ...personProperties } = user;
  posthog.identify({ distinctId: id, properties: personProperties });
  await posthog.shutdown();
  return user;
}
