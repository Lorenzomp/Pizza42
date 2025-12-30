import { ManagementClient } from 'auth0';
import { auth0Domain } from './config.js';

const clientId = process.env.AUTH0_MGMT_API_CLIENT_ID;
const clientSecret = process.env.AUTH0_MGMT_API_CLIENT_SECRET;
const audience = process.env.AUTH0_MGMT_AUDIENCE;

const management =
  auth0Domain && clientId && clientSecret && audience
    ? new ManagementClient({
        domain: auth0Domain,
        clientId,
        clientSecret,
        audience,
      })
    : null;

const requireManagement = () => {
  if (!management) {
    throw new Error('Missing Auth0 management configuration');
  }
  return management;
};

export const getUser = async (userId) => {
  const client = requireManagement();
  return client.users.get({ id: userId });
};

export const patchUser = async (userId, body) => {
  const client = requireManagement();
  return client.users.update({ id: userId }, body);
};
