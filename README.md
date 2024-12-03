1. Prerequisites:
   - Node.js installed on your system

2. Clone the repository:
   ```
   git clone https://github.com/santhoshkamalmurthy/webrtc-video-call.git
   cd webrtc-video-call
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Generate SSL/TLS certificates:
   - Create a new directory named `certs` in the project root.
   - Navigate to the `certs` directory.
   - Generate a private key and self-signed certificate using OpenSSL:
     ```
     openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes
     ```
   - Move the generated `key.pem` and `cert.pem` files to the project root directory.

5. Start the WebSocket server:
   ```
   node server.js
   ```
   The server will start running on `https://localhost:8080`.

6. Start the HTTPS server for the client:
   ```
   node client.js
   ```
   The client server will start running on `https://localhost:5001`.

7. Open a web browser and navigate to `https://localhost:5001`.
   - You may see a security warning due to the self-signed certificate. Click "Advanced" or "Proceed" to continue to the website.

8. Register users:
   - Enter a username in the provided input field and click the "Register" button.
   - Open multiple browser tabs or windows and register different usernames to simulate multiple users.

9. Make a video call:
   - Select a user from the user list to call.
   - Click the "Call" button next to the desired user.
   - The selected user will receive an incoming call notification.

10. Accept or reject a call:
    - When receiving an incoming call, click the "Accept" button to accept the call or the "Reject" button to decline the call.
    - If the call is accepted, the video call will be established between the two users.

11. End a call:
    - To end an ongoing call, click the "End Call" button.
    - The call will be terminated for both users.

Note: Since the code uses self-signed certificates for HTTPS and WSS, you may need to configure your browser to trust the certificate or temporarily ignore the security warning.