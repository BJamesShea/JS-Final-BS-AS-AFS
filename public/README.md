# **Real-Time Chat Application**

A real-time chat application developed by **Brandon Shea, Adam Stevenson, and Angie Flynn-Smith**. This app allows users to sign up, log in, and send messages in real time, while also providing admin functionalities and user profile views. Built using **Node.js**, **Express**, **WebSockets**, and **MongoDB**, it ensures secure and smooth communication.

---

## **Table of Contents**

- [Features](#features)
- [Technologies Used](#technologies-used)
- [Installation](#installation)
- [Usage](#usage)
- [Routes Overview](#routes-overview)
- [Admin Access](#admin-access)
- [Contributors](#contributors)
- [License](#license)

---

## **Features**

- **User Authentication**
  - Sign-up and login with session-based authentication.
- **Real-Time Messaging**
  - Send and receive messages instantly using WebSockets.
- **Admin Panel**
  - Admins can view all users and remove accounts if necessary.
- **User Profile Management**
  - Users can view their own profile and others’ profiles.
- **Online User Count**
  - Live display of the total number of active users in the chatroom.
- **Secure Password Storage**
  - Passwords are hashed using bcrypt for added security.

---

## **Technologies Used**

- **Backend**: Node.js, Express.js
- **Database**: MongoDB (with Mongoose ORM)
- **Real-Time Communication**: WebSockets via `express-ws`
- **Templating Engine**: EJS (Embedded JavaScript Templates)
- **Authentication**: Express Sessions, bcrypt for secure password hashing

---

## **Installation**

Follow the steps below to set up and run the application locally on your machine.

### **Prerequisites**

- **Node.js** installed
- **MongoDB** installed and running locally
- **MongoDB Database** Database named chat_app with two collections named users and messages

---

### **Steps**

1. **Clone the Repository**  
   Open your terminal and run the following commands:
   ```bash
   git clone <repository-url>
   cd <project-directory>
   npm start
   ```
