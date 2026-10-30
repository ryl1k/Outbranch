/** Raised when a provider cannot be used (missing credentials, disabled mode). Not retryable. */
export class ProviderUnavailableError extends Error {
  constructor(
    readonly provider: "anthropic" | "qloo",
    message: string,
  ) {
    super(message)
    this.name = "ProviderUnavailableError"
  }
}

/** Raised when a provider responds but the result is unusable (refusal, invalid output). */
export class ProviderResponseError extends Error {
  constructor(
    readonly provider: "anthropic" | "qloo",
    message: string,
    readonly retryable = false,
  ) {
    super(message)
    this.name = "ProviderResponseError"
  }
}
