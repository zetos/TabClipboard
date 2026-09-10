import { Effect, Layer } from 'effect';
import '../../popup/style.css';
import { ClipboardLive } from '../services/Clipboard';
import { TabsLive } from '../services/Tabs';
import { queryElement } from '../shared/Dom';
import { run } from '../shared/run';
import {
  copyOpenTabLinks,
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
  const copyButton = yield* queryElement<HTMLButtonElement>('#copy-tab-links');
  const openButton = yield* queryElement<HTMLButtonElement>(
    '#open-clipboard-links',
  );
  const status = yield* queryElement<HTMLElement>('#runtime-status');
  const statusMessage = yield* queryElement<HTMLElement>('.status-message');
  const buttons = [copyButton, openButton] as const;

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
    copyButton.addEventListener('click', () => {
      runAction(
        copyOpenTabLinks.pipe(Effect.provide(AppLive)),
        'Collecting links from open tabs...',
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
