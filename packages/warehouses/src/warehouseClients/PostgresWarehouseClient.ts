import {
    CreatePostgresCredentials,
    CreateWarehouseCredentials,
    DimensionType,
    Metric,
    MetricType,
    WarehouseConnectionError,
    WarehouseQueryError,
} from '@lightdash/common';
import * as pg from 'pg';
import { PoolConfig } from 'pg';
import WarehouseBaseClient from './WarehouseBaseClient';

import fs from 'fs';
import csv from 'csv-parser';
import util from "node:util";

// This is super ugly, I know :$
let csv_headers: string[] = [];
let pre = 'mvp_metrics_';
async function readCSVFile(filePath: string): Promise<Record<string, any>[]> {
  const results: Record<string, any>[] = [];


  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv({
          // It is not required but i'll leave it just in case
          // mapValues: ({ header, index, value }) => {
          //     console.log(header);
          //     if (header ===  pre + 'date_day' ||  header ===  pre + 'date_week' || header ===  pre + 'date_month' || header ===  pre + 'date_year'){
          //         console.log(header);
          //         return new Date(value);
          //     } else {
          //         return value;
          //     }
          // },
          mapHeaders: ({ header, index }) => {
              console.log("Mapping header: " + header);
              if (header.includes("__")){
                  return pre + header.replace('__', '_');
              }
              else if (header === 'date'){
                  return pre + 'date_day';
              }
              else {
                  return pre + header;
              }
          }
      }))
      .on('data', (data) => results.push(data as unknown as Record<string, any>[]))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error))
      .on('headers', (headers) => {
        csv_headers = headers;
      });
  });
}


export enum PostgresTypes {
    INTEGER = 'integer',
    INT = 'int',
    INT2 = 'int2',
    INT4 = 'int4',
    INT8 = 'int8',
    MONEY = 'money',
    SMALLSERIAL = 'smallserial',
    SERIAL = 'serial',
    SERIAL2 = 'serial2',
    SERIAL4 = 'serial4',
    SERIAL8 = 'serial8',
    BIGSERIAL = 'bigserial',
    BIGINT = 'bigint',
    SMALLINT = 'smallint',
    BOOLEAN = 'boolean',
    BOOL = 'bool',
    DATE = 'date',
    DOUBLE_PRECISION = 'double precision',
    FLOAT = 'float',
    FLOAT4 = 'float4',
    FLOAT8 = 'float8',
    JSON = 'json',
    JSONB = 'jsonb',
    NUMERIC = 'numeric',
    DECIMAL = 'decimal',
    REAL = 'real',
    CHAR = 'char',
    CHARACTER = 'character',
    NCHAR = 'nchar',
    BPCHAR = 'bpchar',
    VARCHAR = 'varchar',
    CHARACTER_VARYING = 'character varying',
    NVARCHAR = 'nvarchar',
    TEXT = 'text',
    TIME = 'time',
    TIME_TZ = 'timetz',
    TIME_WITHOUT_TIME_ZONE = 'time without time zone',
    TIMESTAMP = 'timestamp',
    TIMESTAMP_TZ = 'timestamptz',
    TIMESTAMP_WITHOUT_TIME_ZONE = 'timestamp without time zone',
}

const mapFieldType = (type: string): DimensionType => {
    switch (type) {
        case PostgresTypes.DECIMAL:
        case PostgresTypes.NUMERIC:
        case PostgresTypes.INTEGER:
        case PostgresTypes.MONEY:
        case PostgresTypes.SMALLSERIAL:
        case PostgresTypes.SERIAL:
        case PostgresTypes.SERIAL2:
        case PostgresTypes.SERIAL4:
        case PostgresTypes.SERIAL8:
        case PostgresTypes.BIGSERIAL:
        case PostgresTypes.INT2:
        case PostgresTypes.INT4:
        case PostgresTypes.INT8:
        case PostgresTypes.BIGINT:
        case PostgresTypes.SMALLINT:
        case PostgresTypes.FLOAT:
        case PostgresTypes.FLOAT4:
        case PostgresTypes.FLOAT8:
        case PostgresTypes.DOUBLE_PRECISION:
        case PostgresTypes.REAL:
            return DimensionType.NUMBER;
        case PostgresTypes.DATE:
            return DimensionType.DATE;
        case PostgresTypes.TIME:
        case PostgresTypes.TIME_TZ:
        case PostgresTypes.TIMESTAMP:
        case PostgresTypes.TIMESTAMP_TZ:
        case PostgresTypes.TIME_WITHOUT_TIME_ZONE:
        case PostgresTypes.TIMESTAMP_WITHOUT_TIME_ZONE:
            return DimensionType.TIMESTAMP;
        case PostgresTypes.BOOLEAN:
        case PostgresTypes.BOOL:
            return DimensionType.BOOLEAN;
        default:
            return DimensionType.STRING;
    }
};

const { builtins } = pg.types;
const convertDataTypeIdToDimensionType = (
    dataTypeId: number,
): DimensionType => {
    switch (dataTypeId) {
        case builtins.NUMERIC:
        case builtins.MONEY:
        case builtins.INT2:
        case builtins.INT4:
        case builtins.INT8:
        case builtins.FLOAT4:
        case builtins.FLOAT8:
            return DimensionType.NUMBER;
        case builtins.DATE:
            return DimensionType.DATE;
        case builtins.TIME:
        case builtins.TIMETZ:
        case builtins.TIMESTAMP:
        case builtins.TIMESTAMPTZ:
            return DimensionType.TIMESTAMP;
        case builtins.BOOL:
            return DimensionType.BOOLEAN;
        default:
            return DimensionType.STRING;
    }
};

