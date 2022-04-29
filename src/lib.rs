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

use std::fmt::Display;
use std::mem;
use std::slice;
use std::str;
use std::vec::Vec;
use futures_util::TryStreamExt;
use libc;
use serde::ser::Serialize;
use serde_derive::Deserialize;
use serde_derive::Serialize;
use tiberius::{AuthMethod, Client, Config, FromSql, QueryItem, Row, ColumnType};
use time::{Date, OffsetDateTime, PrimitiveDateTime, Time};
use tokio::net::TcpStream;
use tokio::runtime::Runtime;
use tokio_util::compat::Compat;
use tokio_util::compat::TokioAsyncWriteCompatExt;

struct Connection {
    thread_id: usize,
    runtime: Runtime,
    client: Client<Compat<TcpStream>>,
}

impl Connection {
    fn new(runtime: Runtime, client: Client<Compat<TcpStream>>) -> Connection {
        Connection { thread_id: thread_id::get(), runtime, client }
    }
}

#[allow(non_snake_case)]
#[derive(Serialize, Deserialize)]
struct ConnectOptions {
    host: String,
    port: u16,
    instance: String,
    database: String,
    user: String,
    password: String,
    trustCert: bool,
}

#[allow(non_snake_case)]
#[derive(Serialize, Deserialize)]
struct ConnectResult {
    // https://github.com/denoland/deno/issues/11641
    handle: String,
    error: String,
}

impl ConnectResult {
    fn new(handle: usize) -> ConnectResult {
        ConnectResult { handle: handle.to_string(), error: "".to_string() }
    }
    fn new_error(error: String) -> ConnectResult {
        ConnectResult { handle: "".to_string(), error }
    }
}

#[allow(non_snake_case)]
#[derive(Serialize, Deserialize)]
struct CloseOptions {
    connHandle: String,
}

#[allow(non_snake_case)]
#[derive(Serialize, Deserialize)]
struct CloseResult {
    error: String,
}

impl CloseResult {
    fn new() -> CloseResult {
        CloseResult { error: "".to_string() }
    }
    fn new_error(error: String) -> CloseResult {
        CloseResult { error }
    }
}

#[allow(non_snake_case)]
#[derive(Serialize, Deserialize)]
struct QueryOptions {
    connHandle: String,
    query: String,
}

#[allow(non_snake_case)]
#[derive(Serialize, Deserialize)]
struct QueryResult {
    error: String,
    metadata: Vec<String>,
    data: Vec<Vec<String>>,
}

impl QueryResult {
    fn new(metadata: Vec<String>, data: Vec<Vec<String>>) -> QueryResult {
        QueryResult { metadata, data, error: "".to_string() }
    }
    fn new_error(error: String) -> QueryResult {
        let metadata = Vec::new();
        let data = Vec::new();
        QueryResult { metadata, data, error }
    }
}

fn connect(runtime: &Runtime, opts: &ConnectOptions) -> anyhow::Result<Client<Compat<TcpStream>>> {
    runtime.block_on(async {
        let mut config = Config::new();
        config.host(&opts.host);
        config.port(opts.port);
        config.instance_name(&opts.instance);
        config.database(&opts.database);
        config.authentication(AuthMethod::sql_server(&opts.user, &opts.password));
        if opts.trustCert {
            config.trust_cert();
        }
        let tcp = TcpStream::connect(config.get_addr()).await?;
        tcp.set_nodelay(true)?;
        let client = Client::connect(config, tcp.compat_write()).await?;
        Ok(client)
    })
}

fn get_string<'a, T>(row: &'a Row, idx: usize) -> Option<String>
    where T: FromSql<'a> + Display
{
    match row.try_get::<'a, T, usize>(idx) {
        Err(_) => None,
        Ok(opt) => match opt {
            None => None,
            Some(val) => Some(val.to_string())
        }
    }
}

