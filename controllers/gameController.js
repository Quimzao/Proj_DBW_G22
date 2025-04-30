function showGame(req, res) {
    const prompt = "What is your most creative idea for a new app?";
    const user = req.user || { username: "Guest", profilePicture: "/images/default-avatar.png", createdAt: new Date() };
    res.render('game', { prompt, user });
}

export { showGame };