function showGame(req, res) {
    const prompt = "What is your most creative idea for a new app?";
    res.render('game', { prompt });
}

export { showGame };