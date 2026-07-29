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
- [Push Notifications](#push-notifications)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)
- [Acknowledgements](#acknowledgements)

## About The Project

**Savings Goal Tracker** is a web-based personal finance application designed to help you monitor monthly expenses using the **envelope budgeting system** (sistem wadah). With a cycle-based approach that resets on the 25th of each month, you can track spending across multiple categories (kos, ShopeePay, GoPay, E-Money, Cash, subscriptions), visualize savings progress with interactive charts, and receive real-time push notifications for daily reminders and weekly summaries.

### Built With

[![Next][Next.js]][Next-url]
[![React][React.js]][React-url]
[![Tailwind][Tailwind]][Tailwind-url]
[![AntDesign][AntDesign]][AntDesign-url]
[![Prisma][Prisma]][Prisma-url]

## Getting Started

To get a local copy up and running follow these simple steps.

### Prerequisites

- Node.js (v24+)
- npm

  ```sh
  npm install npm@latest -g
  ```

- PostgreSQL database (local, Railway, Supabase, etc.)

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
   # App identity
   TITLE_WEB="Raihan Yusuf's Savings Goal Tracker"
   APP_WEB="My Savings Goal Tracker"
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

   # Vercel Cron secret
   CRON_SECRET="your-cron-secret"
   ```

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

This application is a personal monthly budget tracker inspired by the envelope budgeting method.

### Features

- **Next.js App Router** with React Server Components for optimal performance.
- **Envelope budgeting system** (sistem wadah) with 6 categories: Kos, ShopeePay, GoPay, E-Money, Cash, and Subscriptions.
- **Cycle-based tracking** that resets on the 25th of each month (billing cycle).
- **Spending limit monitoring** with real-time alerts when exceeding allocated budget.
- **Interactive charts** powered by Chart.js: balance donut, category pie, allocation bar, savings comparison, and cumulative savings line.
- **CRUD purchase management** with table and card views (responsive).
- **CSV import/export** for bulk purchase data.
- **Push notifications** via Web Push API with Vercel Cron Jobs for daily reminders and weekly summaries.
- **Dark/light theme** toggle with system preference detection.
- **Responsive design** for mobile, tablet, and desktop.
- **Prisma ORM** with PostgreSQL for reliable data persistence and automatic retry on connection errors.
- **Ant Design** component library styled with **Tailwind CSS** for a polished UI.

<!-- ### Screenshots

For more details, feel free to check the reference design below.

<details>
  <summary>Show/Hide Reference Image</summary>
  <br>
  <img src="./public/references/savings-goal-tracker.png" alt="Savings Goal Tracker Reference">
</details> -->

## Push Notifications

This app supports real-time push notifications via the **Web Push API** and **Vercel Cron Jobs**:

- **Daily Reminder** (every day at 21:00 WIB): Notifies about today's spending, remaining limit, and cycle progress.
- **Weekly Summary** (every Sunday at 20:00 WIB): Provides a cycle overview with top spending categories, savings progress, and comparison with the previous cycle.

To enable notifications, click the bell icon in the dashboard header and grant browser permission. On the server side, set up VAPID keys and CRON_SECRET as environment variables, and deploy `vercel.json` cron configuration.

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See [`LICENSE`](https://github.com/harbanery/savings-goal-tracker/blob/master/LICENSE) for more information.

## Contact

If you have any questions or inquiries regarding this project, feel free to contact me at ryusuf05@gmail.com

## Acknowledgements

Feel free to check it out:

- [Ant Design](https://ant.design/)
- [Chart.js](https://www.chartjs.org/)
- [Prisma ORM](https://www.prisma.io/)
- [Web Push](https://github.com/web-push-libs/web-push)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Vercel as Deployment](https://vercel.com/)
- [Img Shields](https://shields.io)
- [Choose an Open Source License](https://choosealicense.com/)

<!-- MARKDOWN LINKS & IMAGES -->

[Next.js]: https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white
[Next-url]: https://nextjs.org/
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=white
[React-url]: https://reactjs.org/
[Tailwind]: https://img.shields.io/badge/tailwindcss-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white
[Tailwind-url]: https://tailwindcss.com/
[AntDesign]: https://img.shields.io/badge/antdesign-1677FF?style=for-the-badge&logo=antdesign&logoColor=white
[AntDesign-url]: https://ant.design/
[Prisma]: https://img.shields.io/badge/prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white
[Prisma-url]: https://www.prisma.io/
