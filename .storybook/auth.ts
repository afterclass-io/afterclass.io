import type { DefaultSession, Session } from "next-auth";
import type { Users } from "@/generated/prisma/client";

type SessionUser = Omit<Users, "deprecatedPasswordDigest">;

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://authjs.dev/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: SessionUser;
  }
}

type AuthState = {
  session: {
    data: Session | null;
    status: "loading" | "unauthenticated" | "authenticated";
  };
};

export type MockAuthStates = {
  unknown: AuthState;
  loading: AuthState;
  admin: AuthState;
  user: AuthState;
};

export const mockAuthStates: MockAuthStates = {
  unknown: {
    session: null,
  },
  loading: {
    session: {
      data: null,
      status: "loading",
    },
  },
  admin: {
    session: {
      data: {
        user: {
          id: "11894f96-aa54-4632-bf33-8c46999aab1b",
          username: "admin",
          firstName: "adminFirst",
          lastName: "adminLast",
          email: "admin@example.org",
          telegramId: null,
          photoUrl:
            "https://afterclass-user-profile-pics.s3.amazonaws.com/Asset+2%402x.png",
          isVerified: true,
          universityId: 1,
          facultyId: null,
          createdAt: new Date("2019-07-29T05:26:32.000Z"),
          updatedAt: new Date("2022-05-18T14:18:38.513Z"),
        },
        expires: "3000-01-01T00:00:00Z",
      },
      status: "authenticated",
    },
  },
  user: {
    session: {
      data: {
        user: {
          id: "85498973-b416-45d4-a3d1-fe8d7d2d5821",
          username: "user",
          firstName: "userFirst",
          lastName: "userLast",
          email: "user@example.org",
          telegramId: null,
          photoUrl:
            "https://afterclass-user-profile-pics.s3.amazonaws.com/Asset+2%402x.png",
          isVerified: true,
          universityId: 1,
          facultyId: null,
          createdAt: new Date("2019-07-29T05:26:32.000Z"),
          updatedAt: new Date("2022-05-18T14:18:38.513Z"),
        },
        expires: "3000-01-01T00:00:00Z",
      },
      status: "authenticated",
    },
  },
};
