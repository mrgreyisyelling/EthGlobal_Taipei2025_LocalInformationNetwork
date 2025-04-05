export default {
	async email(message, env, ctx) {
	  function parseMime(content) {
		const boundaryMatch = content.match(/boundary="(.+?)"/);
		if (!boundaryMatch) return { text: "", html: "" };
  
		const boundary = boundaryMatch[1];
		const parts = content.split(`--${boundary}`);
  
		let text = "";
		let html = "";
  
		for (const part of parts) {
		  if (part.includes("Content-Type: text/plain")) {
			const match = part.match(/\r\n\r\n([\s\S]*)/);
			if (match) text = match[1].trim();
		  } else if (part.includes("Content-Type: text/html")) {
			const match = part.match(/\r\n\r\n([\s\S]*)/);
			if (match) html = match[1].trim();
		  }
		}
  
		return { text, html };
	  }
  
	  try {
		const from = message.from;
		const to = message.to;
		const subject = message.headers.get("Subject") || "(no subject)";
		const point = to.split("@")[0];
		const timestamp = Date.now();
		const key = `${point}/${from}-${timestamp}`;
  
		let contentRaw = "";
		let hasAttachments = false;
  
		try {
		  const reader = message.raw.getReader();
		  let chunks = [];
		  let done, value;
  
		  while ({ done, value } = await reader.read(), !done) {
			chunks.push(value);
		  }
  
		  const full = new Uint8Array(chunks.reduce((acc, val) => acc + val.length, 0));
		  let offset = 0;
		  for (const chunk of chunks) {
			full.set(chunk, offset);
			offset += chunk.length;
		  }
  
		  const decoder = new TextDecoder("utf-8");
		  contentRaw = decoder.decode(full);
		} catch (err) {
		  console.error("⚠️ Failed to decode message body:", err);
		}
  
		const parsed = parseMime(contentRaw);
  
		await env.MESSAGES.put(key, JSON.stringify({
		  from,
		  to,
		  point,
		  subject,
		  content: {
			text: parsed.text,
			html: parsed.html,
		  },
		  received: new Date().toISOString(),
		  attachments: hasAttachments,
		}));
  
		console.log("✅ Stored message at key:", key);
		console.log("📤 Sending to Web3 relay:", JSON.stringify({
		  from,
		  to,
		  point,
		  subject,
		  content: {
			text: parsed.text,
			html: parsed.html,
			raw: contentRaw
		  },
		  received: new Date().toISOString(),
		  attachments: hasAttachments
		}, null, 2));
  
		try {
		  const response = await fetch("https://web3-relay.mike-penta.workers.dev", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
			  from,
			  to,
			  point,
			  subject,
			  content: {
				text: parsed.text,
				html: parsed.html,
				raw: contentRaw
			  },
			  received: new Date().toISOString(),
			  attachments: hasAttachments
			})
		  });
  
		  const resText = await response.text();
		  console.log("🌐 Web3 response:", response.status, resText);
		} catch (e) {
		  console.error("🌐 Web3 fetch failed:", e.message || e);
		}

		// 🌍 Relay to Aggregator
		try {
			const aggregatorURL = "https://latencybubble.io/ingest";
		
			const aggregatorPayload = {
			key,
			from,
			to,
			point,
			subject,
			content: {
				text: parsed.text,
				html: parsed.html,
				raw: contentRaw,
			},
			received: new Date().toISOString(),
			attachments: hasAttachments
			};
		
			console.log("📡 Sending to Aggregator:", JSON.stringify(aggregatorPayload, null, 2));
		
			const aggRes = await fetch(aggregatorURL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(aggregatorPayload)
			});
		
			const aggText = await aggRes.text();
			console.log("🌐 Aggregator response:", aggRes.status, aggText);
		} catch (e) {
			console.error("⚠️ Aggregator push failed:", e.message || e);
		}
  
  
		return new Response("Message stored, hashed, and repeated", { status: 200 });
	  } catch (err) {
		console.error("❌ Worker error:", err);
		return new Response("Worker handled error", { status: 202 });
	  }
	},

	async fetch() {
		return new Response("This worker only handles inbound emails.", { status: 200 });
	}
  }
  