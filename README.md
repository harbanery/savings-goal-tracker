<a name="readme-top"></a>

<div align="center">
  <a href="https://github.com/harbanery/savings-goal-tracker">
    <img src="./public/logo.png" alt="Logo" width="80">
  </a>

  <h1 align="center">Savings Goal Tracker</h1>

  <p align="center">
    Monthly Budget Tracker with Envelope System
    <br />
    <br />
    <a href="https://savings-goal-tracker.vercel.app/" target="_blank">View Demo</a>
  </p>
</div>

## Table of Contents

- [Table of Contents](#table-of-contents)
- [About The Project](#about-the-project)
  - [Built With](#built-with)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Setup Environment Variables](#setup-environment-variables)
  - [Database Setup](#database-setup)
  - [Running the Application](#running-the-application)
- [Usage](#usage)
  - [Features](#features)
  - [Customizing Categories](#customizing-categories)
  - [Push Notifications](#push-notifications)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)
- [Acknowledgements](#acknowledgements)

## About The Project

My web-based application, **Savings Goal Tracker**, is a personal finance dashboard that helps you monitor monthly expenses using the **envelope budgeting system** (sistem wadah). With a cycle-based approach that resets on the 25th of each month, you can track spending across multiple envelopes (Kos, ShopeePay, GoPay, E-Money, Cash, Subscriptions), visualize savings progress with interactive charts, receive real-time push notifications for daily reminders and weekly summaries, and switch instantly between Indonesian and English. Whether you want to stay within budget or grow your savings, **Savings Goal Tracker** keeps your finances on track.

### Built With

[![Next][Next.js]][Next-url]
[![React][React.js]][React-url]
[![Ant Design][Ant Design]][Ant Design-url]
[![Tailwind][Tailwind]][Tailwind-url]
[![Prisma][Prisma]][Prisma-url]
[![PostgreSQL][PostgreSQL]][PostgreSQL-url]
[![TypeScript][TypeScript]][TypeScript-url]
[![Node][Node.js]][Node-url]

## Getting Started

To get a local copy up and running follow these simple steps.

### Prerequisites

- Node.js (v24+)
- npm

  ```sh
  npm install npm@latest -g
  ```

- PostgreSQL database (e.g. [Railway](https://railway.app/) or local)

### Installation

1. Clone Repo

   ```sh
   git clone https://github.com/harbanery/savings-goal-tracker.git
   ```

2. Go to folder directory

   ```bash
   cd savings-goal-tracker
   ```

3. Install NPM packages

   ```sh
   npm install
   ```

### Setup Environment Variables

1. Create a `.env` file in your local root directory (copy from `.env.example`).

2. Add the following variables to the `.env` file:

   ```sh
   # App identity (optional, for branding/metadata)
   TITLE_WEB="Savings Goal Tracker"
   APP_WEB="Savings Goal Tracker"
   DESCRIPTION_WEB="Pantau target tabungan dan progres menabung Anda."

   NEXT_PUBLIC_URL="http://localhost:3000"
   NEXT_PUBLIC_API_BASE_URL="http://localhost:3000/api"

   # Budget config - initial balance per cycle (top-up on the 25th)
   NEXT_PUBLIC_SAVINGS_INITIAL=6000000

   # PostgreSQL database connection URL
   DATABASE_URL="postgresql://user:password@host:port/dbname"

   # Web Push VAPID keys (generate: npx web-push generate-vapid-keys --json)
   NEXT_PUBLIC_VAPID_PUBLIC_KEY="your-vapid-public-key"
   VAPID_PRIVATE_KEY="your-vapid-private-key"
   VAPID_SUBJECT="mailto:you@example.com"

   # Vercel Cron secret (generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   CRON_SECRET="your-cron-secret"
   ```

### Public Mockup Mode (Optional)

Want to share a public demo of this app without exposing your personal database and categories? Just **leave `DATABASE_URL` empty** (or remove it entirely).

- When `DATABASE_URL` is **empty**, the app automatically runs in **mockup mode**:
  - No database is ever queried — all purchases live only in browser memory and disappear on reload.
  - A dismissible banner informs visitors that data is temporary.
  - Generic demo categories (Cash, Bank Transfer, E-Wallet, Subscriptions, Transport Card) are used instead of the owner's personal ones. See [`src/models/demoCategories.ts`](src/models/demoCategories.ts).
  - Push notification subscriptions are hidden (they require a database).
- When `DATABASE_URL` is **set**, everything runs the normal database flow with your own categories.

The mode is detected at build time from the environment, so the same codebase serves both the personal deployment and the public mockup.

### Database Setup

1. Generate the Prisma client (runs automatically on `npm install`):

   ```sh
   npm run db:generate
   ```

2. Push the schema to your database:

   ```sh
   npm run db:push
   ```

   Or create a migration:

   ```sh
   npm run db:migrate
   ```

### Running the Application

1. Start the development server:

   ```sh
   npm run dev
   ```

2. Open your browser and locally navigate to:

   ```sh
   http://localhost:3000
   ```

## Usage

This application is a personal monthly budget tracker inspired by the envelope budgeting method. Track each purchase by category, monitor your spending limit, and watch your cumulative savings grow across cycles.

### Features

- **Next.js App Router** with React Server Components and Server Actions for data mutations.
- **Envelope budgeting system** (sistem wadah) with 7 allocated wallets (Cash, Livin, Jenius - Langganan, GoPay, ShopeePay, E-Money, Link Aja - Paket Kuota). Spending is logged per **subcategory** (e.g. Ojol, KRL, Bayar Kos); each wallet's total is the accumulation of its subcategories. Legacy category IDs in the database are mapped automatically via `LEGACY_ALIASES`.
- **Public mockup mode**: with an empty `DATABASE_URL`, the app runs as a database-free demo with generic categories and in-memory data (cleared on reload) — perfect for sharing a public showcase.
- **Cycle-based tracking** that resets on the 25th of each month (billing cycle).
- **Spending limit monitoring** with real-time alerts when exceeding the allocated budget.
- **Interactive charts** powered by Chart.js: balance donut, category pie, allocation bar, savings comparison, and cumulative savings line.
- **CRUD purchase management** with a responsive table for tablet/desktop and card list for mobile.
- **CSV import/export** for bulk purchase data (compatible with Google Sheets).
- **Automated Notifications** via [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs) with 7 notification types: tracking nudge (daily), category spotlight (weekly), cycle reset reminder, new cycle kickoff with allocation suggestions, end-of-cycle recap, CSV export reminder, and quarterly trend report.
- **Multi-language support** (Indonesian & English) with instant switching, integrated with Ant Design and dayjs locales.
- **Responsive design** for mobile, tablet, and desktop.
- **Dark/Light mode** with localStorage persistence and system preference detection.
- **Categories as single source of truth** in [`src/models/categories.ts`](src/models/categories.ts) with built-in multi-language support.
- **PostgreSQL database** managed via **Prisma ORM** with automatic retry on connection errors.
- **UI components** with **Ant Design** and **Tailwind CSS** styling.
- **Chart visualizations** using [Chart.js](https://www.chartjs.org/) and [react-chartjs-2](https://react-chartjs-2.js.org/).
- **Linting** with **ESLint** for maintaining code quality.

### Customizing Categories & Subcategories

All spending wallets (categories) and their subcategories are defined in a **single file**: [`src/models/categories.ts`](src/models/categories.ts). This is the single source of truth - you only need to edit this one file to add, remove, or modify categories/subcategories. Purchases store the **subcategory ID** (or the category ID itself for wallets without subcategories) in `Purchase.categoryId`.

Each category supports **multiple languages** via the `LocaleText` type (`{ id: "...", en: "..." }`):

```typescript
// src/models/categories.ts
export const CATEGORIES: BudgetCategory[] = [
  {
    id: "livin", // unique wallet identifier
    label: { id: "Livin", en: "Livin" }, // label per language
    description: {
      // description per language
      id: "Transfer utama: kos, belanja, laundry, makanan",
      en: "Main transfers: rent, shopping, laundry, food",
    },
    color: "#6366f1", // hex color
    allocation: 1_700_000, // monthly allocation in rupiah
    subcategories: [
      // spending is logged per subcategory; omit this field for wallets
      // without subcategories (the category ID is then used directly)
      { id: "kos", label: { id: "Bayar Kos", en: "Boarding Rent" } },
      { id: "livin-belanja", label: { id: "Belanja", en: "Shopping" } },
      // ... add or remove subcategories here
    ],
  },
  // ... add or remove categories here
];
```

**To add a new category or subcategory:**

1. Open `src/models/categories.ts`
2. Add a new object to the `CATEGORIES` array (or to a category's `subcategories`) with a unique `id`, `label`, `description`, `color`, and `allocation`

**To keep old database IDs working:**

Old category IDs are never deleted. Map them to a new subcategory in `LEGACY_ALIASES` (also in `src/models/categories.ts`) so historical purchases resolve automatically at runtime.

**To add a new language:**

1. Add the locale code to the `Locale` type in `src/models/types.ts`
2. Add the new language key to every `LocaleText` object in `src/models/categories.ts`
3. Add translations in `src/components/locale/translations.ts`
4. Add the locale to `LOCALES` and `LOCALE_LABELS` in `src/components/locale/translations.ts`

### Push Notifications

This app supports automated notifications via the **Web Push API** (for push) and **Email** (for rich summaries) through **Vercel Cron Jobs**:

| Notification             | Schedule                           | Channel | Description                                              |
| ------------------------ | ---------------------------------- | ------- | -------------------------------------------------------- |
| **Tracking Nudge**       | Daily, 20:00 WIB                   | Push    | Reminds to log spending only if no transactions today    |
| **Category Spotlight**   | Every Friday, 20:00 WIB            | Push    | Highlights the most overspent envelope this week         |
| **Cycle Reset Reminder** | 24th of month, 20:00 WIB           | Push    | Warns that the cycle ends tomorrow                       |
| **New Cycle Kickoff**    | 25th of month, 08:00 WIB           | Email   | Welcomes new cycle with balance & allocation suggestions |
| **Monthly Summary**      | 24th of month, 21:00 WIB           | Email   | End-of-cycle recap with spending breakdown & comparison  |
| **CSV Export Reminder**  | 1st of month, 00:00 WIB            | Email   | Reminds to backup data via CSV export                    |
| **Quarterly Trend**      | 24th of Mar/Jun/Sep/Dec, 23:59 WIB | Email   | Quarterly savings trend report across 3 cycles           |

To enable notifications:

1. **Push:** Click the bell icon in the dashboard header and grant browser permission. Set up VAPID keys in environment variables.
2. **Email:** Configure SMTP settings (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `NOTIFICATION_EMAIL_TO`).
3. **Cron Jobs:** Set `CRON_SECRET` and deploy `vercel.json` cron configuration to Vercel.

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for more information.

## Contact

If you have any questions or inquiries regarding this project, feel free to contact me at [ryusuf05@gmail.com](mailto:ryusuf05@gmail.com)

## Acknowledgements

Feel free to check it out:

- [Next.js Documentation](https://nextjs.org/docs)
- [Ant Design](https://ant.design/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Prisma](https://www.prisma.io/)
- [Chart.js](https://www.chartjs.org/)
- [Web Push Protocol](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Img Shields](https://shields.io)
- [Choose an Open Source License](https://choosealicense.com/)

<!-- MARKDOWN LINKS & IMAGES -->

[Node.js]: https://img.shields.io/badge/node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white
[Node-url]: https://nodejs.org/en
[Next.js]: https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white
[Next-url]: https://nextjs.org/
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=white
[React-url]: https://reactjs.org/
[Ant Design]: https://img.shields.io/badge/Ant_Design-1677FF?style=for-the-badge&logo=antdesign&logoColor=white
[Ant Design-url]: https://ant.design/
[Tailwind]: https://img.shields.io/badge/tailwindcss-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white
[Tailwind-url]: https://tailwindcss.com/
[Prisma]: https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white
[Prisma-url]: https://www.prisma.io/
[PostgreSQL]: https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white
[PostgreSQL-url]: https://www.postgresql.org/
[TypeScript]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
