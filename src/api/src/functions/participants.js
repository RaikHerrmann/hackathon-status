const { app } = require("@azure/functions");
const { getParticipantsContainer } = require("../cosmosClient");

const VALID_STATUSES = ["idle", "done", "need-help"];
const VALID_ID_TYPES = ["table", "participant", "name"];

// GET /api/participants?roundId=xxx — list participants for a round
app.http("getParticipants", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "participants",
  handler: async (request, context) => {
    const roundId = request.query.get("roundId");
    const container = await getParticipantsContainer();
    let query;
    if (roundId) {
      query = {
        query: "SELECT * FROM c WHERE c.roundId = @roundId ORDER BY c.identifier",
        parameters: [{ name: "@roundId", value: roundId }],
      };
    } else {
      query = "SELECT * FROM c ORDER BY c.identifier";
    }
    const { resources } = await container.items.query(query).fetchAll();
    return { jsonBody: resources };
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
    const container = await getParticipantsContainer();
    const participant = {
      id: crypto.randomUUID(),
      roundId: body.roundId,
      identifier: String(body.identifier).trim().substring(0, 200),
      identifierType: body.identifierType,
      status: "idle",
      updatedAt: new Date().toISOString(),
    };
    const { resource } = await container.items.create(participant);
    return { status: 201, jsonBody: resource };
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
    const container = await getParticipantsContainer();
    let existing;
    try {
      const { resource } = await container.item(id, body.roundId).read();
      existing = resource;
    } catch (e) {
      if (e.code === 404) {
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
    const { resource: updated } = await container.item(id, body.roundId).replace(existing);
    return { jsonBody: updated };
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
    const container = await getParticipantsContainer();
    try {
      await container.item(id, roundId).delete();
    } catch (e) {
      if (e.code === 404) {
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
    const container = await getParticipantsContainer();
    let existing;
    try {
      const { resource } = await container.item(id, body.roundId).read();
      existing = resource;
    } catch (e) {
      if (e.code === 404) {
        return { status: 404, jsonBody: { error: "Participant not found" } };
      }
      throw e;
    }
    existing.status = body.status;
    existing.updatedAt = new Date().toISOString();
    const { resource: updated } = await container.item(id, body.roundId).replace(existing);
    return { jsonBody: updated };
  },
});
