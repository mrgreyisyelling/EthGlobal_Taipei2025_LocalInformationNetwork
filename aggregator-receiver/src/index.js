export default {

	const emailToENS = {
		"mike.penta@gmail.com": "mikepenta.eth",
	  };


	async fetch(request, env, ctx) {


		const { from } = await request.json();

		const ens = emailToENS[from.toLowerCase()];
		if (!ens) {
		  return new Response("Unregistered email", { status: 403 });
		}
		
		const wallet = await provider.resolveName(ens);
		if (!wallet) {
		  return new Response("ENS not resolved", { status: 404 });
		}
		
		console.log("✉️ Message from", from, "is attributed to ENS:", ens, "→", wallet);
		
	
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
  