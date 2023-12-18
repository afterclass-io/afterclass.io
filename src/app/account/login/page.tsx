"use client";

import { AuthCard } from "@/common/components/Auth";
import { Input } from "@/common/components/Input";
import { useState } from "react";
import { EnvelopeIcon } from "@/common/components/CustomIcon/EnvelopeIcon";
import { LockIcon } from "@/common/components/CustomIcon/LockIcon";
import { Button } from "@/common/components/Button";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [formSubmittedLoading, setFormSubmittedLoading] = useState(false);
  const signin = async () => {
    setFormSubmittedLoading(true);
    const signInRes = await signIn("credentials", {
      email: email,
      password: pwd,
      callbackUrl: "/reviews",
      redirect: false,
    });
    setFormSubmittedLoading(false);
    if (signInRes?.url) {
      router.replace(signInRes.url);
    }
    if (signInRes?.error) {
      // TODO: remove when toast component is implemented
      alert("Invalid email or password");
      console.error(`${signInRes.status}: ${signInRes.error}`);
    }
  };

  return (
    <>
      <section className="flex h-full flex-shrink-0 items-center justify-center py-16">
        <AuthCard>
          <Input
            label={"School Email Address"}
            leftContent={<EnvelopeIcon size={24} />}
            placeholder="john.doe.2023@smu.edu.sg"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
          />
          <Input
            label={"Password"}
            leftContent={<LockIcon size={24} />}
            placeholder="Enter password"
            type="password"
            value={pwd}
            onChange={(ev) => setPwd(ev.target.value)}
            onKeyDown={(ev) =>
              !formSubmittedLoading && ev.key === "Enter" && signin()
            }
          />
          <div className="flex w-full flex-col items-start gap-2 self-stretch pt-3">
            <Button fullWidth onClick={signin} disabled={formSubmittedLoading}>
              {formSubmittedLoading ? "Signing in..." : "Login"}
            </Button>
            <div className="flex items-center gap-1 self-stretch text-base">
              <span className="text-center font-semibold text-text-em-mid">
                {"Don't have an account?"}
              </span>
              <Button
                variant="link"
                href="/account/create"
                onClick={() => console.log("create account")}
              >
                Create an account
              </Button>
            </div>
          </div>
        </AuthCard>
      </section>
    </>
  );
}
