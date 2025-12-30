import { auth } from 'express-oauth2-jwt-bearer';
import { auth0Audience, auth0Domain } from './config.js';

const issuerBaseURL = auth0Domain
  ? auth0Domain.startsWith('http')
    ? auth0Domain
    : `https://${auth0Domain}`
  : null;
const authMiddleware =
  issuerBaseURL && auth0Audience
    ? auth({ issuerBaseURL, audience: auth0Audience })
    : null;

export const requireAuth = (req, res, next) => {
  if (!authMiddleware) {
    return res.status(500).json({ error: 'auth_config_missing' });
  }
  return authMiddleware(req, res, next);
};
