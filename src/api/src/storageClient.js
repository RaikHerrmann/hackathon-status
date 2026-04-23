const { TableClient, TableServiceClient } = require("@azure/data-tables");
const { DefaultAzureCredential } = require("@azure/identity");

const tableCache = {};

function getAccountUrl() {
  const name = process.env.STORAGE_ACCOUNT_NAME;
  if (!name) throw new Error("STORAGE_ACCOUNT_NAME environment variable is not set");
  return `https://${name}.table.core.windows.net`;
}

let credential;
function getCredential() {
  if (!credential) credential = new DefaultAzureCredential();
  return credential;
}

async function getTableClient(tableName) {
  if (tableCache[tableName]) {
    return tableCache[tableName];
  }
  const url = getAccountUrl();
  const cred = getCredential();
  const serviceClient = new TableServiceClient(url, cred);
  try {
    await serviceClient.createTable(tableName);
  } catch (e) {
    if (e.statusCode !== 409) throw e; // 409 = already exists
  }
  const client = new TableClient(url, tableName, cred);
  tableCache[tableName] = client;
  return client;
}

async function getRoundsTable() {
  return getTableClient("rounds");
}

async function getParticipantsTable() {
  return getTableClient("participants");
}

module.exports = { getRoundsTable, getParticipantsTable };
