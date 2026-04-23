const { TableClient } = require("@azure/data-tables");
const { DefaultAzureCredential } = require("@azure/identity");

const credential = new DefaultAzureCredential();

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
