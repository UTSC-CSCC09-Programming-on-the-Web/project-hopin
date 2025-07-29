const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    // Allow requests from frontend URI
    if (origin === process.env.CLIENT_URI) return callback(null, true);

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

export default corsOptions;
