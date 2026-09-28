# ngx-safe-subscribe

Two small, focused packages that solve the #1 bug in legacy Angular apps: **leaked RxJS subscriptions**.

| Package | What it does |
|---------|--------------|
| [`ngx-safe-subscribe`](./packages/ngx-safe-subscribe) | **Runtime library** — an `untilDestroyed()` operator and an `@AutoUnsubscribe()` decorator that clean up subscriptions automatically when a component is destroyed. |
| [`ngx-safe-subscribe-cli`](./packages/ngx-safe-subscribe-cli) | **Leak scanner** — a command-line tool that reads your `.ts` files and reports every `.subscribe()` that looks unmanaged, with **file + line number + a total count**. Great for CI. |

Works with **Angular 12 and newer** (and anything on RxJS 6.6+).

---

## Quick start (run it in VS Code)

1. Open this folder in VS Code (`File → Open Folder`).
2. Open a terminal (`` Ctrl+` ``).

### Try the leak scanner
```bash
cd packages/ngx-safe-subscribe-cli
npm install
npm run scan          # scans the bundled ./sample folder as a demo
```
You'll see a report of risky subscriptions with line numbers.

To scan a real project later:
```bash
npm run build
node dist/cli.js scan "C:/path/to/your/angular/project/src"
```

### Build the runtime library
```bash
cd packages/ngx-safe-subscribe
npm install
npm run build         # outputs to ./dist
```

---

## Publishing to npm (when you're ready)

Each package publishes independently.

```bash
# one-time: create a free account at npmjs.com, then
npm login

# from inside a package folder (e.g. packages/ngx-safe-subscribe-cli)
npm run build
npm publish --access public
```

> If a package name is already taken on npm, rename it to a scope you own, e.g.
> `@yourusername/ngx-safe-subscribe`, then publish.

To release an update later: bump the version (`npm version patch`) and `npm publish` again.

---

## How the scanner decides what's "risky"

A `.subscribe()` is treated as **safe** if any of these are true:

- The chain uses a completing operator: `takeUntil`, `takeUntilDestroyed`, `untilDestroyed`, `take`, `first`, `takeWhile`.
- The subscription is added to a composite subscription: `this.sub.add(source.subscribe())`.
- The result is stored in a handle that is `.unsubscribe()`d somewhere in the same file.

Everything else is flagged as **potentially unmanaged**. It's a heuristic — it catches the real leaks without needing to run your app, but always review the findings.
