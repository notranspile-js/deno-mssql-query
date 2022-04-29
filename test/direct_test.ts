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

import {
  mssqlCloseConnection,
  mssqlExecuteQuery,
  mssqlInitialize,
  mssqlOpenConnection,
} from "../ts/mod.ts";
import connectOptions from "./connectOptions.ts";
import { assert, assertEquals, path } from "./test_deps.ts";

Deno.test("direct", () => {
  const scriptPath = path.fromFileUrl(import.meta.url);
  const libPath = path.join(
    path.dirname(path.dirname(scriptPath)),
    "target",
    "release",
    "deno_mssql_query.dll",
  );

  const dylib = mssqlInitialize(libPath);
  const conn = mssqlOpenConnection(dylib, connectOptions);
  assertEquals(conn.error, "");

  for (let i = 0; i < 4; i++) {
    const res = mssqlExecuteQuery(dylib, {
      connHandle: conn.handle,
      query: "select * from foobar",
    });
    assertEquals(res.error, "");
    assertEquals(res.metadata, ["foo", "bar", "baz"]);
    assertEquals(res.data.length, 5);
    assertEquals(res.data[2][0], "foo3");
    assertEquals(res.data[2][1], "44");
    assertEquals(res.data[2][2], "bar3");
  }
  let thrown = false;
  try {
    mssqlExecuteQuery(dylib, {
      connHandle: conn.handle,
      query: "select fail__ from foobar",
    });
  } catch (e) {
    assert(String(e).includes("fail__"));
    thrown = true;
  }
  assert(thrown);

  const closed = mssqlCloseConnection(dylib, {
    connHandle: conn.handle,
  });
  assertEquals(closed.error, "");

  dylib.close();
});
