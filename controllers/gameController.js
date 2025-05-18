// Function to render the game page with user info and prompts
function showGame(req, res) {
    // Get the user from the request, or use a default guest user if not logged in
    const user = req.user || { 
        username: "Guest", 
        profilePicture: "/images/default-avatar.png", 
        _id: "guest_" + Math.random().toString(36).substring(2) // Generate a random guest ID
    };
    
    // Render the 'game' view, passing the user and a list of creative prompts
    res.render('game', { 
        user,
        prompts: [
            "Describe the weirdest invention you can imagine",
            "Write the opening line of a bizarre novel",
            "What would aliens think is our weirdest tradition?",
            "Invent a holiday that doesn't exist (but should)",
            "Create the worst possible social media feature"
        ]
    });
}

export { showGame };