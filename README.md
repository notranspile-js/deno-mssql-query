Windows SCM Deno plugin
=======================

[![appveyor](https://ci.appveyor.com/api/projects/status/github/notranspile-js/deno-mssql-query?svg=true)](https://ci.appveyor.com/project/staticlibs/deno-mssql-query)

Executes SQL queries on MS SQL Server from [Deno](https://deno.land/). Used a [native FFI library](https://github.com/notranspile-js/deno-mssql-query/blob/master/src/lib.rs) based on [Tiberius](https://github.com/prisma/tiberius).

Limitations:

 - supports only `select` queries
 - full query result is loaded into memory
 - result fields are converted into strings
 - only string query parameters are supported

Provides both sync and async API, a `Worker` setup is required to use async API.

Usage examples
--------------

Get a native library from releases page or build it with:

```
cargo build --release
```

To use `*Sync` function, load a native library using:

```
const dylib = mssqlLoadLibrarySync({ libPath }).dylib;
```

And then pass `dylib` as a first argument to all `*Sync` functions. See full sync example in [sync_test.ts](https://github.com/notranspile-js/deno-mssql-query/blob/master/test/async_test.ts).


To use async API, a worker needs to be created, [default impl](https://github.com/notranspile-js/deno-mssql-query/blob/master/ts/worker/mssqlWorker.js):

```
 const worker = new Worker(`file://${workerPath}`, {
    type: "module",
    name: "MSSQLWorker",
    deno: {
      namespace: true,
    },
  });
```

This worker then needs to be passed as a first argument to all `mssql*` functions. First `mssqlLoadLibrary` needs to be called, after that connection can be established and queries can be executed. Worker can be shut down gracefully using
`mssqlShutdownWorker`. See full async example in [async_test.ts](https://github.com/notranspile-js/deno-mssql-query/blob/master/test/async_test.ts).

License information
-------------------

This project is released under the [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0).