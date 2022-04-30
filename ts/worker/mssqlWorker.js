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
  mssqlCloseConnectionSync,
  mssqlExecuteQuerySync,
  mssqlLoadLibrarySync,
  mssqlOpenConnectionSync,
} from "../mod.ts";

let dylib /*: Deno.DynamicLibrary<MssqlSymbols> | null */ = null;
const voidRes = JSON.stringify({
  success: true,
});

self.onmessage = (e /*: MessageEvent */) => {
  try {
    const req = JSON.parse(e.data);
    if (req.loadLibrary) {
      if (null == dylib) {
        dylib = mssqlLoadLibrarySync(req.loadLibrary).dylib;
      }
      self.postMessage(voidRes);
    } else {
      if (null == dylib) {
        throw new Error("Native library not loaded");
      }
      if (req.closeConnection) {
        mssqlCloseConnectionSync(dylib, req.closeConnection);
        self.postMessage(voidRes);
      } else if (req.executeQuery) {
        const res = mssqlExecuteQuerySync(dylib, req.executeQuery);
        self.postMessage(JSON.stringify({
          executeQuery: res,
        }));
      } else if (req.openConnection) {
        const res = mssqlOpenConnectionSync(dylib, req.openConnection);
        self.postMessage(JSON.stringify({
          openConnection: res,
        }));
      } else if (req.shutdown) {
        dylib.close();
        self.postMessage(voidRes);
        self.close();
      } else {
        throw new Error(`Invalid worker request, data: [${e.data}]`);
      }
    }
  } catch (e) {
    self.postMessage(JSON.stringify({
      error: `MSSQL Worker error: ${e}`,
    }));
  }
};
