/*
 * Copyright 2022, alex at staticlibs.net
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { WorkerRequest, WorkerResponse } from "../ts/mod.ts";
import connectOptions from "./connectOptions.ts";
import { assert, assertEquals, io, path } from "./test_deps.ts";

async function callWorker(
  worker: Worker,
  req: WorkerRequest,
): Promise<WorkerResponse> {
  const promise = new Promise((resolve, reject) => {
    worker.onmessage = (e: MessageEvent) => {
      const res: WorkerResponse = JSON.parse(e.data);
      if (!res.error) {
        resolve(res);
      } else {
        reject(res.error);
      }
    };
  });
  worker.postMessage(JSON.stringify(req));
  return await promise as WorkerResponse;
}

const scriptPath = path.fromFileUrl(import.meta.url);
const projectDir = path.dirname(path.dirname(scriptPath));
const workerPath = path.join(projectDir, "ts", "worker", "mssqlWorker.js");
const libPath = path.join(
  projectDir,
  "target",
  "release",
  "deno_mssql_query.dll",
);

Deno.test("worker", { sanitizeOps: false }, async () => {
  const worker = new Worker(`file://${workerPath}`, {
    type: "module",
    name: "MSSQLWorker",
    deno: {
      namespace: true,
    },
  });

  await callWorker(worker, {
    connect: connectOptions,
    libPath: libPath,
  });

  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < 1; i++) {
      const wr = await callWorker(worker, {
        query: "select * from foobar",
      });
      assert(!wr.error);
      const res = wr.result!;
      assertEquals(res.error, "");
      assertEquals(res.metadata, ["foo", "bar", "baz"]);
      assertEquals(res.data.length, 5);
      assertEquals(res.data[2][0], "foo3");
      assertEquals(res.data[2][1], "44");
      assertEquals(res.data[2][2], "bar3");
    }

    let thrown = false;
    try {
      await callWorker(worker, {
        query: "select fail__ from foobar",
      });
    } catch (e) {
      assert(String(e).includes("fail__"));
      thrown = true;
    }
    assert(thrown);

    const wr = await callWorker(worker, {
      query: "select * from foobar",
    });
    assert(!wr.error);

    if (j > 1) {
      console.log(j);
    }

    await callWorker(worker, {
      connect: connectOptions,
    });
  }

  await callWorker(worker, {
    close: true,
  });
});
