/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { ethers } from "ethers";

export default {
  async fetch(request, env, ctx) {

	console.log("DEBUG: CONTRACT_ADDRESS =", env.CONTRACT_ADDRESS);
	console.log("DEBUG: RPC_URL =", env.RPC_URL);

    if (request.method !== "POST") {
      return new Response("Send a POST request with JSON { message }", { status: 405 });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response("Invalid JSON", { status: 400 });
    }

    const message = body.message;
    if (!message) {
      return new Response("Missing 'message' field", { status: 400 });
    }

    // Hash the message
    const messageHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message));

    // Set up connection to Polygon
	const provider = new ethers.providers.JsonRpcProvider({
		url: env.RPC_URL,
		allowGzip: true,
		skipFetchSetup: true
	  }, {
		chainId: 80002,
		name: "polygon-amoy"
	  });
	  
    const wallet = new ethers.Wallet(env.PRIVATE_KEY, provider);

    const abi = [
      "function recordContribution(bytes32 messageHash) external"
    ];
    const contract = new ethers.Contract(env.CONTRACT_ADDRESS, abi, wallet);

    // Call the contract
    try {
		const tx = await contract.recordContribution(messageHash, {
			maxPriorityFeePerGas: ethers.utils.parseUnits("25", "gwei"),
			maxFeePerGas: ethers.utils.parseUnits("50", "gwei")
			});
		  
      await tx.wait();
      return new Response(JSON.stringify({ status: "ok", hash: tx.hash }));
    } catch (e) {
      return new Response("Transaction failed: " + e.message, { status: 500 });
    }
  }
}
