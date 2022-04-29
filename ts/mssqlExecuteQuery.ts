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

import { QueryOptions, QueryResult } from "./types.ts";
import encodeOptions from "./encodeOptions.ts";
import MssqlSymbols from "./MssqlSymbols.ts";
import parseResult from "./parseResult.ts";

export default (
  dylib: Deno.DynamicLibrary<MssqlSymbols>,
  options: QueryOptions,
): QueryResult => {
  if (!dylib) {
    throw new Error("Native library not initialized");
  }
  const opts = encodeOptions(options);
  const ptr = dylib.symbols.mssql_execute_query(opts, opts.length);
  return parseResult(dylib, ptr);
};
