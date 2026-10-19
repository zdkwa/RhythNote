import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkForUpdate,
  compareVersions,
  normalizeVersionTag,
} from "@/lib/update-check";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("update check", () => {
  it("normalizes version tags", () => {
    expect(normalizeVersionTag("v0.1.1")).toBe("0.1.1");
    expect(normalizeVersionTag("  V2.0.0 ")).toBe("2.0.0");
  });

  it("compares semantic-ish versions", () => {
    expect(compareVersions("0.1.2", "0.1.1")).toBe(1);
    expect(compareVersions("0.1.1", "0.1.1")).toBe(0);
    expect(compareVersions("0.1.0", "0.1.1")).toBe(-1);
    expect(compareVersions("1.0", "0.9.9")).toBe(1);
  });

  it("returns the latest release and update availability", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          tag_name: "v0.1.2",
          html_url: "https://github.com/zdkwa/RhythNote/releases/tag/v0.1.2",
          published_at: "2026-10-20T00:00:00Z",
        }),
      }),
    );

    const result = await checkForUpdate("0.1.1");
    expect(result.latestVersion).toBe("0.1.2");
    expect(result.hasUpdate).toBe(true);
    expect(result.releaseUrl).toContain("v0.1.2");
  });

  it("explains private repository failures without a token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({}),
      }),
    );

    await expect(checkForUpdate("0.1.1")).rejects.toThrow("Private");
  });

  it("sends a bearer token when provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ tag_name: "v0.1.1", html_url: "https://example.com" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await checkForUpdate("0.1.1", "token-123");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("releases/latest"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      }),
    );
  });
});
