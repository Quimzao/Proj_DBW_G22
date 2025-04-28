function showIntro(req, res) {
    res.render('game-intro');
};

function showLobby(req, res) {
    // Se vier com código, usa ele, senão gera um novo
    const roomCode = req.query.code || generateRoomCode();
    
    res.render('lobby', {
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