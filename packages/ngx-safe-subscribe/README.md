# ngx-safe-subscribe

Zero-boilerplate RxJS auto-unsubscribe for Angular. Stop writing `takeUntil(this.destroy$)` plumbing in every component.

Works with **Angular 12+** and **RxJS 6.6+**.

## Install

```bash
npm install ngx-safe-subscribe
```

## Option 1 — the `untilDestroyed()` operator

Decorate the class with `@UntilDestroy()`, then pipe through `untilDestroyed(this)`:

```typescript
import { Component } from '@angular/core';
import { UntilDestroy, untilDestroyed } from 'ngx-safe-subscribe';

@UntilDestroy()
@Component({ /* ... */ })
export class MyComponent {
  ngOnInit() {
    this.service.getData()
      .pipe(untilDestroyed(this))   // auto-completes on destroy
      .subscribe(data => this.data = data);
  }
}
```

The `@UntilDestroy()` decorator wires up the teardown at class-definition time,
so it works reliably under Angular's AOT/Ivy production builds.

## Option 2 — the `@AutoUnsubscribe()` decorator

```typescript
import { Component, OnDestroy } from '@angular/core';
import { AutoUnsubscribe } from 'ngx-safe-subscribe';

@AutoUnsubscribe()
@Component({ /* ... */ })
export class MyComponent implements OnDestroy {
  sub1 = this.serviceA.getData().subscribe();
  sub2 = this.serviceB.getData().subscribe();

  ngOnDestroy() {}   // keep present (may be empty)
}
```

Every property that holds a `Subscription` is unsubscribed automatically when the component is destroyed.

## Why the class decorators?

Angular's Ivy compiler reads a component's `ngOnDestroy` from the **prototype**,
captured before your code runs. Patching an instance at runtime is therefore
ignored in production (AOT) builds. Both `@UntilDestroy()` and `@AutoUnsubscribe()`
sidestep this by patching the prototype at **class-definition time**, which is
early enough for Ivy to register the hook. That's why the operator needs its
`@UntilDestroy()` companion decorator.

## License

MIT
