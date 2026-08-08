// Raised when the requested filter combination has no matching recipe.
// Unlike a network or parse failure, the message is safe (and useful) to
// show the user verbatim, and retrying the same request will not help.
export class NoMatchError extends Error {
  constructor(message) {
    super(message);
    this.name = "NoMatchError";
    this.code = "NO_MATCH";
  }
}

export function isNoMatch(err) {
  return err?.code === "NO_MATCH";
}
