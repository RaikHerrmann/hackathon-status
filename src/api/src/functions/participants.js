const { app } = require("@azure/functions");
const { getParticipantsTable } = require("../storageClient");

const VALID_STATUSES = ["idle", "done", "need-help"];
const VALID_ID_TYPES = ["table", "participant", "name"];

// Helper: convert table entity to API-friendly object
function toParticipant(entity) {
  return {
    id: entity.rowKey,
    roundId: entity.partitionKey,
    identifier: entity.identifier,
    identifierType: entity.identifierType,
    status: entity.status,
    updatedAt: entity.updatedAt,
  };
}

// GET /api/participants?roundId=xxx — list participants for a round
app.http("getParticipants", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "participants",
  handler: async (request, context) => {
    const roundId = request.query.get("roundId");
    const table = await getParticipantsTable();
    const participants = [];
    const opts = roundId
      ? { queryOptions: { filter: `PartitionKey eq '${roundId}'` } }
      : {};
    for await (const entity of table.listEntities(opts)) {
      participants.push(toParticipant(entity));
    }
    participants.sort((a, b) => a.identifier.localeCompare(b.identifier));
    return { jsonBody: participants };
  },
});

// POST /api/participants — add a participant
app.http("createParticipant", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "participants",
  handler: async (request, context) => {
    const body = await request.json();
    if (!body.roundId || !body.identifier || !body.identifierType) {
      return {
        status: 400,
        jsonBody: { error: "roundId, identifier, and identifierType are required" },
      };
    }
    if (!VALID_ID_TYPES.includes(body.identifierType)) {
      return {
        status: 400,
        jsonBody: { error: `identifierType must be one of: ${VALID_ID_TYPES.join(", ")}` },
      };
    }
    const table = await getParticipantsTable();
    const entity = {
      partitionKey: body.roundId,
      rowKey: crypto.randomUUID(),
      identifier: String(body.identifier).trim().substring(0, 200),
      identifierType: body.identifierType,
      status: "idle",
      updatedAt: new Date().toISOString(),
    };
    await table.createEntity(entity);
    return { status: 201, jsonBody: toParticipant(entity) };
  },
});

// PUT /api/participants/{id} — update a participant (admin)
app.http("updateParticipant", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "participants/{id}",
  handler: async (request, context) => {
    const id = request.params.id;
    const body = await request.json();
    if (!body.roundId) {
      return { status: 400, jsonBody: { error: "roundId is required" } };
    }
    const table = await getParticipantsTable();
    let existing;
    try {
      existing = await table.getEntity(body.roundId, id);
    } catch (e) {
      if (e.statusCode === 404) {
        return { status: 404, jsonBody: { error: "Participant not found" } };
      }
      throw e;
    }
    if (body.identifier !== undefined) {
      existing.identifier = String(body.identifier).trim().substring(0, 200);
    }
    if (body.identifierType && VALID_ID_TYPES.includes(body.identifierType)) {
      existing.identifierType = body.identifierType;
    }
    if (body.status && VALID_STATUSES.includes(body.status)) {
      existing.status = body.status;
    }
    existing.updatedAt = new Date().toISOString();
    await table.updateEntity(existing, "Replace");
    return { jsonBody: toParticipant(existing) };
  },
});

// DELETE /api/participants/{id}?roundId=xxx — delete a participant
app.http("deleteParticipant", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "participants/{id}",
  handler: async (request, context) => {
    const id = request.params.id;
    const roundId = request.query.get("roundId");
    if (!roundId) {
      return { status: 400, jsonBody: { error: "roundId query param is required" } };
    }
    const table = await getParticipantsTable();
    try {
      await table.deleteEntity(roundId, id);
    } catch (e) {
      if (e.statusCode === 404) {
        return { status: 404, jsonBody: { error: "Participant not found" } };
      }
      throw e;
    }
    return { status: 204 };
  },
});

// PUT /api/participants/{id}/status — participant self-service status update
app.http("updateParticipantStatus", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "participants/{id}/status",
  handler: async (request, context) => {
    const id = request.params.id;
    const body = await request.json();
    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      return {
        status: 400,
        jsonBody: { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      };
    }
    if (!body.roundId) {
      return { status: 400, jsonBody: { error: "roundId is required" } };
    }
    const table = await getParticipantsTable();
    let existing;
    try {
      existing = await table.getEntity(body.roundId, id);
    } catch (e) {
      if (e.statusCode === 404) {
        return { status: 404, jsonBody: { error: "Participant not found" } };
      }
      throw e;
    }
    existing.status = body.status;
    existing.updatedAt = new Date().toISOString();
    await table.updateEntity(existing, "Replace");
    return { jsonBody: toParticipant(existing) };
  },
});
