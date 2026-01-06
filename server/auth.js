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

export const requireVerifiedEmail = (req, res, next) => {
  const payload = req.auth?.payload;
  if (!payload || typeof payload !== 'object') {
    return res.status(401).json({ error: 'invalid_token' });
  }

  if (!Object.prototype.hasOwnProperty.call(payload, 'email_verified')) {
    return res.status(403).json({ error: 'email_verified_claim_missing' });
  }

  if (payload.email_verified !== true) {
    return res.status(403).json({ error: 'email_not_verified' });
  }

  return next();
};

export const requireAuth = (req, res, next) => {
  if (!jwtCheck) {
    return res.status(500).json({ error: 'auth_config_missing' });
  }
  return jwtCheck(req, res, next);
};
