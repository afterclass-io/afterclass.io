import { type NextAuthConfig } from "next-auth";
import bcrypt from "bcrypt";
import { z } from "zod";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider, { type GoogleProfile } from "next-auth/providers/google";
import * as Sentry from "@sentry/nextjs";
import { type Users } from "@prisma/client";

import { env } from "@/env";
import { signInWithEmail } from "../supabase";
import { db } from "@/server/db";
import randomId from "@/common/functions/randomId";
import { emailValidationSchema } from "@/common/tools/zod/schemas";

type SessionUser = Omit<Users, "deprecatedPasswordDigest">;

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  /**
   * Returned by `auth`, `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: SessionUser;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  secret: env.NEXTAUTH_SECRET,
  debug: env.NODE_ENV === "development",
  providers: [
    CredentialsProvider({
      // The name to display on the sign in form (e.g. "Sign in with...")
      name: "School Email",
      // `credentials` is used to generate a form on the sign in page.
      // You can specify which fields should be submitted, by adding keys to the `credentials` object.
      // e.g. domain, username, password, 2FA token, etc.
      // You can pass any HTML attribute to the <input> tag through the object.
      credentials: { email: { type: "text" }, password: { type: "password" } },
      async authorize(credentials) {
        const Credential = z.object({
          email: emailValidationSchema,
          password: z.string(),
        });
        const c = Credential.safeParse(credentials);
        if (!c.success) return null;

        const emailDomain = c.data.email.split("@")[1];
        const user = await db.users.findUnique({
          where: { email: c.data.email },
        });

        const passwordDigest = user?.deprecatedPasswordDigest;

        if (
          passwordDigest &&
          bcrypt.compareSync(c.data.password, passwordDigest)
        ) {
          Sentry.addBreadcrumb({
            category: "auth",
            message: `User ${user.id} logged in with v1 credentials.`,
            level: "info",
          });
          return user;
        }

        const { data, error } = await signInWithEmail(
          c.data.email,
          c.data.password,
        );
        if (error) {
          Sentry.addBreadcrumb({
            category: "auth",
            message: `Authentication Error: ${error.name}: ${error.message}`,
            level: "error",
          });
          return null;
        }

        if (!data.user) {
          // If you return null then an error will be displayed advising the user to check their details.
          return null;

          // You can also Reject this callback with an Error.
          // The user will be sent to the error page with the error message as a query parameter
        }

        if (user) {
          // Any object returned will be saved in `user` property of the JWT
          return user;
        }

        // user signed into supabase successfully, but user doesn't exist in our database
        const universities = await db.universities.findMany({
          include: { domains: true },
        });
        const uniOfThisEmail = universities.find((u) =>
          u.domains.some((d) => emailDomain!.endsWith(d.domain)),
        );
        if (!uniOfThisEmail) {
          Sentry.addBreadcrumb({
            type: "error",
            category: "auth",
            message:
              `Unexpected email domain '${emailDomain}'.\n` +
              "\tUser has signed up with this email but the domain is not associated with any university. " +
              "\tPlease check the database for the domain and add it to the universities table if necessary",
            level: "error",
          });
          return null;
        }

        const newUser = await db.users.create({
          data: {
            id: data.user.id,
            email: data.user.email ?? c.data.email,
            username: `user_${randomId()}`,
            isVerified: !!data.user.confirmed_at || false,
            universityId: uniOfThisEmail.id,
          },
        });
        return newUser;
      },
    }),
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://authjs.dev/getting-started/providers/github
     */
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,

      async profile(profile: GoogleProfile) {
        console.log("Google Profile:");
        console.dir(profile, { depth: null });
        if (!profile.email_verified) {
          throw new Error("Email is not verified");
        }

        const user = await db.users.findUnique({
          where: { email: profile.email },
        });

        if (user) {
          return user;
        }

        const universities = await db.universities.findMany({
          include: { domains: true },
        });
        const uniOfThisEmail = universities.find((u) =>
          u.domains.some((d) => profile.email.endsWith(d.domain)),
        );

        if (!uniOfThisEmail) {
          Sentry.addBreadcrumb({
            type: "error",
            category: "auth",
            message:
              `Unexpected email domain '${profile.email}'.\n` +
              "\tUser has signed up with this email but the domain is not associated with any university. " +
              "\tPlease check the database for the domain and add it to the universities table if necessary",
            level: "error",
          });
          throw new Error("Unexpected email domain");
        }

        const newUser = await db.users.create({
          data: {
            email: profile.email,
            username: `user_${randomId()}`,
            isVerified: profile.email_verified,
            universityId: uniOfThisEmail.id,
            photoUrl: profile.picture,
          },
        });

        return newUser;
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/account/auth/login",
    error: "/account/auth/login", // Error code passed in query string as `?error=`
    verifyRequest: "/account/auth/verify", // Used for check email message
  },
  callbacks: {
    redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
    jwt({ token, user }) {
      if (token.sub && user) {
        // strip user object of unwanted sensitive fields before populating to token
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { deprecatedPasswordDigest, ...rest } = user as Users;
        // to expose user object in session
        token.user = rest;
      }
      return token;
    },
    session({ session, token }) {
      if (token?.user) {
        // @ts-expect-error: `session.user` is typed as `AdapterUser & SeessionUser`
        // Since we are using "JWT" strategy instead of "database",
        // we should be expecting `SessionUser`, not `AdapterUser`
        session.user = token.user as SessionUser;
      }
      return session;
    },
  },
  events: {
    signIn({ user }) {
      // strip user object of unwanted sensitive fields before populating to Sentry
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { deprecatedPasswordDigest, ...unsensoredUser } = user as Users;
      Sentry.getGlobalScope().setUser(unsensoredUser);
    },
    signOut() {
      Sentry.getGlobalScope().setUser(null);
    },
  },
} satisfies NextAuthConfig;
