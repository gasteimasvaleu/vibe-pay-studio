import { describe, it, expect } from "vitest";
import { buildSubscribedKeys, isSubscribedTo } from "./subscriber-access";

const now = new Date("2026-10-28T12:00:00Z");
const post = { author_id: "c1", creator_profile_id: "p1" };

describe("posts só para assinantes", () => {
  it("assinante ativo dentro do ciclo vê", () => {
    const keys = buildSubscribedKeys(
      [{ creator_id: "c1", creator_profile_id: "p1", status: "active", current_period_end: "2026-11-28T00:00:00Z" }],
      now,
    );
    expect(isSubscribedTo(keys, post)).toBe(true);
  });

  it("assinatura vencida fica bloqueada", () => {
    const keys = buildSubscribedKeys(
      [{ creator_id: "c1", creator_profile_id: "p1", status: "active", current_period_end: "2026-10-27T00:00:00Z" }],
      now,
    );
    expect(isSubscribedTo(keys, post)).toBe(false);
  });

  it("quem não assina fica bloqueado", () => {
    expect(isSubscribedTo(buildSubscribedKeys([], now), post)).toBe(false);
  });

  it("assinar outro perfil do mesmo creator não libera", () => {
    const keys = buildSubscribedKeys(
      [{ creator_id: "c1", creator_profile_id: "p2", status: "active", current_period_end: "2026-11-28T00:00:00Z" }],
      now,
    );
    expect(isSubscribedTo(keys, post)).toBe(false);
  });
});
