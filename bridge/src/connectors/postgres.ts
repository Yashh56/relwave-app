import { Client } from 'pg';
import QueryStream from 'pg-query-stream';
import { Readable } from 'stream';

export type PGConfig = { host: string; port?: number; user?: string; password?: string; database?: string };

export async function testConnection(cfg: PGConfig) {
  const client = new Client(cfg);
  try {
    await client.connect();
    await client.end();
    return { ok: true };
  } catch (err: any) {
    return { ok: false, message: err.message || String(err) };
  }
}

/**
 * streamQuery: runs a query using pg-query-stream and calls onBatch for each batch.
 * - cfg: PG connection config
 * - sql: query text
 * - batchSize: maximum rows per batch (pg-query-stream controls batching)
 * - onBatch: async callback(rows, columns)
 * - onDone: optional callback when done
 */
export async function streamQuery(cfg: PGConfig, sql: string, batchSize = 200, onBatch: (rows:any[], columns:any[])=>Promise<void>, onDone?: ()=>void) {
  const client = new Client(cfg);
  await client.connect();
  const qs = new QueryStream(sql, [], { batchSize });
  const stream: Readable = (client.query as any)(qs);

  return new Promise<void>((resolve, reject) => {
    let columns: any[] | null = null;
    let buffer: any[] = [];

    const flush = async () => {
      if (buffer.length === 0) return;
      const rows = buffer.splice(0, buffer.length);
      try { await onBatch(rows, columns || []); } catch (e) { /* ignore */ }
    };

    stream.on('data', (row: any) => {
      if (!columns) {
        columns = Object.keys(row).map(k => ({ name: k }));
      }
      buffer.push(row);
      if (buffer.length >= batchSize) flush();
    });

    stream.on('end', async () => {
      await flush();
      try { await client.end(); } catch (e) {}
      onDone && onDone();
      resolve();
    });

    stream.on('error', async (err) => {
      try { await client.end(); } catch (e) {}
      reject(err);
    });
  });
}