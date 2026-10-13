import { z } from "zod";

export const voteWeightSchema = z.union([
  z.literal(-1),
  z.literal(0),
  z.literal(1),
]);
