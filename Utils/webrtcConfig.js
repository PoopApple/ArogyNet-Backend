// WebRTC Configuration and ICE Servers
const STUN_SERVERS = [
    { url: 'stun:stun01.sipphone.com' },
    { url: 'stun:stun.ekiga.net' },
    { url: 'stun:stun.fwdnet.net' },
    { url: 'stun:stun.ideasip.com' },
    { url: 'stun:stun.iptel.org' },
    { url: 'stun:stun.rixtelecom.se' },
    { url: 'stun:stun.schlund.de' },
    { url: 'stun:stun.l.google.com:19302' },
    { url: 'stun:stun1.l.google.com:19302' },
    { url: 'stun:stun2.l.google.com:19302' },
    { url: 'stun:stun3.l.google.com:19302' },
    { url: 'stun:stun4.l.google.com:19302' },
    { url: 'stun:stunserver.org' },
    { url: 'stun:stun.softjoys.com' },
    { url: 'stun:stun.voiparound.com' },
    { url: 'stun:stun.voipbuster.com' },
    { url: 'stun:stun.voipstunt.com' },
    { url: 'stun:stun.voxgratia.org' },
    { url: 'stun:stun.xten.com' },
];

// PC Configuration with STUN servers
const PC_CONFIG = {
    iceServers: STUN_SERVERS,
};

// Optional TURN servers (add your TURN server credentials here)
const getTURNServers = () => {
    const turnServers = [];
    
    // Example: Uncomment and add your TURN server if needed
    // turnServers.push({
    //     url: 'turn:your-turn-server.com',
    //     username: 'your-username',
    //     credential: 'your-credential',
    // });
    
    return turnServers;
};

// Merge STUN and TURN servers
const getICEServers = () => {
    return {
        iceServers: [...STUN_SERVERS, ...getTURNServers()],
    };
};

module.exports = {
    STUN_SERVERS,
    PC_CONFIG,
    getTURNServers,
    getICEServers,
};
