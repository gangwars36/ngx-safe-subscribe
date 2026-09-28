import { Subscription } from 'rxjs';

/**
 * A class decorator that automatically unsubscribes from every `Subscription`
 * stored as a property when the component is destroyed.
 *
 * @example
 * // Keep an ngOnDestroy() {} present so Angular's Ivy compiler registers the
 * // lifecycle hook (it may be empty — the decorator fills in the teardown).
 * @AutoUnsubscribe()
 * export class MyComponent implements OnDestroy {
 *   sub1 = this.serviceA.getData().subscribe();
 *   sub2 = this.serviceB.getData().subscribe();
 *   ngOnDestroy() {}
 * }
 */
export function AutoUnsubscribe(): ClassDecorator {
  return function (constructor: any) {
    const originalDestroy: (() => void) | undefined =
      constructor.prototype.ngOnDestroy;

    constructor.prototype.ngOnDestroy = function () {
      for (const key of Object.keys(this)) {
        const prop = this[key];
        if (prop instanceof Subscription) {
          prop.unsubscribe();
        }
      }
      if (typeof originalDestroy === 'function') {
        originalDestroy.apply(this);
      }
    };
  };
}
