// Some tokens look like claims and are not expected to be returned in the OAuth `scope` field.
// Keep `email_verified` as it is used as a custom scope trigger in Auth0 Actions for this project.
const CLAIM_LIKE_TOKENS = new Set(['phone_number_verified']);

export function sanitizeScopeString(scope?: string) {
  return Array.from(
    new Set(
      (scope ?? '')
        .split(/\s+/)
        .map((value) => value.trim())
        .filter(Boolean)
        .filter((value) => !CLAIM_LIKE_TOKENS.has(value)),
    ),
  ).join(' ');
}
