import { z } from "zod";

export const bidAmountSchema = z
  .number({ invalid_type_error: "Enter a valid bid amount" })
  .positive("Bid must be greater than 0")
  .max(99999, "Bid cannot exceed e$99,999");
