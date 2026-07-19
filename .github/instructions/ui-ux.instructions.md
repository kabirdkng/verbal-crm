---
description: "Use when building dashboard pages, conversation views, workflow builders, reports, and reusable UI components."
applyTo: "**/*.{tsx,css}"
---
# UI and UX Instructions

- Build accessible components first: semantic markup, keyboard navigation, visible focus states.
- Keep design system consistent with shadcn/ui conventions and tokenized styling.
- For data-heavy screens, prioritize readability, filters, and clear empty states.
- Separate presentational concerns from business logic and network calls.
- Include loading, error, and permission-denied states for each major view.
- Ensure responsive layouts for desktop and mobile.
- Add analytics hooks for key actions in CRM workflows.
