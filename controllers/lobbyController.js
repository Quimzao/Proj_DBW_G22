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
    // Se vier com código, usa ele, senão gera um novo
    const username = req.user?.username || 'Guest'; // Example: Fetch from session or database
    const memberSince = req.user?.memberSince || 'N/A'; // Example: Fetch from session or database
    const roomCode = req.query.code || generateRoomCode();
    
    res.render('lobby', {
        username: username,
        memberSince: memberSince,
        roomCode: roomCode,
        roomName: "Sala Criativa" // Pode ser dinâmico
    });
};

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export { showIntro, showLobby };