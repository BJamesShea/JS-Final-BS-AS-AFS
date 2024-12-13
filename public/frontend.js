// Initialize WebSocket connection
const webSocket = new WebSocket("ws://localhost:3000/chat");

// Event listener for when WebSocket connection is opened
webSocket.onopen = () => {
  console.log("WebSocket connection established.");
};

// Event listener for receiving messages from WebSocket server
webSocket.addEventListener("message", (event) => {
  const eventData = JSON.parse(event.data);
  // Handle the received message
  onNewMessageReceived(
    eventData.sender, // Username of the sender
    eventData.createdAt, // Timestamp of when the message was sent
    eventData.content // The content of the message
  );
});

/**
 * Handles updating the chat user list when a new user connects
 *
 * This function isn't necessary and should be deleted if unused. But it's left as a hint to how you might want
 * to handle users connecting
 *
 * @param {string} username The username of the user who joined the chat
 */
function onUserConnected(username) {
  console.log(`${username} connected.`);
}

/**
 * Handles updating the chat list when a user disconnects from the chat
 *
 * This function isn't necessary and should be deleted if unused. But it's left as a hint to how you might want
 * to handle users disconnecting
 *
 * @param {string} username The username of the user who left the chat
 */
function onUserDisconnected(username) {
  console.log(`${username} disconnected.`);
}

/**
 * Handles updating the chat when a new message is received
 *
 * This function is responsible for updating the chat UI with a new message
 *
 * @param {string} username The username of the user who sent the message
 * @param {string} timestamp When the message was sent
 * @param {string} message The message that was sent
 */
function onNewMessageReceived(username, timestamp, message) {
  const messageList = document.getElementById("message-list");
  const newMessage = document.createElement("div");

  // Display the message sender, content, and timestamp
  newMessage.innerHTML = `<strong>${username}</strong>: ${message} <br> <small>${timestamp}</small>`;
  messageList.appendChild(newMessage);
}

/**
 * Handles sending a message to the server when the user sends a new message
 * @param {FormDataEvent} event The form submission event containing the message information
 */
function onMessageSent(event) {
  event.preventDefault(); // Prevent form from reloading the page

  // Grab the message content from the form
  const messageInput = document.getElementById("message-input");
  const content = messageInput.value;

  // Ensure content is not empty
  if (content.trim()) {
    // Replace with the actual senderId (using the session's userId passed from the server-side)
    const senderId = userId; // 'userId' should be passed from the server-side as a session variable

    // Create the message object to be sent
    const message = { senderId, content };

    // Send the message over WebSocket
    webSocket.send(JSON.stringify(message));

    // Clear the input field after sending
    messageInput.value = "";
  }
}

// Attach the event listener for form submission
document
  .getElementById("message-form")
  .addEventListener("submit", onMessageSent);
