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
