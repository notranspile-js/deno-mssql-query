const dylib = Deno.dlopen("./target/debug/deno_mssql_test.dll", {
  "mssql_open_connection": {
    parameters: ["pointer", "usize"],
    result: "pointer",
  },
  "mssql_close_connection": {
    parameters: ["pointer", "usize"],
    result: "pointer",
  },
  "mssql_execute_query": {
    parameters: ["pointer", "usize"],
    result: "pointer",
  },
  "mssql_free_result": {
    parameters: ["pointer"],
    result: "void",
  },
});

const encoder = new TextEncoder();

function encodeOptions(options: Record<string, unknown>) {
    const json = JSON.stringify(options, null, 4);
    return encoder.encode(json);
}

function parseResult(ptr: Deno.UnsafePointer) {
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
}

function mssqlOpenConnection(options: Record<string, unknown>) {
    const opts = encodeOptions(options);
    const ptr = dylib.symbols.mssql_open_connection(opts, opts.length);
    return parseResult(ptr);
}

function mssqlCloseConnection(options: Record<string, unknown>) {
    const opts = encodeOptions(options);
    const ptr = dylib.symbols.mssql_close_connection(opts, opts.length);
    return parseResult(ptr);
}

function mssqlExecuteQuery(options: Record<string, unknown>) {
    const opts = encodeOptions(options);
    const ptr = dylib.symbols.mssql_execute_query(opts, opts.length);
    return parseResult(ptr);
}

/*
const queryOpts = JSON.stringify({
    connHandle: conn.handle,
    query: "select user_password from tbl_users_pp"
});
const array = encoder.encode(queryOpts)
*/

/*
const closeOpts = JSON.stringify({
    connHandle: conn.handle
});
const he = encoder.encode(closeOpts);
const closePtr = dylib.symbols.mssql_close_connection(he, he.length);
const closeRes = parseResult(closePtr);
console.log(closeRes);
*/

/*
const prs = [];
for (let i = 0; i < 32; i++) {
    const pr = dylib.symbols.mssql_query(array, array.length);
    prs.push(pr);
}
const results = await Promise.all(prs);
for (let ptr of results) {
    const ptrView = new Deno.UnsafePointerView(ptr);
    const str = ptrView.getCString();
    console.log(str);
    await dylib.symbols.mssql_free(ptr);
}
*/

const conn = mssqlOpenConnection({
    host: "DESKTOP-JS80C9O",
    port: 1433,
    instance: "MSSQLSERVER",
    database: "",
    user: "",
    password: "",
    trustCert: true,
});
console.log(conn);

for (let i = 0; i < 4; i++) {
    const res = mssqlExecuteQuery({
        connHandle: conn.handle,
        query: "select user_password from tbl_users_pp"
    });
}
const res = mssqlExecuteQuery({
    connHandle: conn.handle,
    query: "select * from tbl_asset_type"
});
console.log(res);
try {
    const res = mssqlExecuteQuery({
        connHandle: conn.handle,
        query: "select user_password__ from tbl_users_pp"
    });
} catch(e) {
    console.log(e);
}

const closed = mssqlCloseConnection({
    connHandle: conn.handle
});
console.log(closed);


console.log("success");
