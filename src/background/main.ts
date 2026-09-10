import { Effect } from 'effect';
import { ExtensionStatus } from '../domain/ExtensionStatus';
import { run } from '../shared/run';

chrome.runtime.onInstalled.addListener(() => {
  const status = new ExtensionStatus({ surface: 'background', ready: true });

  run(
    Effect.logInfo('TabClipboard installed').pipe(
      Effect.annotateLogs({ surface: status.surface, ready: status.ready }),
    ),
  );
});
