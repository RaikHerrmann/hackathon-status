const { app } = require("@azure/functions");
const { odata } = require("@azure/data-tables");
const { getRoundsTable, getParticipantsTable } = require("../storageClient");

// Helper: convert table entity to API-friendly object
function toRound(entity) {
  return {
    id: entity.rowKey,
    name: entity.name,
    createdAt: entity.createdAt,
  };
}

// GET /api/rounds — list all rounds
app.http("getRounds", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "rounds",
  handler: async (request, context) => {
    try {
      const table = getRoundsTable();
      const rounds = [];
      for await (const entity of table.listEntities({
        queryOptions: { filter: "PartitionKey eq 'round'" },
      })) {
        rounds.push(toRound(entity));
      }
      rounds.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { jsonBody: rounds };
    } catch (e) {
      return { status: 500, jsonBody: { error: e.message, stack: e.stack } };
    }
  },
});

// GET /api/health — simple health check + identity endpoint probe
app.http("health", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "health",
  handler: async (request, context) => {
    const result = {
      status: "ok",
      env: {
        STORAGE_ACCOUNT_NAME: process.env.STORAGE_ACCOUNT_NAME ? "set" : "NOT SET",
        IDENTITY_ENDPOINT: process.env.IDENTITY_ENDPOINT ? "set" : "NOT SET",
        IDENTITY_HEADER: process.env.IDENTITY_HEADER ? "set" : "NOT SET",
        MSI_ENDPOINT: process.env.MSI_ENDPOINT ? "set" : "NOT SET",
        MSI_SECRET: process.env.MSI_SECRET ? "set" : "NOT SET",
      },
    };
    // Probe the identity endpoint
    const ep = process.env.IDENTITY_ENDPOINT || process.env.MSI_ENDPOINT;
    if (ep) {
      try {
        const resource = "https://storage.azure.com";
        const url = `${ep}?resource=${encodeURIComponent(resource)}&api-version=2019-08-01`;
        const res = await fetch(url);
        result.probe = { status: res.status, body: await res.text() };
      } catch (e) {
        result.probe = { error: e.message };
      }
    }
    return { jsonBody: result };
  },
});

// POST /api/rounds — create a round
app.http("createRound", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "rounds",
  handler: async (request, context) => {
    const body = await request.json();
    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return { status: 400, jsonBody: { error: "name is required" } };
    }
    const table = await getRoundsTable();
    const round = {
      partitionKey: "round",
      rowKey: crypto.randomUUID(),
      name: body.name.trim().substring(0, 200),
      createdAt: new Date().toISOString(),
    };
    await table.createEntity(round);
    return { status: 201, jsonBody: toRound(round) };
  },
});

// DELETE /api/rounds/{id} — delete round and its participants
app.http("deleteRound", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "rounds/{id}",
  handler: async (request, context) => {
    const id = request.params.id;
    const table = await getRoundsTable();
    try {
      await table.deleteEntity("round", id);
    } catch (e) {
      if (e.statusCode === 404) {
        return { status: 404, jsonBody: { error: "Round not found" } };
      }
      throw e;
    }
    // Delete all participants in this round
    const pTable = await getParticipantsTable();
    const toDelete = [];
    for await (const entity of pTable.listEntities({
      queryOptions: { filter: odata`PartitionKey eq ${id}` },
    })) {
      toDelete.push(entity);
    }
    for (const p of toDelete) {
      await pTable.deleteEntity(p.partitionKey, p.rowKey);
    }
    return { status: 204 };
  },
});

// POST /api/rounds/{id}/reset — reset all statuses in a round
app.http("resetRound", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "rounds/{id}/reset",
  handler: async (request, context) => {
    const roundId = request.params.id;
    const pTable = await getParticipantsTable();
    let count = 0;
    for await (const entity of pTable.listEntities({
      queryOptions: { filter: odata`PartitionKey eq ${roundId}` },
    })) {
      entity.status = "idle";
      await pTable.updateEntity(entity, "Replace");
      count++;
    }
    return { jsonBody: { reset: count } };
  },
});
