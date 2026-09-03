import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { env } from "@/env";
import { EDGE_CONFIG_CACHE_TAG } from "@/server/ecfg/config";

/**
 * On-demand invalidation for the cached edge-config read. Guarded by the
 * `x-revalidate-secret` header matching `REVALIDATE_SECRET` (Next.js docs
 * pattern). See src/server/ecfg/README.md for the curl command.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-revalidate-secret");
  if (secret !== env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "invalid secret" }, { status: 401 });
  }

  // { expire: 0 } = immediate expiration: the next read is a blocking cache
  // miss, so a pushed config change propagates on the very next request
  // (https://nextjs.org/docs/messages/revalidate-tag-single-arg).
  revalidateTag(EDGE_CONFIG_CACHE_TAG, { expire: 0 });
  return NextResponse.json({
    revalidated: true,
    tag: EDGE_CONFIG_CACHE_TAG,
    now: Date.now(),
  });
}
