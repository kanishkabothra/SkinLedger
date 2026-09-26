# SkinLedger

SkinLedger is a personal skincare and beauty-product management dashboard. It brings your product shelf, skincare routines, skin check-ins, recommendations, and spending insights together in one place.

The project is designed to help you make more informed use of products you already own: keep a record of what you buy and use, build routines from your collection, spot products that may be going unused, and understand how your spending is distributed.

> **Note:** SkinLedger is an informational project, not a medical or dermatological tool. Skin scan results are approximate and should not be used to diagnose or treat a skin condition.

## Features

- **Skin scan and profile:** Upload a photo for an approximate skin-type analysis, with a confidence score and the image characteristics behind the result. Set up a profile to tailor the experience.
- **Progress tracking:** Save skin check-ins over time and view score trends in a chart.
- **Product ledger and vanity audit:** Record products, categories, prices, purchase and last-used dates, and other details. Review your shelf to spot duplicates, rarely used products, and stock that may be sitting idle.
- **Routine builder:** Create morning, evening, or other routines from products in your ledger, arrange their order, and update them as your collection changes.
- **Beauty finance analytics:** Set a budget and review spending by category, cost per use, cost per improvement, and the value of unused products.
- **Product recommendations:** Explore recommendations informed by your skin profile, remaining budget, and products you already own.
- **SkinLedger Score:** See a combined score based on skin health, routine consistency, budget efficiency, and product suitability.
- **Browser-based persistence:** Your profile, products, routines, check-ins, and budget are saved in your browser's local storage. There is no account or server setup required for local development.

## Technology

SkinLedger is a client-side web app built with **React** and **Vite**. It uses **Recharts** for data visualizations, **Three.js** for 3D graphics, and **Lucide React** for icons.

## Using the app

1. Start the development server using the instructions below.
2. Open the local URL shown in your terminal.
3. Explore the sections from the app navigation. Add or update products in your ledger, then use those products to create routines and review spending.
4. Optionally set up your profile and add a skin scan or progress check-in to explore personalized recommendations and score trends.

The app includes sample product data to make the dashboard useful on first launch. Changes are saved in the current browser, so opening the app in a different browser or clearing its site data will not carry over your saved information.

## Run the project on Windows

### 1. Install Node.js

Download and install the current **LTS** version of Node.js from [nodejs.org](https://nodejs.org/). npm is included with the Node.js installer.

After installation, open a **new** PowerShell or Command Prompt window and check that both commands are available:

```powershell
node --version
npm.cmd --version
```

Each command should print a version number. If either command is not recognized, restart your terminal (or computer) and try again.

### 2. Download the project

If you have Git installed, clone the repository:

```powershell
git clone https://github.com/kanishkabothra/SkinLedger.git
cd SkinLedger\skinledger
```

Alternatively, on GitHub select **Code → Download ZIP**, extract the ZIP, open a terminal in the extracted project folder, and change into its `skinledger` subfolder:

```powershell
cd path\to\SkinLedger\skinledger
```

The application and its npm scripts are in this `skinledger` subfolder.

### 3. Install dependencies

Run this from the `skinledger` folder:

```powershell
npm.cmd install
```

If Tailwind CSS or its Vite plugin is missing, install them from the same folder:

```powershell
npm.cmd install tailwindcss @tailwindcss/vite
```

### 4. Start the development server

```powershell
npm.cmd run dev
```

Open the local URL printed in the terminal (usually `http://localhost:5173`) in your browser. Keep the terminal open while using the app. Press **Ctrl+C** in the terminal to stop the server.

## Other commands

Run these from the `skinledger` folder:

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run preview
```

`build` creates a production-ready site in `skinledger/dist`. Run `build` before `preview` to preview that production build locally.

## Project layout

```text
SkinLedger/
├── ...                    # Repository-level files
├── README.md
└── skinledger/
    ├── ...                # App configuration and assets
    ├── package.json       # App scripts and dependencies
    ├── index.html         # Vite HTML entry point
    ├── src/
    │   ├── App.jsx        # App interface and feature logic
    │   ├── App.css        # App styles
    │   ├── index.css      # Global styles
    │   └── main.jsx       # React entry point
    └── public/            # Static assets
```
