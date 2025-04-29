function showIntro(req, res) {
    const username = req.user?.username || 'Guest';
    const memberSince = req.user?.memberSince || 'N/A';

    res.render('game-intro', {
        username: username,
        memberSince: memberSince
    });
}

function showLobby(req, res) {
    if (!req.user) {
        return res.redirect('/login');
    }

    const user = {
        _id: req.user._id,
        username: req.user.username,
        profilePicture: req.user.profilePicture || '/images/default-avatar.png',
        createdAt: req.user.createdAt || new Date()
    };

    const roomCode = req.query.code || generateRoomCode();
    const roomName = "Creative Room";

    // Configurações padrão do jogo
    const defaultSettings = {
        difficulty: 'medium', // medium é o padrão
        ideaTime: 10, // tempo padrão para nível médio
        rounds: 5, // número padrão de rodadas
        private: true // sala privada por padrão
    };

    res.render('lobby', {
        user: user,
        roomCode: roomCode,
        roomName: roomName,
        settings: defaultSettings
    });
}

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Função para atualizar as configurações do jogo
function updateGameSettings(roomCode, newSettings) {
    if (!global.rooms) {
        global.rooms = {};
    }
    
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
    
    // Atualiza as configurações baseadas na dificuldade
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
                if (newSettings.ideaTime) {
                    room.settings.ideaTime = newSettings.ideaTime;
                }
                break;
        }
    }
    
    // Atualiza outras configurações se fornecidas
    if (newSettings.rounds) room.settings.rounds = newSettings.rounds;
    if (newSettings.private !== undefined) room.settings.private = newSettings.private;
    
    return room.settings;
}

export { showIntro, showLobby, updateGameSettings };