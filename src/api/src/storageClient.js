const { TableClient, TableServiceClient } = require("@azure/data-tables");

const tableCache = {};

function getConnectionString() {
  return process.env.STORAGE_CONNECTION_STRING;
}

async function getTableClient(tableName) {
  if (tableCache[tableName]) {
    return tableCache[tableName];
  }
  const connStr = getConnectionString();
  const serviceClient = TableServiceClient.fromConnectionString(connStr);
  try {
    await serviceClient.createTable(tableName);
  } catch (e) {
    if (e.statusCode !== 409) throw e; // 409 = already exists
  }
  const client = TableClient.fromConnectionString(connStr, tableName);
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
