import { Effect, Match } from 'effect';
import { ClipboardReadError, ClipboardWriteError } from '../services/Clipboard';
import { TabsQueryError } from '../services/Tabs';
import {
  NoValidWebUrlsError,
  type CopyOpenTabLinksResult,
  type OpenClipboardLinksResult,
} from '../workflows/TabClipboard';

export type ActionError =
  | ClipboardReadError
  | ClipboardWriteError
  | NoValidWebUrlsError
  | TabsQueryError;

export type StatusState = 'error' | 'ready' | 'success' | 'working';

export interface ActionStatus {
  readonly message: string;
  readonly state: StatusState;
}

export interface ActionView {
  readonly setBusy: (busy: boolean) => Effect.Effect<void>;
  readonly setStatus: (status: ActionStatus) => Effect.Effect<void>;
}

const errorStatus = (message: string): ActionStatus => ({
  message,
  state: 'error',
});

export const describeError = Match.type<ActionError>().pipe(
  Match.tag('ClipboardReadError', () =>
    errorStatus('Could not read the clipboard. Check permission and try again.'),
  ),
  Match.tag('ClipboardWriteError', () =>
    errorStatus('Could not write to the clipboard. Check permission and try again.'),
  ),
  Match.tag('NoValidWebUrlsError', (error) =>
    errorStatus(
      error.source === 'allWindowsTabs'
        ? 'No HTTP(S) tab links were found in any window.'
        : error.source === 'currentWindowTabs'
          ? 'No HTTP(S) tab links were found in this window.'
          : 'The clipboard has no valid HTTP(S) links.',
    ),
  ),
  Match.tag('TabsQueryError', () =>
    errorStatus('Could not read open tabs. Check permission and try again.'),
  ),
  Match.exhaustive,
);

export const describeCopyResult = ({
  copied,
  skipped,
}: CopyOpenTabLinksResult): ActionStatus => ({
  message: `Copied ${copied} ${copied === 1 ? 'link' : 'links'}.${
    skipped === 0
      ? ''
      : ` Skipped ${skipped} non-web or unavailable ${skipped === 1 ? 'tab' : 'tabs'}.`
  }`,
  state: 'success',
});

export const describeOpenResult = ({
  failed,
  opened,
  skipped,
}: OpenClipboardLinksResult): ActionStatus => ({
  message: `Opened ${opened} ${opened === 1 ? 'tab' : 'tabs'}.${
    skipped === 0
      ? ''
      : ` Skipped ${skipped} invalid ${skipped === 1 ? 'line' : 'lines'}.`
  }${failed === 0 ? '' : ` Failed to open ${failed}.`}`,
  state: failed === 0 ? 'success' : 'error',
});

const unexpectedErrorStatus: ActionStatus = {
  message: 'Something went wrong. Try again.',
  state: 'error',
};

export const executeAction = <Result>(
  action: Effect.Effect<Result, ActionError>,
  pendingMessage: string,
  describeResult: (result: Result) => ActionStatus,
  view: ActionView,
): Effect.Effect<void> =>
  view.setBusy(true).pipe(
    Effect.andThen(
      view.setStatus({ message: pendingMessage, state: 'working' }),
    ),
    Effect.andThen(action),
    Effect.flatMap((result) => view.setStatus(describeResult(result))),
    Effect.catch((error) => view.setStatus(describeError(error))),
    Effect.tapCause(() => view.setStatus(unexpectedErrorStatus)),
    Effect.ensuring(view.setBusy(false)),
  );
