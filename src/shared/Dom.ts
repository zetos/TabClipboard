import { Effect, Schema } from "effect"

export class MissingElementError extends Schema.TaggedError<MissingElementError>()("MissingElementError", {
  selector: Schema.String
}) {}

export const queryElement = <ElementType extends Element>(selector: string) =>
  Effect.fromNullishOr(document.querySelector<ElementType>(selector)).pipe(
    Effect.mapError(() => new MissingElementError({ selector }))
  )
