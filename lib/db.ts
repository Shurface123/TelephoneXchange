import mysql from "mysql2/promise"

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "cocobod_telephone_exchange",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: "+00:00",
})

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const [rows] = await pool.execute(sql, params)
    return rows as T[]
}

/**
 * queryRaw uses pool.query() (text protocol) instead of pool.execute().
 * Use this for queries containing LIMIT/OFFSET placeholders — MySQL's binary
 * prepared-statement protocol (used by pool.execute) does not support them
 * and throws "Incorrect arguments to mysqld_stmt_execute".
 */
export async function queryRaw<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const [rows] = await pool.query(sql, params)
    return rows as T[]
}

export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const rows = await query<T>(sql, params)
    return rows[0] ?? null
}

export async function execute(sql: string, params?: any[]): Promise<{ insertId: number; affectedRows: number }> {
    const [result] = await pool.execute(sql, params) as any
    return { insertId: result.insertId, affectedRows: result.affectedRows }
}

export default pool
