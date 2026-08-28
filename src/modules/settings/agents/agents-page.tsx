import { auth } from "@/server/auth";
import { listUserGrants } from "@/server/supabase-consent";
import { revokeAgent } from "./revoke-agent";

export async function AgentsPage() {
  const session = await auth();
  if (!session?.user) {
    return <p>Please sign in to view your connected agents.</p>;
  }
  const token = session.user.supabaseAccessToken;

  if (!token) {
    return (
      <div>
        <h1>Connected agents</h1>
        <p>Sign in with your school email to connect an AI agent.</p>
        <a href="/settings/agents/connect">Connect your agent</a>
      </div>
    );
  }

  let grants;
  try {
    grants = await listUserGrants(token);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return (
      <div>
        <h1>Connected agents</h1>
        <p role="alert">
          Could not load your connected agents ({message}). Please sign out and sign back in, then
          try again.
        </p>
      </div>
    );
  }

  if (grants.length === 0) {
    return (
      <div>
        <h1>Connected agents</h1>
        <p>No agents connected yet. Connect your own AI agent (Claude, ChatGPT, Gemini) to use afterclass.io on your own AI credits.</p>
        <a href="/settings/agents/connect">Connect your agent</a>
      </div>
    );
  }

  return (
    <div>
      <h1>Connected agents</h1>
      <ul>
        {grants.map((g) => (
          <li key={g.client_id}>
            <span>{g.client_name ?? g.client_id}</span>
            <form action={revokeAgent}>
              <input type="hidden" name="clientId" value={g.client_id} />
              <button type="submit" aria-label={`Revoke ${g.client_name ?? g.client_id}`}>Revoke</button>
            </form>
          </li>
        ))}
      </ul>
      <a href="/settings/agents/connect">Connect another agent</a>
    </div>
  );
}
