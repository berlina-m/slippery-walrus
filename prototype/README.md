# SplitSmart

A Next.js and Prisma prototype for splitting shared expenses.

## Run locally

```bash
cd prototype
npm install
npx prisma migrate dev
npm run dev
```

Open `http://localhost:3000`. If that port is already in use, Next.js prints the available URL in the terminal.

## Verify

```bash
npm test
npm run lint
npm run build
```
