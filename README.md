# Suzlon Wind CRM

An AI-powered **Renewable Energy Operations Platform** for the wind energy lifecycle — customer relationships, wind farm development, EPC execution, turbine lifecycle, field service, environmental intelligence, documents and digital twins in one operational system of record.

> **Independent demo — not affiliated with Suzlon Energy Ltd.** This is a personal
> prototype exploring interface patterns for industrial asset operations. It is not
> commissioned, endorsed or reviewed by Suzlon Energy Ltd. or any subsidiary, and it
> contains none of their data, systems, branding or intellectual property.

> **Phase 1 — frontend only.** There is no backend, database, authentication, payment, or real SCADA / GIS / weather / seismic / grid integration. Every figure is generated locally from deterministic seeds. Product references (S120, S133, S144) and all company, site and person names are realistic demo data for this prototype, not sourced corporate facts.

```bash
npm install
npm run dev      # http://localhost:4310
npm run build    # production build
npm run typecheck
```

---

## The defining experience

**Wind Intelligence Command Center** (`/command-center`) — a live geospatial canvas of the fleet:

- Full-bleed interactive map of India, pan/zoom, with 14 toggleable layers
- Global KPI rail: installed MW, MW online, availability, turbines up, offline, critical incidents, maintenance due, projects at risk, customers impacted, generation today
- AI Priorities panel — each card states what happened, why it matters, business impact, recommended action, affected sites and MW, confidence, and a CTA
- Click a wind farm → the map animates to it and a site drawer opens with generation, availability, asset health, weather, incidents, crew and projects
- Operational event stream along the bottom, filterable by kind
- Mobile: bottom sheets for sites and priorities, collapsible map, compact action bar

The map is **built from first principles** — a simplified India boundary in lat/lng projected through Web Mercator into a fixed SVG viewBox. Markers, cyclone tracks, seismic rings, flood basins and site envelopes all share one projection, so everything registers correctly at any zoom. No tile server, no GIS dependency, no network calls.

---

## Modules

| Route | What it covers |
|---|---|
| `/command-center` | Live map, KPIs, AI priorities, site drawer, event stream |
| `/crm/accounts` · `/crm/accounts/[id]` | Account list and Customer 360 (9 tabs) |
| `/crm/contacts` | People, influence, ownership, related records |
| `/crm/opportunities` | Pipeline board across 9 stages + opportunity workspace |
| `/crm/quotes` | Live quote builder with editable rates and cost composition |
| `/wind-farms` · `/wind-farms/[id]` | Site list/cards and 9-tab workspace incl. **digital twin** |
| `/turbines` · `/turbines/[id]` | Fleet list and **turbine digital twin** (8 tabs) |
| `/projects` · `/projects/[id]` | Delivery book and 9-tab workspace with milestone timeline |
| `/maintenance` · `/maintenance/[id]` | Work orders, calendar, preventive matrix, order detail |
| `/field-service` | Mobile-first technician flow, 8 steps, offline simulation |
| `/asset-monitoring` | Fleet health, site comparison, product families, underperformance |
| `/environment` | Weather, cyclones, earthquakes, tsunami, lightning, flood |
| `/documents` | Library with grid/list, preview panel, related-record links |
| `/ai-copilot` | Conversational workspace with structured response cards |
| `/reports` | 9 reports with filters, charts, metrics and data tables |
| `/admin` | Users, roles, permissions, notifications, integrations, preferences |

---

## Architecture

```
src/
  app/                      route segments (one thin page.tsx + one view per module)
  components/
    ui/                     primitives (button, badge, dialog/sheet, form controls)
    layout/                 app shell, sidebar, topbar, command palette
    charts/                 hand-built SVG chart system + milestone timeline
    maps/                   India canvas, overlays, site digital twin
    cards/ tables/ feedback/ KPI, status, data table, filters, empty/error/loading
  features/                 domain-specific composition
  lib/
    api/                    mock API layer (latency + optional fault injection)
    mocks/                  deterministic data generators
    formatters/ utils/ constants/
  stores/                   Zustand (UI state, map state)
  types/                    shared domain types
```

**Data flow.** Every screen reads through `lib/api`, which mimics a network call: async, with simulated latency and an optional fault-injection mode (Administration → Display) that fails roughly one in seven requests so the error and retry states are reachable on demand. TanStack Query handles caching, loading and error states; Zustand holds UI and map state.

**Determinism.** All mock data comes from seeded PRNGs and a fixed demo clock (`DEMO_NOW`), so the server and client render byte-identical output and figures stay stable between reloads. 15 sites, 522 turbines, ~170 work orders, 10 projects, 8 accounts, 18 contacts, 12 opportunities and ~150 documents are generated at module load.

---

## Design system

Tokens live in `src/app/globals.css` as CSS custom properties, surfaced to Tailwind v4 through `@theme inline`. Light and dark are **separately selected**, not inverted — dark mode is tuned for control-room use.

**Data visualisation** follows a validated palette:

- **Categorical** hues are assigned in fixed slot order and never cycled
- **Sequential** encoding uses one blue hue, light → dark (heatmaps)
- **Status** colours (good / warning / serious / critical) are reserved, never reused as a series colour, and always ship with a dot, icon or label
- Validated with the palette checker against this app's own surfaces: light worst adjacent CVD ΔE 9.1 / normal-vision 19.6 on `#fbfcfd`; dark 8.4 / 19.3 on `#101720`
- No dual-axis charts anywhere — two measures of different scale get two charts
- Every chart carries a hover layer and a screen-reader table equivalent

---

## Accessibility

- Full keyboard navigation, visible focus rings, skip-to-content link
- Semantic landmarks, `aria-current` on active nav, labelled form controls
- **The map is never the only route to information** — the Command Center ships a text summary table of every site, and the site digital twin is paired with a turbine positions table
- Charts expose a visually hidden `<table>` with the underlying values
- `prefers-reduced-motion` respected globally
- Status is always carried by a dot/icon/label in addition to colour

---

## Role-aware demo

The topbar role switcher changes navigation, landing screen and headline metrics across 11 roles (7 internal, 4 external portals). This is presentation-layer state only — it does **not** enforce access control. Authentication and authorisation are out of scope for Phase 1.

---

## Stack

Next.js 15 · React 19 · TypeScript (strict) · Tailwind CSS v4 · Radix primitives in the shadcn/ui idiom · Framer Motion · Phosphor Icons · Zustand · TanStack Query · React Hook Form + Zod · cmdk

Charts and maps are hand-built SVG — no charting or mapping library — which keeps the bundle lean and gives full control over the visual language.