fn row_to_vec(row: &Row) -> anyhow::Result<Vec<String>> {
    let mut res: Vec<String> = Vec::new();
    for i in 0..row.columns().len() {
        let col = &row.columns()[i];
        let opt: Option<String> = match col.column_type() {
            ColumnType::Null => None,
            ColumnType::Bit => get_string::<bool>(row, i),
            ColumnType::Int1 => get_string::<u8>(row, i),
            ColumnType::Int2 => get_string::<i16>(row, i),
            ColumnType::Int4 => get_string::<i32>(row, i),
            ColumnType::Int8 => get_string::<i64>(row, i),
            ColumnType::Datetime4 => get_string::<PrimitiveDateTime>(row, i),
            ColumnType::Float4 => get_string::<f32>(row, i),
            ColumnType::Float8 => get_string::<f64>(row, i),
            ColumnType::Money => None,
            ColumnType::Datetime => get_string::<PrimitiveDateTime>(row, i),
            ColumnType::Money4 => None,
            ColumnType::Guid => None,
            ColumnType::Intn => get_string::<i64>(row, i),
            ColumnType::Bitn => get_string::<i64>(row, i),
            ColumnType::Decimaln => get_string::<f64>(row, i),
            ColumnType::Numericn => get_string::<f64>(row, i),
            ColumnType::Floatn => get_string::<f64>(row, i),
            ColumnType::Datetimen => get_string::<PrimitiveDateTime>(row, i),
            ColumnType::Daten => get_string::<Date>(row, i),
            ColumnType::Timen => get_string::<Time>(row, i),
            ColumnType::Datetime2 => get_string::<PrimitiveDateTime>(row, i),
            ColumnType::DatetimeOffsetn => get_string::<OffsetDateTime>(row, i),
            ColumnType::BigVarBin => None,
            ColumnType::BigVarChar => get_string::<&str>(row, i),
            ColumnType::BigBinary => None,
            ColumnType::BigChar => get_string::<&str>(row, i),
            ColumnType::NVarchar => get_string::<&str>(row, i),
            ColumnType::NChar => get_string::<&str>(row, i),
            ColumnType::Xml => None,
            ColumnType::Udt => None,
            ColumnType::Text => get_string::<&str>(row, i),
            ColumnType::Image => None,
            ColumnType::NText => get_string::<&str>(row, i),
            ColumnType::SSVariant => None,
        };
        match opt {
            Some(val) => res.push(val),
            None => res.push("".to_string())
        }
    };
    Ok(res)
}

fn execute(runtime: &Runtime, client: &mut Client<Compat<TcpStream>>, query: &str) -> anyhow::Result<QueryResult> {
    runtime.block_on(async {
        let mut stream = client.query(query, &[]).await?;
        let mut meta: Vec<String> = Vec::new();
        let mut data: Vec<Vec<String>> = Vec::new();
        while let Some(item) = stream.try_next().await? {
            match item {
                QueryItem::Metadata(qmeta) => {
                    for col in qmeta.columns() {
                        meta.push(col.name().to_string());
                    }
                }
                QueryItem::Row(row) => {
                    let rvec = row_to_vec(&row)?;
                    data.push(rvec);
                }
            }
        }
        let res = QueryResult::new(meta, data);
        Ok(res)
    })
}

fn ffi_json<T>(value: &T) -> *const u8 where T: ?Sized + Serialize {
    let mut json = match serde_json::to_string(value) {
        Ok(json) => json,
        Err(_) => "{\"error\": \"JSON error\"}".to_string()
    };
    json.push_str("\0");
    let bytes = json.as_bytes();
    unsafe {
        let ptr = libc::malloc(bytes.len());
        if !ptr.is_null() {
            libc::memcpy(ptr, bytes.as_ptr() as *const libc::c_void, bytes.len());
        }
        ptr as *const u8
    }
}

