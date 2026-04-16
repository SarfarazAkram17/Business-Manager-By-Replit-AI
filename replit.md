# Business Manager

## Overview

Full-stack pnpm workspace monorepo for a clothing business management app. Features authentication, dashboard, sales/expenses/inventory CRUD, monthly reports, and settings with theme selection.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS v4 + shadcn/ui

## Artifacts

- **API Server** (`artifacts/api-server`) — Express REST API on port 8080
- **Business Manager** (`artifacts/business-manager`) — React frontend at `/`

## App Features

### Authentication
- Register with business name, email, password
- Login/logout (express-session, bcryptjs)
- No theme/currency selection at signup — defaults to Amethyst/BDT

### Dashboard
- Period filters: Today, Week, Month, Year
- Stat cards: Revenue, Profit, Expenses, Net Profit, Total Sales, Items Sold
- Area chart (recharts) for Revenue & Profit
- Recent sales with image slider

### Sales
- CRUD with product name, quantity, buy/sell price, notes, images
- Auto-calculated profit (`(sell - buy) * qty`)
- Date filtering with custom calendar (no future dates)
- Image upload with slider in card view
- Select from inventory

### Expenses
- CRUD with title, amount, category, notes
- Date filtering
- Categories: Rent, Utilities, Supplies, Marketing, Salary, Transport, Other

### Inventory
- CRUD with product images, buy/sell price, quantity
- Grid card layout
- Image lightbox

### Reports
- Monthly report with month/year selector
- Daily area chart, top products, all sales/expenses

### Settings
- Business name
- Theme selection: Amethyst (purple), Emerald (green), Ocean (blue) — all dark
- Currency picker: BDT default, 50+ currencies with symbols
- Settings saved to DB and applied immediately

## Design
- 3 dark themes: Amethyst, Emerald, Ocean (CSS variables on documentElement)
- Custom scrollbar using primary color
- Animated sidebar with mini-collapse mode
- Image lightbox with keyboard navigation
- Custom calendar with ordinal date display

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Database Schema

Tables: `users`, `settings`, `inventory`, `sales`, `expenses`

All tables include `userId` for multi-user isolation. Settings auto-created on first GET.

## Important Notes

- Import API hooks from `"@workspace/api-client-react"` not relative paths
- All textareas use `resize-none`
- Profit = `(sellPrice - buyPrice) * quantity` — calculated server-side on POST /sales
- Images stored as base64 in a text array column
- Currency default: BDT (৳)
- Theme applied as class on documentElement (e.g. `amethyst`, `emerald`, `ocean`)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
