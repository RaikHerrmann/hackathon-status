const { TableClient } = require("@azure/data-tables");

/**
 * Custom credential for Azure Static Web Apps managed identity.
 * Calls the SWA identity endpoint directly, avoiding @azure/identity SDK
 * compatibility issues with SWA's token response format.
 */
class SwaIdentityCredential {
  async getToken(scopes) {
    const endpoint = process.env.IDENTITY_ENDPOINT;
    const header = process.env.IDENTITY_HEADER;
    if (!endpoint || !header) {
      throw new Error("Managed identity not available (IDENTITY_ENDPOINT or IDENTITY_HEADER not set)");
    }
    const resource = (Array.isArray(scopes) ? scopes[0] : scopes).replace("/.default", "");
    const url = `${endpoint}?resource=${encodeURIComponent(resource)}&api-version=2019-08-01`;
    const res = await fetch(url, { headers: { "X-IDENTITY-HEADER": header } });
    if (!res.ok) throw new Error(`Identity endpoint returned ${res.status}: ${await res.text()}`);
    const json = await res.json();
    return {
      token: json.access_token,
      expiresOnTimestamp: json.expires_on ? Number(json.expires_on) * 1000 : Date.now() + 3600000,
    };
  }
}

const credential = new SwaIdentityCredential();

function getTableClient(tableName) {
  const name = process.env.STORAGE_ACCOUNT_NAME;
  if (!name) throw new Error("STORAGE_ACCOUNT_NAME is not set");
  const url = `https://${name}.table.core.windows.net`;
  return new TableClient(url, tableName, credential);
}

function getRoundsTable() {
  return getTableClient("rounds");
}

function getParticipantsTable() {
  return getTableClient("participants");
}

module.exports = { getRoundsTable, getParticipantsTable };
