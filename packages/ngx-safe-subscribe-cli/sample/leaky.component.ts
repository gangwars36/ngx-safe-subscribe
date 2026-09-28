import { Component, OnInit } from '@angular/core';
import { interval, Subscription, Subject } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';

// A demo component with a mix of safe and unsafe subscriptions,
// so you can see what the scanner reports.
@Component({ selector: 'app-leaky', template: '' })
export class LeakyComponent implements OnInit {
  private sub = new Subscription();
  private destroy$ = new Subject<void>();
  users: unknown;

  constructor(private dataService: any, private http: any) {}

  ngOnInit(): void {
    // ❌ RISKY: never torn down — leaks forever
    interval(1000).subscribe((x) => console.log(x));

    // ❌ RISKY: no unsubscribe / no completing operator
    this.dataService.getUsers().subscribe((u: unknown) => (this.users = u));

    // ✅ SAFE: take(1) completes the stream
    this.http.get('/api/config').pipe(take(1)).subscribe();

    // ✅ SAFE: takeUntil(destroy$) tears down on destroy
    interval(500).pipe(takeUntil(this.destroy$)).subscribe();

    // ✅ SAFE: added to a composite Subscription
    this.sub.add(interval(200).subscribe());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.sub.unsubscribe();
  }
}
