import type { Meta, StoryObj } from "@storybook/nextjs";
import { fn } from "storybook/test";

import {
  ConsentCard,
  ConsentError,
  ConsentLoading,
  ConsentMissing,
  ConsentSignIn,
  Shell,
} from "./consent-ui";

const meta = {
  title: "OAuth/Consent",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const geminiDetails = {
  status: "details",
  client: { name: "Google", id: "3e3aa4a2-753a-4fa3-bd42-eb44eecff143" },
  scope: "openid profile email phone offline_access",
  redirect_uri:
    "https://oauth-redirect.googleusercontent.com/r/user_bound_custom-mcp-107023827359948230403-www_afterclass_io",
} as const;

export const Ready: Story = {
  render: () => (
    <Shell>
      <ConsentCard
        details={{ ...geminiDetails }}
        onApprove={fn()}
        onDeny={fn()}
      />
    </Shell>
  ),
};

export const Busy: Story = {
  render: () => (
    <Shell>
      <ConsentCard
        details={{ ...geminiDetails }}
        busy
        onApprove={fn()}
        onDeny={fn()}
      />
    </Shell>
  ),
};

export const UnknownScopes: Story = {
  render: () => (
    <Shell>
      <ConsentCard
        details={{
          status: "details",
          client: { name: "Future App" },
          scope: "openid custom_future",
          redirect_uri: "https://client.example/cb",
        }}
        onApprove={fn()}
        onDeny={fn()}
      />
    </Shell>
  ),
};

export const Loading: Story = {
  render: () => (
    <Shell>
      <ConsentLoading />
    </Shell>
  ),
};

export const SignIn: Story = {
  render: () => (
    <Shell>
      <ConsentSignIn loginHref="/account/auth/login?callbackUrl=%2Foauth%2Fconsent%3Fauthorization_id%3Dabc" />
    </Shell>
  ),
};

export const Error: Story = {
  render: () => (
    <Shell>
      <ConsentError message="invalid authorization request" onRetry={fn()} />
    </Shell>
  ),
};

export const Missing: Story = {
  render: () => (
    <Shell>
      <ConsentMissing />
    </Shell>
  ),
};
