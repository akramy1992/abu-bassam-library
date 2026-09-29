Deno.serve(() => new Response(JSON.stringify({ ok: false, error: 'bootstrap disabled' }), { status: 410, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }));
