import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
    try {
        //Get the jwt token from the cookie
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({ message: "Unauthorized - No Token Provided" });
        }
        const decodedToken = jwt.verify(token, process.env.JWT_KEY); //{userId : user._id}
        if (!decodedToken) {
            return res.status(401).json({ message: "Unauthorized - Invalid Token" });
        }
        // Instead of req.body.userId, use req.user
        req.user = { id: decodedToken.userId };
        next();

    } catch (error) {
        console.log("Error in protectedRoute authMiddleware.");
        res.status(401).json({
            message: error.message,
            success: false
        });
    }
};