fn check_thread(tid: usize) -> Option<String> {
    let cid = thread_id::get();
    if tid != cid {
        Some(format!(concat!(
        "Invalid thread, id: [{}],",
        " database operations on this connection can only be",
        " performed on thread, id: [{}]"), cid, tid))
    } else {
        None
    }
}

#[no_mangle]
pub extern "C"
fn mssql_open_connection(ptr: *const u8, len: usize) -> *const u8 {
    let slice: &[u8] = unsafe { slice::from_raw_parts(ptr, len) };
    let res = match serde_json::from_slice::<ConnectOptions>(slice) {
        Err(e) => ConnectResult::new_error(format!(concat!(
        "MSSQL database connection error, cannot parse specified options,",
        " message: [{}]"), e)),
        Ok(opts) => match tokio::runtime::Builder::new_current_thread()
            .enable_io()
            .build() {
            Ok(runtime) => match connect(&runtime, &opts) {
                Ok(client) => {
                    let conn = Connection::new(runtime, client);
                    let bx = Box::new(conn);
                    let handle = Box::<Connection>::into_raw(bx) as usize;
                    ConnectResult::new(handle)
                }
                Err(e) => ConnectResult::new_error(format!(concat!(
                "MSSQL database connection error, message: [{}]"), e))
            },
                Err(e) => ConnectResult::new_error(format!(concat!(
            "MSSQL database connection error, cannot create IO runtime, message: [{}]"), e))
        }
    };
    ffi_json(&res)
}

#[no_mangle]
pub extern "C"
fn mssql_close_connection(ptr: *const u8, len: usize) -> *const u8 {
    let slice: &[u8] = unsafe { slice::from_raw_parts(ptr, len) };
    let res = match serde_json::from_slice::<CloseOptions>(slice) {
        Err(e) => CloseResult::new_error(format!(concat!(
        "MSSQL connection close error, cannot parse specified options,",
        " message: [{}]"), e)),
        Ok(opts) => match opts.connHandle.parse::<usize>() {
            Err(e) => CloseResult::new_error(format!(concat!(
            "MSSQL connection close error, cannot parse specified handle,",
            " value: [{}], message: [{}]"), opts.connHandle, e)),
            Ok(num) => {
                let bx = unsafe { Box::from_raw(num as *mut Connection) };
                match check_thread(bx.thread_id) {
                    Some(msg) => CloseResult::new_error(msg),
                    None => {
                        mem::drop(bx);
                        CloseResult::new()
                    }
                }
            }
        }
    };
    ffi_json(&res)
}

#[no_mangle]
pub extern "C"
fn mssql_execute_query(ptr: *const u8, len: usize) -> *const u8 {
    let slice: &[u8] = unsafe { slice::from_raw_parts(ptr, len) };
    let res = match serde_json::from_slice::<QueryOptions>(slice) {
        Err(e) => QueryResult::new_error(format!(concat!(
        "MSSQL query error, cannot parse specified options,",
        " message: [{}]"), e)),
        Ok(opts) => match opts.connHandle.parse::<usize>() {
            Err(e) => QueryResult::new_error(format!(concat!(
            "MSSQL query error, cannot parse specified handle,",
            " value: [{}], message: [{}]"), opts.connHandle, e)),
            Ok(num) => {
                let mut bx = unsafe { Box::from_raw(num as *mut Connection) };
                let res = match check_thread(bx.thread_id) {
                    Some(msg) => QueryResult::new_error(msg),
                    None => {
                        match execute(&bx.runtime, &mut bx.client, &opts.query) {
                            Err(e) => QueryResult::new_error(format!(concat!(
                            "MSSQL query error, message [{}]"), e)),
                            Ok(res) => res
                        }
                    }
                };
                let _ = Box::<Connection>::into_raw(bx);
                res
            }
        }
    };
    ffi_json(&res)
}

#[no_mangle]
pub extern "C"
fn mssql_free_result(ptr: *mut libc::c_void) {
    unsafe {
        libc::free(ptr);
    }
}
