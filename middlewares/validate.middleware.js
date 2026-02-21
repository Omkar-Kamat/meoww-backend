import AppError from "../utils/appError.js";

export const validate = (schema, source = "body") => (req, res, next) => {
    try {
        const data = source === "body" ? req.body : source === "query" ? req.query : req.params;
        const validatedData = schema.parse(data);
        
        if (source === "body") req.body = validatedData;
        else if (source === "query") req.query = validatedData;
        else req.params = validatedData;
        
        next();
    } catch (err) {
        next(new AppError(err.errors?.[0]?.message || "Invalid input", 400));
    }
};
