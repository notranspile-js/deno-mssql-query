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

import { CloseResult, ConnectResult, QueryResult } from "./types.ts";
import MssqlSymbols from "./MssqlSymbols.ts";

export default <T extends CloseResult | ConnectResult | QueryResult>(
  dylib: Deno.DynamicLibrary<MssqlSymbols>,
  ptr: Deno.UnsafePointer,
): T => {
  if (BigInt(0) == ptr.valueOf()) {
    throw new Error("FFI result allocation error");
  }
  const view = new Deno.UnsafePointerView(ptr);
  const json = view.getCString();
  const res = JSON.parse(json);
  dylib.symbols.mssql_free_result(ptr);
  if (res.error) {
    throw new Error(res.error);
  }
  return res;
};
