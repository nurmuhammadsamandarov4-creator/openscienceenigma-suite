# OpenScienceEnigma Suite (Single localhost)

This repo contains:
- `server/` — OpenScienceEnigma referral + Stripe backend
- `admindashboard/` — Admin dashboard (served at `/admindashboard`)

## One-command setup

```bash
npm run install:all
npm start
```

Then open:
- Backend UI: http://localhost:3000/
- Admin Dashboard: http://localhost:3000/admindashboard

## Notes

### Admin dashboard build
This ZIP includes a **prebuilt** admin dashboard in `admindashboard/dist/`.

- If `admindashboard/package.json` is missing, `npm start` will **skip** building the dashboard and just copy `admindashboard/dist` to `server/public/admindashboard`.
- If later you add the full dashboard source (with `admindashboard/package.json`), `npm start` will automatically build it again.

### macOS “*.node Not Opened” popups
If macOS blocks native Node binaries (Gatekeeper/quarantine), run:

```bash
npm run mac:unquarantine
```

More help: see `MAC_FIX.md`.

### Run the dashboard in dev mode (optional)
If you have the full dashboard source available:

```bash
npm --prefix admindashboard run dev
```

(Usually on http://localhost:5173)
