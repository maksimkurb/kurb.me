import { ImageResponse } from 'workers-og';

export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
  //
  // Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
  // MY_SERVICE: Fetcher;
  //
  // Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
  // MY_QUEUE: Queue;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const params = new URLSearchParams(new URL(request.url).search);
    const title = params.get('title') || 'Lorem ipsum';
    const subtitle = params.get('subtitle') || '';
    const description = params.get('description') || '';

    const align = description ? 'flex-start' : 'center';

    const html = `
    <div style="display: flex; padding: 5em; height: 100vh; width: 100vw; align-items: ${align}; justify-content: ${align}; flex-direction: column; background-image: linear-gradient(65deg, #E0D9FF, #BFECFF, #CFFEE5); text-align: center">
      <div style="display: flex; color: #333; font-weight: 600; font-size: 96px">
        ${title}
      </div>
      <div style="display: flex; font-size: 64px; background-image: linear-gradient(65deg, #A880FF, #008ECA, #01B88C); background-clip: text; color: transparent; font-weight: 400">
        ${subtitle}
      </div>
      <div style="display: flex; font-size: 32px; color: #000; font-weight: 400">
        ${description}
      </div>
      <div style="display: flex; position: absolute; bottom: 0.5em; right: 0.5em; font-size: 38px;">
        <span style="color: green; opacity: 0.5; margin-right: 0.1em">//</span> kurb.me
      </div>
    </div>`;

    return new ImageResponse(html, {
      width: 1200,
      height: 630,
    });
  },
};
