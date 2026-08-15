declare module "@neondatabase/serverless" {
  type Query = ((...args: any[]) => Promise<any[]>) & { transaction(fn: (tx: Query) => Promise<unknown>): Promise<unknown> };
  export function neon(connectionString: string): Query;
}
