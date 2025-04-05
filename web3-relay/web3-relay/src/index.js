import { ethers } from "ethers";


export default {
  async fetch(request, env, ctx) {
    console.log("📩 Web3 relay triggered");
    console.log("Method:", request.method);
    console.log("DEBUG: CONTRACT_ADDRESS =", env.CONTRACT_ADDRESS);
    console.log("DEBUG: RPC_URL =", env.RPC_URL);

    if (request.method !== "POST") {
      return new Response("Send a POST request with JSON { content }", { status: 405 });
    }

    let data;
    try {
      data = await request.json();
      console.log("📨 Payload received:", JSON.stringify(data));
    } catch (err) {
      console.error("❌ Failed to parse JSON:", err);
      return new Response("Invalid JSON", { status: 400 });
    }

    const { from, to, point, subject, content, received } = data;

    if (!content) {
      return new Response("Missing 'content' field", { status: 400 });
    }

    // ✅ Hash the content body for on-chain proof
	const messageHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(content));
	console.log("🧾 Message Hash:", messageHash); // ✅ Already a hex string


    // ✅ Set up connection to Polygon Amoy
    const provider = new ethers.providers.JsonRpcProvider({
      url: env.RPC_URL,
      allowGzip: true,
      skipFetchSetup: true,
    }, {
      chainId: 80002,
      name: "polygon-amoy",
    });

    const wallet = new ethers.Wallet(env.PRIVATE_KEY, provider);

    const abi = [
      "function recordContribution(bytes32 messageHash) external"
    ];
    const contract = new ethers.Contract(env.CONTRACT_ADDRESS, abi, wallet);

    // ✅ Call contract
    try {
      const tx = await contract.recordContribution(messageHash, {
        maxPriorityFeePerGas: ethers.utils.parseUnits("25", "gwei"),
        maxFeePerGas: ethers.utils.parseUnits("50", "gwei"),
      });

      await tx.wait();

      console.log("✅ Hash submitted:", messageHash);
      return new Response(JSON.stringify({
        status: "ok",
        tx: tx.hash,
        hash: messageHash,
        point,
        from,
        received,
      }));
    } catch (e) {
      console.error("❌ Web3 write failed:", e);
      return new Response("Transaction failed: " + e.message, { status: 500 });
    }
  }
};
