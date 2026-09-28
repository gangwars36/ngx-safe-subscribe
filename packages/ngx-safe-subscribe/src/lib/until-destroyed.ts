import { MonoTypeOperatorFunction, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

const DESTROY$ = Symbol('ngx-safe-subscribe/destroy$');

/**
 * Class decorator that wires up teardown for {@link untilDestroyed}.
 *
 * It patches the component/directive's `ngOnDestroy` **on the prototype at
 * class-definition time**, which is early enough for Angular's Ivy compiler to
 * register the lifecycle hook. When the component is destroyed, it completes
 * the per-instance destroy Subject that `untilDestroyed(this)` listens to.
 *
 * @example
 * (at)UntilDestroy()
 * (at)Component({ ... })
 * export class MyComponent {
 *   ngOnInit() {
 *     this.service.getData()
 *       .pipe(untilDestroyed(this))
 *       .subscribe();
 *   }
 * }
 */
export function UntilDestroy(): ClassDecorator {
  return (target: any) => {
    const proto = target.prototype;
    const original: (() => void) | undefined = proto.ngOnDestroy;

    proto.ngOnDestroy = function () {
      const subject: Subject<void> | undefined = this[DESTROY$];
      if (subject) {
        subject.next();
        subject.complete();
      }
      if (typeof original === 'function') {
        original.call(this);
      }
    };
  };
}

/**
 * An RxJS operator that completes the stream when the host component is
 * destroyed. Requires the class to be decorated with {@link UntilDestroy}.
 *
 * @param instance The component/directive instance — usually `this`.
 */
export function untilDestroyed<T>(instance: any): MonoTypeOperatorFunction<T> {
  let subject: Subject<void> = instance[DESTROY$];
  if (!subject) {
    subject = new Subject<void>();
    Object.defineProperty(instance, DESTROY$, {
      value: subject,
      enumerable: false,
      writable: true,
      configurable: true,
    });
  }
  return (source: Observable<T>) => source.pipe(takeUntil<T>(subject));
}
