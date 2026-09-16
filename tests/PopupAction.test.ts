import { assert, describe, it } from '@effect/vitest';
import { Effect, Ref } from 'effect';
import {
  describeCopyResult,
  describeError,
  describeOpenResult,
  executeAction,
  type ActionStatus,
  type ActionView,
} from '../src/popup/Action';
import { NoValidWebUrlsError } from '../src/workflows/TabClipboard';

describe('popup action presentation', () => {
  it('describes copied and skipped tabs', () => {
    assert.deepStrictEqual(describeCopyResult({ copied: 1, skipped: 0 }), {
      message: 'Copied 1 link.',
      state: 'success',
    });
    assert.deepStrictEqual(describeCopyResult({ copied: 2, skipped: 1 }), {
      message: 'Copied 2 links. Skipped 1 non-web or unavailable tab.',
      state: 'success',
    });
  });

  it('describes empty tab results for the selected window scope', () => {
    assert.deepStrictEqual(
      describeError(
        new NoValidWebUrlsError({ source: 'allWindowsTabs', skipped: 0 }),
      ),
      {
        message: 'No HTTP(S) tab links were found in any window.',
        state: 'error',
      },
    );
    assert.deepStrictEqual(
      describeError(
        new NoValidWebUrlsError({ source: 'currentWindowTabs', skipped: 0 }),
      ),
      {
        message: 'No HTTP(S) tab links were found in this window.',
        state: 'error',
      },
    );
  });

  it('uses success only when every valid tab opens', () => {
    assert.deepStrictEqual(
      describeOpenResult({ opened: 3, skipped: 0, failed: 0 }),
      { message: 'Opened 3 tabs.', state: 'success' },
    );
    assert.deepStrictEqual(
      describeOpenResult({ opened: 2, skipped: 0, failed: 1 }),
      {
        message: 'Opened 2 tabs. Failed to open 1.',
        state: 'error',
      },
    );
    assert.deepStrictEqual(
      describeOpenResult({ opened: 0, skipped: 0, failed: 3 }),
      {
        message: 'Opened 0 tabs. Failed to open 3.',
        state: 'error',
      },
    );
  });

  it.effect(
    'restores controls and replaces working status after a defect',
    () =>
      Effect.gen(function* () {
        const busyStates = yield* Ref.make<ReadonlyArray<boolean>>([]);
        const statuses = yield* Ref.make<ReadonlyArray<ActionStatus>>([]);
        const view: ActionView = {
          setBusy: (busy) =>
            Ref.update(busyStates, (states) => [...states, busy]),
          setStatus: (status) =>
            Ref.update(statuses, (entries) => [...entries, status]),
        };

        yield* executeAction(
          Effect.die(new Error('unexpected')),
          'Working...',
          () => ({ message: 'Finished.', state: 'success' }),
          view,
        ).pipe(Effect.ignoreCause);

        assert.deepStrictEqual(yield* Ref.get(busyStates), [true, false]);
        assert.deepStrictEqual(yield* Ref.get(statuses), [
          { message: 'Working...', state: 'working' },
          { message: 'Something went wrong. Try again.', state: 'error' },
        ]);
      }),
  );
});
