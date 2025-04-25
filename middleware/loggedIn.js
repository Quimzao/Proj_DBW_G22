const userLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        // Se não está autenticado, vai para o login!
        console.log("Nop, não tem acesso!");
        return res.redirect("/login");
    }
    next();
};

export default userLoggedIn;