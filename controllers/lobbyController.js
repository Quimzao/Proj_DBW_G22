// Renders the game introduction page with basic user info
function showIntro(req, res) {
    const username = req.user?.username || 'Guest';
    const memberSince = req.user?.memberSince || 'N/A';

    res.render('game-intro', {
        username: username,
        memberSince: memberSince
    });
}

// Renders the lobby page for the user, with default game settings and a room code
function showLobby(req, res) {
    // Redirect to login if the user is not authenticated
    if (!req.user) {
        return res.redirect('/login');
    }

    // Prepare user info for the view
    const user = {
        _id: req.user._id,
        username: req.user.username,
        profilePicture: req.user.profilePicture || '/images/default-avatar.png',
        createdAt: req.user.createdAt || new Date()
    };

    // Get the room code from the query or generate a new one
    const roomCode = req.query.code || generateRoomCode();
    const roomName = "Creative Room";

    // Default game settings
    const defaultSettings = {
        difficulty: 'medium',
        ideaTime: 10,
        rounds: 5,
        private: true
    };

    // Render the lobby view with user, room, and settings info
    res.render('lobby', {
        user: user,
        roomCode: roomCode,
        roomName: roomName,
        settings: defaultSettings
    });
}

// Generates a random 6-character room code
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Updates the game settings for a specific room
function updateGameSettings(roomCode, newSettings) {
    // Initialize the global rooms object if it doesn't exist
    if (!global.rooms) {
        global.rooms = {};
    }
    
    // Create the room if it doesn't exist yet, with default settings
    if (!global.rooms[roomCode]) {
        global.rooms[roomCode] = {
            settings: {
                difficulty: 'medium',
                ideaTime: 10,
                rounds: 5,
                private: true
            },
            players: []
        };
    }
    
    const room = global.rooms[roomCode];
    
    // Update settings based on the selected difficulty
    if (newSettings.difficulty) {
        room.settings.difficulty = newSettings.difficulty;
        
        switch(newSettings.difficulty) {
            case 'easy':
                room.settings.ideaTime = 12;
                break;
            case 'medium':
                room.settings.ideaTime = 10;
                break;
            case 'hard':
                room.settings.ideaTime = 8;
                break;
            case 'custom':
                // For custom, use the provided ideaTime if available
                if (newSettings.ideaTime) {
                    room.settings.ideaTime = newSettings.ideaTime;
                }
                break;
        }
    }
    
    // Update other settings if provided
    if (newSettings.rounds) room.settings.rounds = newSettings.rounds;
    if (newSettings.private !== undefined) room.settings.private = newSettings.private;
    
    // Return the updated settings
    return room.settings;
}

export { showIntro, showLobby, updateGameSettings };