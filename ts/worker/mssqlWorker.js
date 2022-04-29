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

// import { ConnectOptions } from "../types.ts";
// import MssqlSymbols from "../MssqlSymbols.ts";
import mssqlInitialize from "../mssqlInitialize.ts";
import mssqlCloseConnection from "../mssqlCloseConnection.ts";
import mssqlExecuteQuery from "../mssqlExecuteQuery.ts";
import mssqlOpenConnection from "../mssqlOpenConnection.ts";

let dylib /*: Deno.DynamicLibrary<MssqlSymbols> | null */ = null;
let connectOptions /*: ConnectOptions | null */ = null;
let connHandle /*: string | null */ = null;

function reconnect() {
  if (null != connHandle) {
    mssqlCloseConnection(dylib, { connHandle });
    connHandle = null;
  }
  const cr = mssqlOpenConnection(dylib, connectOptions);
  connHandle = cr.handle;
  return {};
}

function handleConnect(libPath, opts) {
  if (null == dylib) {
    dylib = mssqlInitialize(libPath);
  }
  connectOptions = opts;
  return reconnect();
}

function handleClose() {
  if (null != connHandle) {
    try {
      mssqlCloseConnection(dylib, { connHandle });
    } catch (e) {
      // suppress
    }
  }
  if (null != dylib) {
    dylib.close();
  }
}

function handleQuery(query) {
  if (null == dylib) {
    throw new Error("Connection not established");
  }
  try {
    return mssqlExecuteQuery(dylib, { connHandle, query });
  } catch (_e) {
    reconnect();
    return mssqlExecuteQuery(dylib, { connHandle, query });
  }
}

self.onmessage = (e /*: MessageEvent */) => {
  try {
    const req = JSON.parse(e.data);
    if (req.connect) {
      const resp = handleConnect(req.libPath, req.connect);
      self.postMessage(JSON.stringify(resp));
    } else if (req.close) {
      handleClose();
      self.postMessage("{}");
      self.close();
    } else if (req.query) {
      const res = handleQuery(req.query);
      self.postMessage(JSON.stringify({
        result: res,
      }));
    } else throw new Error(`Invalid worker request, data: [${e.data}]`);
  } catch (e) {
    self.postMessage(JSON.stringify({
      error: `MSSQL Worker error: ${e}`,
    }));
  }
};
