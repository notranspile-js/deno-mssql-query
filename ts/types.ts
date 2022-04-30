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

import MssqlSymbols from "./MssqlSymbols.ts";

export type CloseOptions = {
  connHandle: string;
};

export type ConnectOptions = {
  host: string;
  port: number;
  instance: string;
  database: string;
  user: string;
  password: string;
  trustCert: boolean;
};

export type ConnectResult = {
  handle: string;
};

export type LoadLibraryOptions = {
  libPath: string;
};

export type LoadLibraryResult = {
  dylib: Deno.DynamicLibrary<MssqlSymbols>;
};

export type QueryOptions = {
  connHandle: string;
  query: string;
  parameters: Array<string>;
};

export type QueryResult = {
  metadata: Array<string>;
  data: Array<Array<string>>;
};

export type VoidResult = {
  success: true;
};

export type WorkerRequest = {
  closeConnection?: CloseOptions;
  executeQuery?: QueryOptions;
  loadLibrary?: LoadLibraryOptions;
  openConnection?: ConnectOptions;
  shutdown?: true;
};

export type WorkerResponse = {
  error?: string;
  closeConnection?: VoidResult;
  executeQuery?: QueryResult;
  loadLibrary?: VoidResult;
  openConnection?: ConnectResult;
  shutdown?: VoidResult
};
