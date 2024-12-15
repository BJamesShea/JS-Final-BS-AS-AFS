const webSocket = new WebSocket("ws://localhost:3000/chat");

console.log("Attempting WebSocket connection...");
console.log("WebSocket URL: ws://localhost:3000/chat");

webSocket.onopen = () => {
  console.log("WebSocket connection established.");
  webSocket.send(JSON.stringify({ type: "join", username }));
};

webSocket.onmessage = (event) => {
  console.log("Received WebSocket event:", event);
  console.log("Raw WebSocket data:", event.data);

  try {
    const data = JSON.parse(event.data);
    console.log("Parsed WebSocket message:", data);

    if (data.type === "onlineCount") {
      console.log("Online user count:", data.count);
      document.getElementById("online-users-count").textContent = data.count;
    } else if (data.senderUsername && data.content) {
      console.log("Message received from server:", {
        senderUsername: data.senderUsername,
        content: data.content,
        timestamp: data.createdAt,
      });
      displayMessage(data.senderUsername, data.content, data.createdAt);
    } else {
      console.warn("Unexpected message format:", data);
    }
  } catch (error) {
    console.error("Error parsing WebSocket message:", error);
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
