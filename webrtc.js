let username;
let localStream;
let peerConnection;
let signalingChannel;
let currentCall = null;
let presentCallUser = null;
const config = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

async function login() {
    username = document.getElementById('username').value.trim();
    if (!username) return;

    signalingChannel = new WebSocket('wss://10.2.1.53:8080');
    setupSignaling();

    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainScreen').classList.remove('hidden');
}

function setupSignaling() {
    signalingChannel.onopen = () => {
        signalingChannel.send(JSON.stringify({
            type: 'register',
            username
        }));
    };

    signalingChannel.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        
        switch(data.type) {
            case 'users':
                updateUsersList(data.users);
                break;
            case 'incomingCall':
                handleIncomingCall(data);
                break;
            case 'acceptCall':
                handleCallAccepted(data);
                break;
            case 'rejectCall':
                handleCallRejected(data);
                break;
            case 'offer':
                handleOffer(data.offer, data.from);
                break;
            case 'answer':
                handleAnswer(data.answer);
                break;
            case 'iceCandidate':
                handleIceCandidate(data.candidate);
                break;
            case 'disableIncomingCallUI':
                disableIncomingCallUI();
                break;
            case 'endCall':
                endCall();
                break;
        }
    };
}

function updateUsersList(users) {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '';
    
    users.forEach(user => {
        if (user === username) return;
        
        const userDiv = document.createElement('div');
        userDiv.className = 'p-4 hover:bg-gray-100 cursor-pointer flex items-center';
        userDiv.innerHTML = `
            <div class="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white mr-3">
                ${user.charAt(0).toUpperCase()}
            </div>
            <div>
                <div class="font-medium">${user}</div>
                <div class="text-sm text-gray-500">Online</div>
            </div>
            <button class="ml-auto bg-green-500 text-white px-3 py-1 rounded">
                Call
            </button>
        `;
        
        userDiv.querySelector('button').onclick = () => startCall(user);
        usersList.appendChild(userDiv);
    });
}

async function startCall(targetUser) {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('localVideoElement').srcObject = localStream;
        presentCallUser = targetUser;
        peerConnection = createPeerConnection();
        currentCall = { user: targetUser };
        
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        signalingChannel.send(JSON.stringify({
            type: 'call',
            target: targetUser,
            offer
        }));
        
        showCallUI();
    } catch (e) {
        console.error('Error starting call:', e);
        alert('Could not start call. Please check camera/microphone permissions.');
    }
}

function createPeerConnection() {
    const pc = new RTCPeerConnection(config);
    
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            signalingChannel.send(JSON.stringify({
                type: 'iceCandidate',
                candidate: event.candidate,
                target: currentCall.user
            }));
        }
    };
    
    pc.ontrack = (event) => {
        document.getElementById('remoteVideoElement').srcObject = event.streams[0];
        document.getElementById('remoteVideo').classList.remove('hidden');
    };
    
    return pc;
}

function showCallUI() {
    document.getElementById('noCallScreen').classList.add('hidden');
    document.getElementById('callScreen').classList.remove('hidden');
    document.getElementById('callControls').classList.remove('hidden');
}

function hideCallUI() {
    document.getElementById('noCallScreen').classList.remove('hidden');
    document.getElementById('callScreen').classList.add('hidden');
    document.getElementById('callControls').classList.add('hidden');
    document.getElementById('remoteVideo').classList.add('hidden');
}

function handleIncomingCall(data) {
    document.getElementById('callerName').textContent = data.from;
    document.getElementById('incomingCallDialog').classList.remove('hidden');
    
    document.getElementById('acceptCall').onclick = async () => {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            document.getElementById('localVideoElement').srcObject = localStream;
            
            peerConnection = createPeerConnection();
            currentCall = { user: data.from };
            
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
            
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            signalingChannel.send(JSON.stringify({
                type: 'acceptCall',
                target: data.from,
                answer
            }));
            
            document.getElementById('incomingCallDialog').classList.add('hidden');
            showCallUI();
        } catch (e) {
            console.error('Error accepting call:', e);
            alert('Could not accept call. Please check camera/microphone permissions.');
        }
    };
    
    document.getElementById('rejectCall').onclick = () => {
        signalingChannel.send(JSON.stringify({
            type: 'rejectCall',
            target: data.from
        }));
        document.getElementById('incomingCallDialog').classList.add('hidden');
    };
}

async function handleCallAccepted(data) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
}

function handleCallRejected() {
    alert('Call was rejected');
    endCall();
}

async function handleOffer(offer, from) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
}

async function handleAnswer(answer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

async function handleIceCandidate(candidate) {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

function disableIncomingCallUI() {
    document.getElementById('incomingCallDialog').classList.add('hidden');
}

function endCall() {
    if (currentCall) {
        signalingChannel.send(JSON.stringify({
            type: 'endCall',
            target: currentCall.user
        }));
    }
    
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    signalingChannel.send(JSON.stringify({
        type: 'disableIncomingCallUI',
        target: presentCallUser
    }));
    currentCall = null;
    presentCallUser = null;
    hideCallUI();
}

// Event Listeners
document.getElementById('loginBtn').addEventListener('click', login);
document.getElementById('endCall').addEventListener('click', endCall);
document.getElementById('toggleAudio').addEventListener('click', () => {
    const audioTrack = localStream.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
    document.getElementById('toggleAudio').textContent = audioTrack.enabled ? '🎤' : '🔇';
});
document.getElementById('toggleVideo').addEventListener('click', () => {
    const videoTrack = localStream.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
    document.getElementById('toggleVideo').textContent = videoTrack.enabled ? '📹' : '🎦';
});