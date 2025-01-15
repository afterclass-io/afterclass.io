"use server";
import { db } from "@/server/db";
import {
  ForgotPwdFormActionReturnType,
  type ForgotPwdFormInputs,
} from "../types";

export async function getUserPlatform({ email }: ForgotPwdFormInputs) {
  const user = await db.users.findUnique({
    where: { email },
  });

  if (!user) {
    return ForgotPwdFormActionReturnType.USER_NOT_FOUND;
  }

  if (user.deprecatedPasswordDigest) {
    return ForgotPwdFormActionReturnType.USER_ON_V1;
  }

  return ForgotPwdFormActionReturnType.USER_ON_V2;
}
