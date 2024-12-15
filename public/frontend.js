const webSocket = new WebSocket("ws://localhost:3000/chat");

console.log("Attempting WebSocket connection...");
console.log("WebSocket URL: ws://localhost:3000/chat");

webSocket.onopen = () => {
  console.log("WebSocket connection established.");
  webSocket.send(JSON.stringify({ type: "join", username }));
};

webSocket.onmessage = (event) => {
  console.log("WebSocket message event fired! Raw message:", event.data);
  try {
    const data = JSON.parse(event.data);
    console.log("Parsed WebSocket data:", data);

    if (data.type === "onlineCount") {
      document.getElementById("online-users-count").textContent = data.count;
    }

    if (data.senderUsername && data.content) {
      console.log("Calling displayMessage with:", {
        username: data.senderUsername,
        content: data.content,
        createdAt: data.createdAt,
      });
      displayMessage(data.senderUsername, data.content, data.createdAt);
    }
  } catch (error) {
    console.error("Error processing WebSocket message:", error);
  }
};

webSocket.onclose = () => {
  console.warn("WebSocket closed. Reconnecting...");
  setTimeout(() => location.reload(), 3000);
};

function displayMessage(username, content, timestamp) {
  console.log("Appending message:", { username, content, timestamp });

  const messageList = document.getElementById("message-list");
  if (!messageList) {
    console.error("Message list container not found in DOM!");
    return;
  }

  const messageItem = document.createElement("div");
  messageItem.classList.add("message-item");
  messageItem.textContent = `${username}: ${content} - ${new Date(
    timestamp
  ).toLocaleTimeString()}`;

  messageList.appendChild(messageItem);
  messageList.scrollTop = messageList.scrollHeight;

  console.log("Message appended to DOM:", messageItem.textContent);
}

document.getElementById("message-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("message-input");
  if (input.value.trim()) {
    webSocket.send(
      JSON.stringify({
        type: "message",
        senderId: userId,
        content: input.value.trim(),
      })
    );
    input.value = "";
  }
});
