# Kaamakaze

Kaamakaze is a resume workspace with a reusable profile, role-specific resume folders, and an application tracker.

## Run locally

Requires Node.js 22 or newer. No packages need installing.

```sh
node server.mjs
```

Open http://127.0.0.1:3000. Set `OPENAI_API_KEY` in the server environment to enable Kai generation and feedback-based revisions. `OPENAI_MODEL` defaults to `gpt-4.1-mini`. `PORT` defaults to 3000, and `HOST` defaults to 127.0.0.1.

Without a key, the browser can assemble a local draft from the supplied profile and rank separate skill lines against the job description. The UI labels those resumes **Local draft**. Feedback-based rewrites require Kai AI.

## Workspace

- Fill out **Profile** or add notes while generating. The **Experience map** shows the resume section each profile field can feed and counts drafts that report using it.
- Supply a role and job description in **Kai**. Each generated version appears in **Folders**, where you can edit it, export text, or print to PDF.
- Open **Achievements → Add job** to record dates, notes, the resume used, and application status. For **Closed without offer**, add optional feedback and use **Revise with Kai** to save a new version. The application remains linked to the version originally used.
- Profiles, resumes and applications are stored in the current browser. When Kai AI is connected, generation sends the relevant profile, job posting, and any revision inputs to OpenAI through the server. The API key stays on the server.

## Hosting

The contents of `public/` can be hosted as a static local-draft demo. AI requires running `server.mjs`. If exposing the AI server publicly, put it behind authentication and per-user quotas before supplying a paid API key.
