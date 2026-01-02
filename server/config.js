import dotenv from 'dotenv';

dotenv.config();

const audience = process.env.AUTH0_AUDIENCE;
const domain = process.env.AUTH0_DOMAIN;

const resolveBasePath = (value) => {
  if (!value) return '';
  try {
    const pathname = new URL(value).pathname;
    return pathname.replace(/\/$/, '');
  } catch {
    return '';
  }
};

export const auth0Audience = audience;
export const auth0Domain = domain;
export const auth0Issuer = `https://${domain}/`;
export const basePath = resolveBasePath(audience);
export const port = process.env.PORT || 3000;
