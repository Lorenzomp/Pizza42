const resolveScope = (value?: string) => value?.trim() ?? '';

export const auth0Scopes = {
  login: resolveScope(import.meta.env.AUTH0_SCOPE_LOGIN),
  profile: resolveScope(import.meta.env.AUTH0_SCOPE_PROFILE),
  checkout: resolveScope(import.meta.env.AUTH0_SCOPE_CHECKOUT),
};
