# Towr Defenz

## 🚀 Setup
```bash
chmod +x setup.sh
./setup.sh
```
This script installs dependencies and builds the game into the `/docs` folder for easy deployment on GitHub Pages.

When ready for local development:
```bash
npm install
npm run dev
```

GitHub Pages serves the site from the `/docs` folder on the `main` branch.

## 🎮 How to Play

1. Run the development server with `npm run dev`.
2. Open the local URL printed in the terminal (usually `http://localhost:5173`).
3. Click anywhere on the canvas to place towers.
4. Defend your path from the waves of emoji enemies!
5. Harder enemies drop more gold when defeated, allowing faster upgrades.

After building (`./setup.sh`), you can also open `docs/index.html` directly in your browser.
