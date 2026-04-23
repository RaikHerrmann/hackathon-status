const { app } = require("@azure/functions");
const { getRoundsContainer } = require("../cosmosClient");

// GET /api/rounds — list all rounds
app.http("getRounds", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "rounds",
  handler: async (request, context) => {
    const container = await getRoundsContainer();
    const { resources } = await container.items
      .query("SELECT * FROM c ORDER BY c.createdAt DESC")
      .fetchAll();
    return { jsonBody: resources };
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
    const container = await getRoundsContainer();
    const round = {
      id: crypto.randomUUID(),
      name: body.name.trim().substring(0, 200),
      createdAt: new Date().toISOString(),
    };
    const { resource } = await container.items.create(round);
    return { status: 201, jsonBody: resource };
  },
});

// DELETE /api/rounds/{id} — delete round and its participants
app.http("deleteRound", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "rounds/{id}",
  handler: async (request, context) => {
    const id = request.params.id;
    const container = await getRoundsContainer();
    try {
      await container.item(id, id).delete();
    } catch (e) {
      if (e.code === 404) {
        return { status: 404, jsonBody: { error: "Round not found" } };
      }
      throw e;
    }
    // Delete all participants in this round
    const { getParticipantsContainer } = require("../cosmosClient");
    const pContainer = await getParticipantsContainer();
    const { resources: participants } = await pContainer.items
      .query({
        query: "SELECT c.id, c.roundId FROM c WHERE c.roundId = @roundId",
        parameters: [{ name: "@roundId", value: id }],
      })
      .fetchAll();
    for (const p of participants) {
      await pContainer.item(p.id, p.roundId).delete();
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
    const { getParticipantsContainer } = require("../cosmosClient");
    const container = await getParticipantsContainer();
    const { resources: participants } = await container.items
      .query({
        query: "SELECT * FROM c WHERE c.roundId = @roundId",
        parameters: [{ name: "@roundId", value: roundId }],
      })
      .fetchAll();
    for (const p of participants) {
      p.status = "idle";
      await container.item(p.id, p.roundId).replace(p);
    }
    return { jsonBody: { reset: participants.length } };
  },
});
