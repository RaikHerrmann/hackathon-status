const { CosmosClient } = require("@azure/cosmos");

let client;
let database;
const containerCache = {};

function getDatabase() {
  if (!database) {
    const endpoint = process.env.COSMOS_ENDPOINT;
    const key = process.env.COSMOS_KEY;
    client = new CosmosClient({ endpoint, key });
    database = client.database(process.env.COSMOS_DATABASE || "hackathon");
  }
  return database;
}

async function ensureContainer(containerId, partitionKey) {
  if (containerCache[containerId]) {
    return containerCache[containerId];
  }
  const db = getDatabase();
  const { container } = await db.containers.createIfNotExists({
    id: containerId,
    partitionKey: { paths: [partitionKey] },
  });
  containerCache[containerId] = container;
  return container;
}

async function getRoundsContainer() {
  return ensureContainer("rounds", "/id");
}

async function getParticipantsContainer() {
  return ensureContainer("participants", "/roundId");
}

module.exports = { getRoundsContainer, getParticipantsContainer };
