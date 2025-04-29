function showIntro(req, res) {
    const username = req.user?.username || 'Guest';
    const memberSince = req.user?.memberSince || 'N/A';

    console.log('Username:', username); // Debugging
    console.log('Member Since:', memberSince); // Debugging

    res.render('game-intro', {
        username: username,
        memberSince: memberSince
    });
}

function showLobby(req, res) {
    // Use the user object from req.user or provide default values
    const user = {
        username: req.user?.username || 'Guest',
        profilePicture: req.user?.profilePicture || '/images/default-avatar.png',
        memberSince: req.user?.memberSince || 'N/A'
    };

    const roomCode = req.query.code || generateRoomCode();

    res.render('lobby', {
        user: user, // Pass the user object to the template
        roomCode: roomCode,
        roomName: "Sala Criativa" // Can be dynamic
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