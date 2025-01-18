const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store all connected clients
const clients = new Map();
// Store waiting users
const waitingUsers = new Map();

wss.on('connection', (ws) => {
    console.log('New client connected');
    
    let userData = null;

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        
        switch (data.type) {
            case 'user_info':
                // Store user info
                userData = data.data;
                clients.set(ws, userData);
                console.log(`User ${userData.username} joined`);
                // Confirm connection
                ws.send(JSON.stringify({
                    type: 'user_connected'
                }));
                break;

            case 'find_partner':
                handlePartnerSearch(ws, userData, data.preference);
                break;

            case 'message':
                // Forward message to partner
                const partner = findPartnerSocket(ws);
                if (partner) {
                    partner.send(JSON.stringify({
                        type: 'message',
                        message: data.message
                    }));
                }
                break;

            case 'image':
            case 'video':
                // Forward media to partner
                const mediaPartner = findPartnerSocket(ws);
                if (mediaPartner) {
                    mediaPartner.send(JSON.stringify({
                        type: data.type,
                        data: data.data
                    }));
                }
                break;

            case 'disconnect':
                handleDisconnect(ws);
                break;

            case 'cancel_search':
                waitingUsers.delete(ws);
                break;
        }
    });

    ws.on('close', () => {
        handleDisconnect(ws);
        clients.delete(ws);
        waitingUsers.delete(ws);
        console.log('Client disconnected');
    });
});

function handlePartnerSearch(ws, userData, preference) {
    // Remove from any existing conversation
    handleDisconnect(ws);
    
    // Update user's preference
    userData.preference = preference;
    
    // Add to waiting list
    waitingUsers.set(ws, {
        userData: userData,
        preference: preference
    });

    // Try to find a match
    for (const [waitingWs, waitingData] of waitingUsers.entries()) {
        if (waitingWs !== ws && isCompatibleMatch(userData, waitingData)) {
            // Match found! Connect them
            connectUsers(ws, waitingWs);
            return;
        }
    }
}

function isCompatibleMatch(user1, user2Data) {
    const user1Gender = user1.gender;
    const user1Pref = user1.preference;
    const user2Gender = user2Data.userData.gender;
    const user2Pref = user2Data.preference;

    // Case 1: When user1 selects "anyone"
    if (user1Pref === 'anyone') {
        if (user1Gender === 'female') {
            return user2Pref === 'female' && user2Gender === 'female';
        } else if (user1Gender === 'male') {
            return user2Pref === 'male' && user2Gender === 'male';
        } else if (user1Gender === 'transgender') {
            return user2Pref === 'transgender' && user2Gender === 'transgender';
        }
    }

    // Case 2: When user1 selects "female"
    if (user1Pref === 'female') {
        if (user1Gender === 'female') {
            return user2Pref === 'female' && user2Gender === 'female';
        } else if (user1Gender === 'male') {
            return user2Pref === 'male' && user2Gender === 'male';
        } else if (user1Gender === 'transgender') {
            return user2Pref === 'transgender' && user2Gender === 'transgender';
        }
    }

    // Case 3: When user1 selects "male"
    if (user1Pref === 'male') {
        if (user1Gender === 'female') {
            return user2Pref === 'female' && user2Gender === 'female';
        } else if (user1Gender === 'male') {
            return user2Pref === 'male' && user2Gender === 'male';
        } else if (user1Gender === 'transgender') {
            return user2Pref === 'transgender' && user2Gender === 'transgender';
        }
    }

    // Case 4: When user1 selects "transgender"
    if (user1Pref === 'transgender') {
        if (user1Gender === 'female') {
            return user2Pref === 'female' && user2Gender === 'female';
        } else if (user1Gender === 'male') {
            return user2Pref === 'male' && user2Gender === 'male';
        } else if (user1Gender === 'transgender') {
            return user2Pref === 'transgender' && user2Gender === 'transgender';
        }
    }

    return false;
}

function connectUsers(ws1, ws2) {
    // Remove both from waiting list
    waitingUsers.delete(ws1);
    waitingUsers.delete(ws2);

    // Send partner info to both users
    const user1Data = clients.get(ws1);
    const user2Data = clients.get(ws2);

    ws1.send(JSON.stringify({
        type: 'partner_found',
        partner: user2Data
    }));

    ws2.send(JSON.stringify({
        type: 'partner_found',
        partner: user1Data
    }));

    // Store partner connection
    ws1.partner = ws2;
    ws2.partner = ws1;
}

function handleDisconnect(ws) {
    if (ws.partner) {
        // Notify partner about disconnection
        ws.partner.send(JSON.stringify({
            type: 'partner_disconnected'
        }));
        // Clear partner reference
        ws.partner.partner = null;
        ws.partner = null;
    }
}

function findPartnerSocket(ws) {
    return ws.partner;
}

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 