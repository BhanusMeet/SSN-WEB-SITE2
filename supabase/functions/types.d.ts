// Type declarations for Deno runtime and Supabase Edge Functions in VS Code

declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    toObject(): Record<string, string>;
  }
  export const env: Env;
  export function serve(handler: (req: Request) => Promise<Response> | Response): void;
}

declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(handler: (req: Request) => Promise<Response> | Response): void;
}

declare module "https://*" {
  const content: any;
  export default content;
  export const serve: (handler: (req: Request) => Promise<Response> | Response) => void;
}
