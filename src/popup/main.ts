import { Effect, Layer } from 'effect';
import '../../popup/style.css';
import {
  ClipboardLive,
  ClipboardReadError,
  ClipboardWriteError,
} from '../services/Clipboard';
import { TabsLive, TabsQueryError } from '../services/Tabs';
import { queryElement } from '../shared/Dom';
import { run } from '../shared/run';
import {
  NoValidWebUrlsError,
  copyOpenTabLinks,
  openClipboardLinks,
  type CopyOpenTabLinksResult,
  type OpenClipboardLinksResult,
} from '../workflows/TabClipboard';

type ActionError =
  | ClipboardReadError
  | ClipboardWriteError
  | NoValidWebUrlsError
  | TabsQueryError;

type StatusState = 'error' | 'ready' | 'success' | 'working';

const AppLive = Layer.mergeAll(TabsLive, ClipboardLive);

const describeError = (error: ActionError): string => {
  switch (error._tag) {
    case 'ClipboardReadError':
      return 'Could not read the clipboard. Check permission and try again.';
    case 'ClipboardWriteError':
      return 'Could not write to the clipboard. Check permission and try again.';
    case 'NoValidWebUrlsError':
      return error.source === 'tabs'
        ? 'No open HTTP(S) tab links were found.'
        : 'The clipboard has no valid HTTP(S) links.';
    case 'TabsQueryError':
      return 'Could not read open tabs. Check permission and try again.';
  }
};

const describeCopyResult = ({
  copied,
  skipped,
}: CopyOpenTabLinksResult): string =>
  `Copied ${copied} ${copied === 1 ? 'link' : 'links'}.${
    skipped === 0
      ? ''
      : ` Skipped ${skipped} non-web or unavailable ${skipped === 1 ? 'tab' : 'tabs'}.`
  }`;

const describeOpenResult = ({
  failed,
  opened,
  skipped,
}: OpenClipboardLinksResult): string =>
  `Opened ${opened} ${opened === 1 ? 'tab' : 'tabs'}.${
    skipped === 0
      ? ''
      : ` Skipped ${skipped} invalid ${skipped === 1 ? 'line' : 'lines'}.`
  }${failed === 0 ? '' : ` Failed to open ${failed}.`}`;

const program = Effect.gen(function* () {
  const shell = yield* queryElement<HTMLElement>('.popup-shell');
  const copyButton = yield* queryElement<HTMLButtonElement>('#copy-tab-links');
  const openButton = yield* queryElement<HTMLButtonElement>(
    '#open-clipboard-links',
  );
  const status = yield* queryElement<HTMLElement>('#runtime-status');
  const statusMessage = yield* queryElement<HTMLElement>('.status-message');
  const buttons = [copyButton, openButton] as const;

  const setBusy = (busy: boolean): void => {
    shell.setAttribute('aria-busy', String(busy));
    for (const button of buttons) {
      button.disabled = busy;
    }
  };

  const setStatus = (message: string, state: StatusState): void => {
    statusMessage.textContent = message;
    status.dataset['state'] = state;
  };

  const runAction = <Result>(
    action: Effect.Effect<Result, ActionError>,
    pendingMessage: string,
    describeResult: (result: Result) => string,
  ): void => {
    setBusy(true);
    setStatus(pendingMessage, 'working');
    run(
      action.pipe(
        Effect.tap((result) =>
          Effect.sync(() => setStatus(describeResult(result), 'success')),
        ),
        Effect.catch((error) =>
          Effect.sync(() => setStatus(describeError(error), 'error')),
        ),
        Effect.ensuring(Effect.sync(() => setBusy(false))),
      ),
    );
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
