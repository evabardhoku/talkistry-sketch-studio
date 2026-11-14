# Talkistry

Build a functional full-stack SaaS web application called "SpecLoop".

PRODUCT VISION
SpecLoop is an AI-powered product discovery and requirements clarification workspace for startups, software agencies, founders, clients, and developers.

Tagline: "From conversation to shared product vision."

CORE PROBLEM
Non-technical clients often know what they want to achieve but struggle to explain exactly what software should do. Developers interpret vague requests differently, resulting in misunderstandings and scope changes.

SpecLoop acts as an AI Product Sketch Artist: it guides a discovery conversation, asks targeted clarification questions, generates evolving product sketches, and transforms confirmed decisions into a structured specification.

IMPORTANT POSITIONING
This is NOT a generic project management tool, chatbot, website builder, or AI ticket generator. The central experience is an interactive conversation that progressively becomes a shared visual product definition.

BUILD A REAL WORKING APPLICATION.

1. TECHNICAL FOUNDATION
- Use the existing Lovable-supported stack and built-in backend.
- Implement authentication and persistent project data.
- Define reusable TypeScript types and components.
- Set up project ownership and a data model extensible to multiple collaborators.
- Apply appropriate row-level access controls.
- Keep AI calls server-side.
- No external paid integrations or unnecessary dependencies.
- Seed one realistic fictional sample project and provide a guided demo experience.

2. MAIN APPLICATION PAGES
A. Landing page
- Short, compelling explanation of the product.
- Interactive product preview.
- "Start a discovery session" CTA.

B. Dashboard
- Create a project.
- See existing projects and progress.
- Resume a discovery session.
- View outstanding questions and specification readiness.

C. Discovery workspace
This is the main feature.

Desktop layout:
LEFT: Guided conversation with the AI.
RIGHT: Live Product Sketch.

Include a collapsible project context and requirements panel.

On mobile, use tabs instead of squeezing the desktop layout.

D. Product specification
- Structured requirements.
- User roles.
- User journeys.
- Business rules.
- Acceptance criteria.
- Unresolved questions.
- Decisions and supporting evidence.

3. AI DISCOVERY INTERVIEW

A user starts by describing a product idea in natural language.

Example:
"I want an app where parents can find and book private tutors."

The AI should:
- Understand the user's goal.
- Identify target users.
- Ask one high-value clarification question at a time.
- Explore roles, permissions, workflows, business rules, exceptions, payments, notifications and data requirements when relevant.
- Avoid asking irrelevant questions.
- Track answered and unanswered questions.
- Adapt follow-up questions to earlier answers.
- Allow the user to skip questions.
- Support manual correction of extracted requirements.

AI communication should be friendly, concise, professional, and understandable to non-technical people.

Never invent business requirements.

Classify extracted information as:
- Confirmed: explicitly approved by a human.
- Proposed: suggested by AI, pending approval.
- Unresolved: missing or ambiguous.
- Deferred: intentionally postponed.

Every requirement must be traceable to its supporting conversation message or explicit human decision.

Use structured AI responses with schema validation. A single AI interaction should ideally return:
- updated requirement suggestions
- the next clarification question
- detected ambiguities
- proposed screen/workflow changes
- a short explanation of what changed

Do not call AI on every keystroke. Process when the user explicitly submits an answer.

4. LIVE PRODUCT SKETCH

Build a real interactive low-fidelity product sketch, not a decorative placeholder.

Represent the product using a structured, editable screen and flow model.

Support common components:
- page header
- navigation
- cards
- forms
- input fields
- buttons
- lists
- search
- calendars
- simple tables
- modal dialogs

Generate the sketch from structured project requirements using reusable components and templates.

Show:
- proposed screens
- user navigation
- relationships between screens
- highlighted changes
- unresolved functionality

The user must be able to select a screen, inspect its purpose, and request changes.

Keep sketch generation lightweight and deterministic where possible. Avoid generating AI images for wireframes.

Do not silently create confirmed requirements from assumptions.

5. SPECIFICATION GENERATOR

Generate a continuously evolving structured product brief containing:
- Product overview
- User personas
- Main user journeys
- Feature requirements
- Business rules
- Acceptance criteria
- Open questions
- Confirmed decisions
- Proposed and excluded scope

Keep generated requirements editable by humans.

The specification should update from confirmed discovery information without losing earlier context.

6. DATA MODEL

Create an appropriate normalized schema for:
- users/profiles
- projects
- project_members
- discovery_sessions
- conversation_messages
- requirements
- clarification_questions
- product_screens
- workflow_connections
- decisions
- specification_versions

Add timestamps, stable IDs and relationships.

7. DESIGN DIRECTION

Premium modern B2B SaaS aesthetic.

Inspiration: Linear, Figma, Notion, modern collaborative design tools.

Use:
- Warm off-white surfaces
- Deep charcoal typography
- Refined indigo/violet accent
- Subtle borders and restrained shadows
- Generous whitespace
- Elegant typography
- Smooth but minimal animations

The discovery workspace must feel like a professional collaborative whiteboard, not a traditional admin dashboard.

Prioritize desktop because the main use case is a client meeting on a laptop, but make the product fully responsive.

8. REQUIRED END-TO-END SCENARIO

A user must be able to:
1. Sign in.
2. Create a project.
3. Describe a product idea.
4. Answer AI clarification questions.
5. See the product sketch evolve.
6. Edit or confirm requirements.
7. Open the generated product specification.
8. Save and resume the project later.

Every primary action must work. No fake buttons, fabricated results, or static-only core workflows.

9. IMPLEMENTATION RULES

- Build reusable modules and components.
- Avoid unnecessary complexity.
- Use the built-in Lovable AI connector when suitable.
- Validate AI-generated structured data.
- Show clear loading, error, and empty states.
- Persist changes reliably.
- Use fictional demo data, never real client information.
- Do not add billing, subscriptions, analytics integrations, or unrelated features.
- Do not compromise the central discovery-to-sketch workflow to add decorative features.

DELIVERY

Implement the functional core first.

Verify the end-to-end demonstration before reporting completion.

If a feature cannot be implemented fully, explicitly identify what remains incomplete rather than creating a misleading simulation.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://talkistry-sketch-studio.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/127903cd-8d79-4e72-95ec-00e0f662620a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
