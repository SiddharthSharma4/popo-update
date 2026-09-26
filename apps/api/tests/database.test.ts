/**
 * Database integration test verifying SQLite, migrations, ACID transactions, and outbox persistence.
 * Conforms to docs/contracts/08-data-contract.md §28-31 and docs/contracts/09-testing-contract.md.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDatabase, type KyselyDb } from "../src/infrastructure/database/database.js";
import { runMigrations } from "../src/infrastructure/database/migrator.js";

describe("Database Foundation — Persistence, Transactions & Outbox", () => {
  let db: KyselyDb;

  beforeEach(async () => {
    db = createDatabase(":memory:");
    await runMigrations(db);
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("persists outbox events and supports transactional ACID rollback", async () => {
    // 1. Successful transaction committing an outbox event
    await db.transaction().execute(async (tx) => {
      await tx
        .insertInto("outbox_events")
        .values({
          id: "evt_test_001",
          event_type: "EvaluationSubmitted",
          event_version: 1,
          aggregate_type: "Evaluation",
          aggregate_id: "eval_123",
          producer: "evaluation",
          actor_type: "USER",
          actor_id: "evaluator_456",
          correlation_id: "corr_001",
          causation_id: "cmd_001",
          payload: JSON.stringify({ marks: 45 }),
          status: "PENDING",
          created_at: new Date().toISOString(),
          published_at: null,
          last_error: null,
        })
        .execute();
    });

    const storedEvents = await db.selectFrom("outbox_events").selectAll().execute();
    expect(storedEvents.length).toBe(1);
    expect(storedEvents[0].id).toBe("evt_test_001");
    expect(storedEvents[0].status).toBe("PENDING");

    // 2. Failed transaction must roll back without partial writes
    await expect(
      db.transaction().execute(async (tx) => {
        await tx
          .insertInto("outbox_events")
          .values({
            id: "evt_test_002",
            event_type: "EvaluationSubmitted",
            event_version: 1,
            aggregate_type: "Evaluation",
            aggregate_id: "eval_124",
            producer: "evaluation",
            actor_type: "USER",
            actor_id: "evaluator_456",
            correlation_id: "corr_002",
            causation_id: "cmd_002",
            payload: JSON.stringify({ marks: 50 }),
            status: "PENDING",
            created_at: new Date().toISOString(),
            published_at: null,
            last_error: null,
          })
          .execute();

        throw new Error("Simulated transactional error");
      })
    ).rejects.toThrow("Simulated transactional error");

    // Verify rollback occurred: event_002 was not committed
    const eventsAfterRollback = await db.selectFrom("outbox_events").selectAll().execute();
    expect(eventsAfterRollback.length).toBe(1);
    expect(eventsAfterRollback.find((e) => e.id === "evt_test_002")).toBeUndefined();
  });

  it("persists immutable audit events and enforces queryability", async () => {
    const timestamp = new Date().toISOString();
    await db
      .insertInto("audit_events")
      .values({
        id: "audit_001",
        event_type: "EvaluationSubmitted",
        actor_type: "USER",
        actor_id: "evaluator_456",
        entity_type: "Evaluation",
        entity_id: "eval_123",
        action: "SUBMIT",
        details: JSON.stringify({ totalMarks: 85 }),
        occurred_at: timestamp,
      })
      .execute();

    const auditLogs = await db
      .selectFrom("audit_events")
      .selectAll()
      .where("entity_id", "=", "eval_123")
      .execute();

    expect(auditLogs.length).toBe(1);
    expect(auditLogs[0].action).toBe("SUBMIT");
    expect(auditLogs[0].actor_id).toBe("evaluator_456");
  });

  it("enforces idempotency record uniqueness", async () => {
    const now = new Date().toISOString();
    await db
      .insertInto("idempotency_records")
      .values({
        key: "idemp_key_1",
        request_hash: "hash_abc",
        response_status: 200,
        response_body: JSON.stringify({ success: true }),
        created_at: now,
        expires_at: now,
      })
      .execute();

    // Attempting duplicate insert with same primary key must reject
    await expect(
      db
        .insertInto("idempotency_records")
        .values({
          key: "idemp_key_1",
          request_hash: "hash_abc",
          response_status: 200,
          response_body: JSON.stringify({ success: true }),
          created_at: now,
          expires_at: now,
        })
        .execute()
    ).rejects.toThrow();
  });

  it("processes QualitySignalGenerated outbox event polling and dispatch lifecycle (PENDING -> PUBLISHED)", async () => {
    // 1. Transactionally insert a QualitySignalGenerated outbox event
    const signalEventId = "evt_qs_outbox_001";
    await db.transaction().execute(async (tx) => {
      await tx
        .insertInto("outbox_events")
        .values({
          id: signalEventId,
          event_type: "QualitySignalGenerated",
          event_version: 1,
          aggregate_type: "QualitySignal",
          aggregate_id: "sig_test_123",
          producer: "completeness-detector",
          actor_type: "DETECTOR",
          actor_id: "completeness-detector:v1.0.0",
          correlation_id: "corr_sub_001",
          causation_id: "evt_sub_001",
          payload: JSON.stringify({
            signalId: "sig_test_123",
            evaluationId: "eval_test_123",
            signalType: "COMPLETENESS_PARTIAL",
            severity: "MEDIUM",
          }),
          status: "PENDING",
          created_at: new Date().toISOString(),
          published_at: null,
          last_error: null,
        })
        .execute();
    });

    // 2. Poll for pending outbox events (simulating background dispatcher query via idx_outbox_events_status)
    const pendingEvents = await db
      .selectFrom("outbox_events")
      .selectAll()
      .where("status", "=", "PENDING")
      .orderBy("created_at", "asc")
      .execute();

    expect(pendingEvents.length).toBeGreaterThanOrEqual(1);
    const signalEvent = pendingEvents.find((e) => e.id === signalEventId);
    expect(signalEvent).toBeDefined();
    expect(signalEvent!.event_type).toBe("QualitySignalGenerated");
    expect(signalEvent!.aggregate_type).toBe("QualitySignal");
    expect(signalEvent!.actor_type).toBe("DETECTOR");

    // 3. Dispatch: Mark event as PUBLISHED with published_at timestamp
    const publishedAt = new Date().toISOString();
    await db
      .updateTable("outbox_events")
      .set({
        status: "PUBLISHED",
        published_at: publishedAt,
      })
      .where("id", "=", signalEventId)
      .execute();

    // 4. Verify event transition and outbox queryability
    const updatedEvent = await db
      .selectFrom("outbox_events")
      .selectAll()
      .where("id", "=", signalEventId)
      .executeTakeFirst();

    expect(updatedEvent).toBeDefined();
    expect(updatedEvent!.status).toBe("PUBLISHED");
    expect(updatedEvent!.published_at).toBe(publishedAt);

    // 5. Verify event is no longer in PENDING poll queue
    const remainingPending = await db
      .selectFrom("outbox_events")
      .selectAll()
      .where("status", "=", "PENDING")
      .execute();
    expect(remainingPending.find((e) => e.id === signalEventId)).toBeUndefined();
  });
});

