import { Schema } from "effect"

export class ExtensionStatus extends Schema.Class<ExtensionStatus>("tab-clipboard/domain/ExtensionStatus")({
  surface: Schema.Literals(["popup", "sidepanel", "background"]),
  ready: Schema.Boolean
}) {}

export const decodeExtensionStatus = Schema.decodeUnknownEffect(ExtensionStatus)
