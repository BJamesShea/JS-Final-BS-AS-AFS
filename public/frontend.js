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
      displayMessage(data.senderUsername, data.content, data.createdAt);
    }
  } catch (error) {
    console.error("Error processing WebSocket message:", error);
  }
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
  messageItem.innerHTML = `<strong>${username}:</strong> ${content} - ${new Date(
    timestamp
  ).toLocaleTimeString()}`;

  messageList.appendChild(messageItem);
  messageList.scrollTop = messageList.scrollHeight;

  console.log("Message appended to DOM:", messageItem.innerHTML);
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
