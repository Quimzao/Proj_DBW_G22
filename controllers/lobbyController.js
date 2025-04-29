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

    res.render('lobby', {
        user: user,
        roomCode: roomCode,
        roomName: roomName
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

export { showIntro, showLobby };