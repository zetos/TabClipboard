import { Effect, Layer } from 'effect';
import '../../popup/style.css';
import { ClipboardLive } from '../services/Clipboard';
import { TabsLive } from '../services/Tabs';
import { queryElement } from '../shared/Dom';
import { run } from '../shared/run';
import {
  copyAllOpenTabLinks,
  copyCurrentWindowTabLinks,
  openClipboardLinks,
} from '../workflows/TabClipboard';
import {
  describeCopyResult,
  describeOpenResult,
  executeAction,
  type ActionError,
  type ActionStatus,
} from './Action';

const AppLive = Layer.mergeAll(TabsLive, ClipboardLive);

const program = Effect.gen(function* () {
  const shell = yield* queryElement<HTMLElement>('.popup-shell');
  const copyAllButton = yield* queryElement<HTMLButtonElement>(
    '#copy-all-tab-links',
  );
  const copyCurrentButton = yield* queryElement<HTMLButtonElement>(
    '#copy-current-tab-links',
  );
  const openButton = yield* queryElement<HTMLButtonElement>(
    '#open-clipboard-links',
  );
  const status = yield* queryElement<HTMLElement>('#runtime-status');
  const statusMessage = yield* queryElement<HTMLElement>('.status-message');
  const buttons = [copyAllButton, copyCurrentButton, openButton] as const;

  const view = {
    setBusy: (busy: boolean) =>
      Effect.sync(() => {
        shell.setAttribute('aria-busy', String(busy));
        for (const button of buttons) {
          button.disabled = busy;
        }
      }),
    setStatus: ({ message, state }: ActionStatus) =>
      Effect.sync(() => {
        statusMessage.textContent = message;
        status.dataset['state'] = state;
      }),
  };

  const runAction = <Result>(
    action: Effect.Effect<Result, ActionError>,
    pendingMessage: string,
    describeResult: (result: Result) => ActionStatus,
  ): void => {
    run(executeAction(action, pendingMessage, describeResult, view));
  };

  yield* Effect.sync(() => {
    copyAllButton.addEventListener('click', () => {
      runAction(
        copyAllOpenTabLinks.pipe(Effect.provide(AppLive)),
        'Collecting links from all windows...',
        describeCopyResult,
      );
    });

    copyCurrentButton.addEventListener('click', () => {
      runAction(
        copyCurrentWindowTabLinks.pipe(Effect.provide(AppLive)),
        'Collecting links from this window...',
        describeCopyResult,
      );
    });

    openButton.addEventListener('click', () => {
      runAction(
        openClipboardLinks.pipe(Effect.provide(AppLive)),
        'Reading links from the clipboard...',
        describeOpenResult,
      );
    });
  });
});

run(program);
