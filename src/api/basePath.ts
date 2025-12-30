const resolveBasePath = (audience?: string) => {
  if (!audience) return '';
  try {
    return new URL(audience).pathname.replace(/\/$/, '');
  } catch {
    return '';
  }
};

export const apiBasePath = resolveBasePath(
  import.meta.env.VITE_AUTH0_AUDIENCE || import.meta.env.AUTH0_AUDIENCE,
);
