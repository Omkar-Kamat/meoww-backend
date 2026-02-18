export const validate = (schema) => (req, res, next) => {
    try {
        const validatedData = schema.parse(req.body);
        req.body = validatedData;
        next();
    } catch (err) {
        next(new AppError(err.errors?.[0]?.message || "Invalid input", 400));
    }
};
