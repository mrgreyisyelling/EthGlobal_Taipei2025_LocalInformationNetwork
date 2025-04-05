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
			// ➕ Add this: send to Web3 relay
			try {
				await fetch("https://relay.dingadongacron.net/submit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					from,
					to,
					point,
					subject,
					content,
					received: new Date().toISOString(),
					attachments: hasAttachments
				})
				});
				console.log("🔗 Relayed to Web3 handler");
			} catch (relayErr) {
				console.error("⚠️ Relay to Web3 worker failed:", relayErr);
			}
			return new Response("Message stored", { status: 200 });
		} catch (err) {
			console.error("❌ Worker error:", err);
			return new Response("Worker handled error", { status: 202 });
		}
	}
}
