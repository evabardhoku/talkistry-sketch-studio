<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Architecture rules
- AI discovery turns run only in `src/lib/discovery.server.ts` via the `submitDiscoveryTurn` server fn; output is zod-validated (`src/lib/ai-schema.ts`) before persisting — keeps AI server-side and data trustworthy.
- AI may only create `proposed`/`unresolved` requirements; `confirmed` is set by human actions that also write a `decisions` row — traceability requirement.
- Sketch rendering is deterministic from `product_screens.components` (fixed component vocabulary in `src/lib/types.ts`); no AI images for wireframes.
- Access is via `project_members` + `is_project_member`/`can_edit_project` security-definer functions — ready for multiple collaborators.
- New users get a fictional sample project via `seed_demo_project` trigger on signup.
- Collaboration permissions live in the database (member role, access expiry, baseline-only sharing via `project_members`; triggers guard confirm/estimate/accept); `can` in `src/lib/baseline.ts` only mirrors them to hide controls.
- Approved baselines are created only by the `approve_baseline` RPC (owner-only, snapshot built server-side) and are immutable; scope changes compare new requests against the latest baseline inside the discovery AI turn.
- Explicit microphone recordings use an authenticated transcription server function; only reviewed transcript text enters the existing discovery pipeline, and raw recordings are never persisted by the app.
- Discovery request IDs are claimed under a database advisory lock before inference; repeated IDs never rerun AI, including uncertain outcomes.
- Specification downloads and print views use the same saved workspace data and clearly distinguish the live draft from immutable approval snapshots.
- Meeting mode reuses the chat and deterministic sketch renderer, keeping recording consent and approval status intact.
- The root layout owns the single main landmark and skip link; content pages use unframed div wrappers to avoid nested main landmarks.
- Meeting agendas are ordered JSON within project-linked meetings; atomic timer RPCs persist elapsed time and stage transitions, while UI ticks are deterministic and never call AI.
- Clarification questions are the only shared backlog; stable IDs, trigger-owned answer history and explicit active selection preserve prior answers across rephrasing.
- Internal insights and comments use separate role-restricted reads and are excluded from discovery context/exports; only a reviewed client-facing question is explicitly promoted.
- Discovery revision policy permits only unreviewed AI drafts to change; confirmed or human-reviewed requirements require separately reviewable proposals.
- Rebranding changes presentation only; retain storage keys, export format identifiers, routes and database contracts for compatibility with existing data.
- The header logo and favicon reuse one public SVG asset so the app identity stays consistent at small sizes.
