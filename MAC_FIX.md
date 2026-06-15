# macOS “*.node cannot be opened” fix (Gatekeeper/quarantine)

If macOS shows popups like:
- `better_sqlite3.node Not Opened`
- `tailwindcss-oxide.darwin-arm64.node Not Opened`

It’s Gatekeeper blocking native Node binaries from a downloaded ZIP.

## Fast fix (recommended)

From the project root:

```bash
npm run mac:unquarantine
```

Or only for the backend dependencies:

```bash
npm run mac:unquarantine:server
```

Then run:

```bash
npm start
```

## If it still blocks

System Settings → Privacy & Security → click **Allow Anyway**, then try again and click **Open**.

## Best practice (optional)

If you don’t need pre-included `node_modules`, you can delete them and reinstall:

```bash
rm -rf server/node_modules
npm --prefix server install
```
