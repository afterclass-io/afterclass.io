import { z } from "zod";

import { getBidLimits } from "@/server/config/chat-config";

export const bidAmountSchema = z
  .number()
  .positive()
  .max(getBidLimits().maxBidAmount);

export const bidNotesSchema = z.string().max(500);
