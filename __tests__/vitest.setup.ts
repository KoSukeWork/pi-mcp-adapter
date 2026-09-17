import { afterAll, afterEach, beforeEach } from "vitest";
import {
  makeTestHome,
  removeTestHome,
  restoreHomeEnv,
  snapshotHomeEnv,
  type HomeEnvSnapshot,
} from "./test-home.ts";

const suiteOriginal = snapshotHomeEnv();
const suiteHome = makeTestHome("pi-mcp-vitest-suite-home-");

let testOriginal: HomeEnvSnapshot = suiteOriginal;
let testHome: string | undefined;
const testHomes = new Set<string>();

beforeEach(() => {
  testOriginal = snapshotHomeEnv();
  testHome = makeTestHome("pi-mcp-vitest-home-");
  testHomes.add(testHome);
});

afterEach(() => {
  restoreHomeEnv(testOriginal);
  if (testHome) removeTestHome(testHome);
  testHome = undefined;
});

afterAll(() => {
  restoreHomeEnv(suiteOriginal);
  for (const home of testHomes) removeTestHome(home);
  testHomes.clear();
  removeTestHome(suiteHome);
});
