// Load marked.js for markdown parsing
const script = document.createElement("script");
script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
document.head.appendChild(script);

// Initialize AI assistance UI
function initAssistance() {
    if (document.getElementById("aiAssistance")) return;

    // Create AI button
    const aiButton = document.createElement("div");
    aiButton.id = "aiAssistance";
    aiButton.innerText = "AI";
    aiButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        background-color: #0084ff;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 1000;
        font-size: 14px;
    `;

    // Create chat container
    const chatContainer = document.createElement("div");
    chatContainer.id = "aiChat";
    chatContainer.style.cssText = `
        position: fixed;
        bottom: 100px;
        right: 20px;
        width: 350px;
        height: 500px;
        background-color: white;
        border-radius: 10px;
        box-shadow: 0 0 10px rgna(0,0,0,0.1);
        display: none;
        flex-direction: column;
        z-index: 1000;
    `;

    // Create chat messages box
    const messagesBox = document.createElement("div");
    messagesBox.id = "aiMessages";
    messagesBox.style.cssText = `
        flex: 1;
        overflow-y: auto;
        padding: 20px;
    `;

    // Create input bar
    const inputBar = document.createElement("div");
    inputBar.style.cssText = `
        display: flex;
        border-top: 1px solid #eee;
        padding: 10px;
    `;
    const bubbleStyle = document.createElement("style");
    bubbleStyle.textContent = ".bubble-container p {margin: 0;}";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Input message here...";
    input.style.cssText = `
        flex: 1;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin-right: 8px;
    `;

    const sendButton = document.createElement("button");
    sendButton.innerText = "Send";
    sendButton.style.cssText = `
        padding: 8px 16px;
        background-color: #0084ff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    `;

    // Assemble the UI
    inputBar.appendChild(input);
    inputBar.appendChild(sendButton);
    chatContainer.appendChild(messagesBox);
    chatContainer.appendChild(inputBar);
    document.body.appendChild(aiButton);
    document.body.appendChild(chatContainer);
    document.head.appendChild(bubbleStyle);

    // Chat state
    let messages = [];
    const sessionId = Math.random().toString(36).substring(7);

    // Toggle chat window
    aiButton.addEventListener("click", () => {
        chatContainer.style.display = chatContainer.style.display === "none" ? "flex" : "none";
    });

    // Handle sned message
    async function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        // Add user message to chat
        messages.push({role: "user", content: text});
        appendMessage("user", text);
        input.value = "";

        try {
            const response = await fetch("http://localhost:3000", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages,
                    sessionId
                }),
            });

            const reader = response.body.getReader();
            let partialResponse = "";

            while (true) {
                const {done, value} = await reader.read();
                if (done) break;

                const chunk = new TextDecoder().decode(value);
                const lines = (partialResponse + chunk).split("\n");
                partialResponse = lines.pop();

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const data = JSON.parse(line.slice(6));
                        if (data.text) {
                            messages.push({role: "assistant", content: data.text});
                            appendMessage("assistant", data.text);
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error:", error);
            appendMessage("system", "Send message failed, please retry");
        }
    }

    // Append message to chat
    function appendMessage(role, content) {
        const messageDiv = document.createElement("div");
        messageDiv.style.cssText = `
            margin-bottom: 10px;
            ${role === "user" ? "text-align: right;" : ""}
        `;

        const bubble = document.createElement("div");
        bubble.className = "bubble-container";
        bubble.style.cssText = `
            display: inline-block;
            max-width: 80%;
            padding: 8px 12px;
            border-radius: 8px;
            ${
            role === "user" ? "background-color: #0084ff; color: white;" : "background-color: #f1f1f1; color: black;"
        }
        `;

        bubble.innerHTML = window.marked.parse(content);

        messageDiv.appendChild(bubble);
        messagesBox.appendChild(messageDiv);
        messagesBox.scrollTop = messagesBox.scrollHeight;
    }

    // Event listeners
    sendButton.addEventListener("click", sendMessage);
    input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAssistance);
} else {
    initAssistance();
}