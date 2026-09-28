# ngx-safe-subscribe-cli

A command-line tool that scans an Angular / RxJS codebase for **unmanaged subscriptions** — the `.subscribe()` calls that are never torn down and leak memory. It reports the **file, line number, and a total count**, and exits with code `1` when leaks are found so you can wire it into CI.

## Install

```bash
npm install --save-dev ngx-safe-subscribe-cli
```

Or run it once without installing:

```bash
npx ngx-safe-subscribe-cli scan ./src
```

## Usage

```bash
ngx-safe-subscribe scan <path> [--json]
```

Examples:

```bash
ngx-safe-subscribe scan ./src
ngx-safe-subscribe scan "src/**/*.ts"
ngx-safe-subscribe scan ./src --json
```

### Example output

```
🔍  Scanned 42 file(s) in "./src"

⚠️   2 potentially unmanaged subscription(s):

  src/app/home/home.component.ts:24:5
     interval(1000).subscribe((x) => console.log(x))

  src/app/list/list.component.ts:41:9
     this.dataService.getUsers().subscribe((u) => (this.users = u))

Summary: 2 risky / 13 safe / 15 total subscriptions.
```

## Use it in CI

Because it exits with code `1` when leaks are found, you can block merges that introduce new leaks:

```yaml
# package.json
"scripts": {
  "lint:leaks": "ngx-safe-subscribe scan ./src"
}
```

## What counts as "safe"

A subscription is considered safe when:

- The chain uses a completing operator — `takeUntil`, `takeUntilDestroyed`, `untilDestroyed`, `take`, `first`, `takeWhile`.
- It's added to a composite subscription — `this.sub.add(source.subscribe())`.
- Its handle is `.unsubscribe()`d somewhere in the same file.
- It's stored on `this` in a class decorated with `@AutoUnsubscribe()` (the decorator tears it down automatically).

Everything else is flagged. This is a heuristic (it doesn't run your app), so review findings before acting on them.

## License

MIT
