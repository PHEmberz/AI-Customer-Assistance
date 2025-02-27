const http = require('http');
const {
    BedrockAgentRuntimeClient,
    InvokeAgentCommand,
} = require('@aws-sdk/client-bedrock-agent-runtime');

// List of agents
const AgentList = [
    {
        // Local server
        origin: "http://127.0.0.1:5500",
        agentId: "",    // Fill in your agent id
        agentAliasId: "",   // Fill in your agent alias id
    }
]

// Create BedrockAgentRuntimeClient
const client = new BedrockAgentRuntimeClient({
    region: "us-east-1"
});

// Create server
const server = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");  // Enable CORS
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === "POST") {
        // Check origin
        const origin = req.headers.origin;
        const agent = AgentList.find((agent) => agent.origin === origin);
        if (!agent) {
            res.writeHead(403);
            res.end("Forbidden: Origin not allowed");
            return;
        }

        let body = "";
        req.on("data", (chunk) => {
            body += chunk.toString();
        })

        req.on("end", async () => {
            try {
                const {messages, sessionID} = JSON.parse(body)

                const command = new InvokeAgentCommand({
                    agentId: agent.agentId,
                    agentAliasId: agent.agentAliasId,
                    sessionId: sessionID,
                    InputText: messages[messages.length - 1].content
                });

                // Enable streaming for the response
                res.writeHead(200, {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive"
                });

                try {
                    let completion = "";
                    const response = await client.send(command);

                    if (response.completion === undefined) {
                        throw new Error("Completion is undifined")
                    }

                    for await (const chunkEvent of response.completion) {
                        const decodedResponse = new TextDecoder("utf-8").decode(chunkEvent.chunk.bytes);
                        res.write(`data: ${JSON.stringify({text: decodedResponse})}\n\n`);
                        completion += decodedResponse;
                    }

                    res.end();
                } catch (error) {
                    console.error("Error invoking agent:", error);
                    res.write(
                        `data: ${JSON.stringify({error: "Failed to get response from AI",})}\n\n`
                    );
                    res.end();
                }
            } catch (error) {
                console.error("Error processing request:", error);
                res.writeHead(400);
                res.end("Bad Request");
            }
        });
    } else {
        res.writeHead(405);
        res.end("Method Not Allowed");
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
})
