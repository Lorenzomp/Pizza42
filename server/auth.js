import { auth } from 'express-oauth2-jwt-bearer';
import { auth0Audience, auth0Issuer } from './config.js';

export const jwtCheck =
  auth0Issuer && auth0Audience
    ? auth({
      audience: auth0Audience,
      issuerBaseURL: auth0Issuer,
      tokenSigningAlg: 'RS256',
    })
    : null;

export const requireAuth = (req, res, next) => {
  if (!jwtCheck) {
    return res.status(500).json({ error: 'auth_config_missing' });
  }
  return jwtCheck(req, res, next);
};
