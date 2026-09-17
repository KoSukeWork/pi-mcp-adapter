import { afterAll, afterEach, beforeEach } from "vitest";
import { makeTestHome, restoreHomeEnv, snapshotHomeEnv, type HomeEnvSnapshot } from "./test-home.ts";

const suiteOriginal = snapshotHomeEnv();
makeTestHome("pi-mcp-vitest-suite-home-");

let testOriginal: HomeEnvSnapshot = suiteOriginal;

beforeEach(() => {
  testOriginal = snapshotHomeEnv();
  makeTestHome("pi-mcp-vitest-home-");
});

afterEach(() => {
  restoreHomeEnv(testOriginal);
});

afterAll(() => {
  restoreHomeEnv(suiteOriginal);
});
