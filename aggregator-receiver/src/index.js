export default {
	async fetch(request, env, ctx) {
	  if (request.method !== "POST") {
		return new Response("POST required", { status: 405 });
	  }
  
	  let body;
	  try {
		body = await request.json();
	  } catch (err) {
		return new Response("Invalid JSON", { status: 400 });
	  }
  
	  console.log("📥 Aggregator received message:", JSON.stringify(body, null, 2));
  
	  // 📝 Optionally store it if you want to persist
	  // await env.AGG_MESSAGES.put(body.key, JSON.stringify(body));
  
	  return new Response(JSON.stringify({ status: "ok", received: true }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	  });
	},
  };
  