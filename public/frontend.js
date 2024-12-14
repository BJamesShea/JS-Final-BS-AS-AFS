// Establish WebSocket connection
const webSocket = new WebSocket("ws://localhost:3000/chat");

// Join chat on WebSocket open
webSocket.onopen = () => {
  webSocket.send(JSON.stringify({ type: "join", username }));
};

// Handle WebSocket messages
webSocket.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "onlineCount") {
    document.getElementById("online-users-count").textContent = data.count;
  } else if (data.senderUsername) {
    displayMessage(data.senderUsername, data.content, data.createdAt);
  }
});

// Display messages in chat
function displayMessage(username, content, timestamp) {
  const messageList = document.getElementById("message-list");
  const messageItem = document.createElement("div");
  messageItem.innerHTML = `<strong>${username}</strong>: ${content} <small>${new Date(
    timestamp
  ).toLocaleTimeString()}</small>`;
  messageList.appendChild(messageItem);
  messageList.scrollTop = messageList.scrollHeight;
}

// Handle sending a message
document.getElementById("message-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("message-input");
  if (input.value.trim()) {
    webSocket.send(
      JSON.stringify({
        type: "message",
        senderId: userId,
        content: input.value,
      })
    );
    input.value = "";
  }
});