export class PostgresClient<
    T extends CreateWarehouseCredentials,
> extends WarehouseBaseClient<T> {
    pool: pg.Pool;

    constructor(credentials: T, config: PoolConfig) {
        super(credentials);
        try {
            const pool = new pg.Pool(config);
            this.pool = pool;
        } catch (e) {
            throw new WarehouseConnectionError(e.message);
        }
    }

    async runQuery(sql: string) {
        try {
            if (sql.toUpperCase().includes("FROM")){
                const results = await this.pool.query(sql); // automatically checkouts client and cleans up
                const fields = results.fields.reduce(
                    (acc, { name, dataTypeID }) => ({
                        ...acc,
                        [name]: {
                            type: convertDataTypeIdToDimensionType(dataTypeID),
                        },
                    }),
                    {},
                );
                return { fields, rows: results.rows };
            }
            else {
                const tmp = require('tmp');
                const tmpobj = tmp.fileSync();
                console.log('File: ', tmpobj.name);
                console.log('Filedescriptor: ', tmpobj.fd);
                console.log()

                // If we don't need the file anymore we could manually call the removeCallback
                // But that is not necessary if we didn't pass the keep option because the library
                // will clean after itself.
                var exec = require('child_process').exec;
                var cmd = sql + ' --csv ' + tmpobj.name;
                const execPromise = util.promisify(exec);
                const {stdout, stderr} = await execPromise(cmd);
                //const {o, e} = await execPromise("sed -i 's/date/f_activity_date_day/' " + tmpobj.name);
                //await execPromise("sed -i 's/active_users/f_activity_active_users/' " + tmpobj.name);
                //const exec_csv = util.promisify(readCSVFile);
                const data = await readCSVFile(tmpobj.name); //exec_csv(tmpobj.name);
                const d = data as unknown as Record<string, any>[];
                //console.log("DATA!");
                //console.log(data); // This will log the parsed data as an array of objects
                var fields: Record<string, { type: DimensionType }> = {};
                csv_headers.forEach((column) => {
                    if (column.includes("date")){
                        fields[column] = { 'type': DimensionType.DATE};
                    }
                    else if (column.includes('active_users')) {
                        fields[column] = { 'type': DimensionType.NUMBER};
                    }
                    else {
                        fields[column] = { 'type': DimensionType.STRING};
                    }

                });
                // = {'metric_time': { 'type': DimensionType.STRING}, 'platform': { 'type': DimensionType.STRING}, 'active_users': { 'type': DimensionType.STRING}};

                console.log(fields);
                console.log(data);
                console.log("JEJE");
                tmpobj.removeCallback();
                return { fields: fields, rows: d};
            }
        } catch (e) {
            throw new WarehouseQueryError(e.message);
        }
    }

    async getCatalog(
        requests: {
            database: string;
            schema: string;
            table: string;
        }[],
    ) {
        const { databases, schemas, tables } = requests.reduce<{
            databases: Set<string>;
            schemas: Set<string>;
            tables: Set<string>;
        }>(
            (acc, { database, schema, table }) => ({
                databases: acc.databases.add(`'${database}'`),
                schemas: acc.schemas.add(`'${schema}'`),
                tables: acc.tables.add(`'${table}'`),
            }),
            {
                databases: new Set(),
                schemas: new Set(),
                tables: new Set(),
            },
        );
        if (databases.size <= 0 || schemas.size <= 0 || tables.size <= 0) {
            return {};
        }
        const query = `
            SELECT table_catalog,
                   table_schema,
                   table_name,
                   column_name,
                   data_type
            FROM information_schema.columns
            WHERE table_catalog IN (${Array.from(databases)})
              AND table_schema IN (${Array.from(schemas)})
              AND table_name IN (${Array.from(tables)})
        `;

        const { rows } = await this.runQuery(query);
        const catalog = rows.reduce(
            (
                acc,
                {
                    table_catalog,
                    table_schema,
                    table_name,
                    column_name,
                    data_type,
                },
            ) => {
                const match = requests.find(
                    ({ database, schema, table }) =>
                        database === table_catalog &&
                        schema === table_schema &&
                        table === table_name,
                );
                if (match) {
                    acc[table_catalog] = acc[table_catalog] || {};
                    acc[table_catalog][table_schema] =
                        acc[table_catalog][table_schema] || {};
                    acc[table_catalog][table_schema][table_name] =
                        acc[table_catalog][table_schema][table_name] || {};
                    acc[table_catalog][table_schema][table_name][column_name] =
                        mapFieldType(data_type);
                }

                return acc;
            },
            {},
        );
        return catalog;
    }

    getFieldQuoteChar() {
        return '"';
    }

    getStringQuoteChar() {
        return "'";
    }

    getEscapeStringQuoteChar() {
        return "'";
    }

    getMetricSql(sql: string, metric: Metric) {
        switch (metric.type) {
            case MetricType.PERCENTILE:
                return `PERCENTILE_CONT(${
                    (metric.percentile ?? 50) / 100
                }) WITHIN GROUP (ORDER BY ${sql})`;
            case MetricType.MEDIAN:
                return `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${sql})`;
            default:
                return super.getMetricSql(sql, metric);
        }
    }
}

export class PostgresWarehouseClient extends PostgresClient<CreatePostgresCredentials> {
    constructor(credentials: CreatePostgresCredentials) {
        super(credentials, {
            connectionString: `postgres://${encodeURIComponent(
                credentials.user,
            )}:${encodeURIComponent(credentials.password)}@${encodeURIComponent(
                credentials.host,
            )}:${credentials.port}/${encodeURIComponent(
                credentials.dbname,
            )}?sslmode=${credentials.sslmode || 'prefer'}`,
        });
    }
}
