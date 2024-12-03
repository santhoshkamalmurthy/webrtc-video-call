const WebSocket = require('ws');
const https = require('https');
const fs = require('fs');

const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};

const server = https.createServer(options);
const wss = new WebSocket.Server({ server });

const users = new Map(); // username -> websocket

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        
        switch(data.type) {
            case 'register':
                handleRegister(ws, data.username);
                break;
            case 'call':
                handleCall(ws, data);
                break;
            case 'acceptCall':
            case 'rejectCall':
            case 'endCall':
            case 'iceCandidate':
            case 'disableIncomingCallUI':
                forwardToUser(data);
                break;
        }
    });

    ws.on('close', () => {
        if (ws.username) {
            users.delete(ws.username);
            broadcastUsers();
        }
    });
});

function handleRegister(ws, username) {
    ws.username = username;
    users.set(username, ws);
    broadcastUsers();
}

function handleCall(ws, data) {
    const targetWs = users.get(data.target);
    if (targetWs) {
        targetWs.send(JSON.stringify({
            type: 'incomingCall',
            from: ws.username,
            offer: data.offer
        }));
    }
}

function forwardToUser(data) {
    const targetWs = users.get(data.target);
    if (targetWs) {
        targetWs.send(JSON.stringify(data));
    }
}

function broadcastUsers() {
    const usersList = Array.from(users.keys());
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'users',
                users: usersList
            }));
        }
    });
}

server.listen(8080);