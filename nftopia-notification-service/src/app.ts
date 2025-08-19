import express from "express";
// import routes from "./routes";
import config from "./config/env";
// import emailRoutes from "./routes/email.routes";
// import smsRoutes from "./routes/sms.routes";
import { database } from "./config/database";
// import { EmailWebhooksController } from "./controllers/email-webhooks.controller";
import { engine } from "express-handlebars";
// import { router } from "./routes/fcm.routes";
import htmlToText from "html-to-text";
import path from "path";

import { Notification } from "./models/Notification";
import helmet from 'helmet';
import morgan from 'morgan';
import notificationRoutes from './routes/notification.routes';
import { errorHandler } from './middlewares/error.middleware';
import { actorMiddleware } from './middlewares/audit.middleware';
import { openapiJson } from './openapi/openapi.json';









const app = express();
// const emailWebhooksController = new EmailWebhooksController();

// Initialize database connection on startup
async function initializeDatabase() {
  try {
    await database.connect();
    console.log("Database connection established");

    // Setup graceful shutdown
    process.on("SIGINT", gracefulShutdown);
    process.on("SIGTERM", gracefulShutdown);
  } catch (error) {
    console.error("Failed to connect to database:", error);
    process.exit(1);
  }
}

// Graceful shutdown handler
async function gracefulShutdown() {
  console.log("Shutting down gracefully...");
  try {
    await database.disconnect();
    console.log("Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
}

// Middleware
app.use(express.json());




app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));
app.use(actorMiddleware);


app.get('/openapi.json', openapiJson);
app.use('/api/notifications', notificationRoutes);


app.use(errorHandler);

// Health check endpoint
app.get("/health", async (req, res) => {
  const dbStatus = database.getConnection() ? "connected" : "disconnected";

  res.status(dbStatus === "connected" ? 200 : 503).json({
    status: dbStatus,
    timestamp: new Date().toISOString(),
    service: "notification-service",
    database: dbStatus,
  });
});

/// Just to launch MongoDB Start
app.get("/test-mongo", async (req, res) => {

  const notif = new Notification({
    "userId": 1,
    "type": "mint",
    "content": "Your NFT has been minted!",
    "channels": ["email", "in-app"],
  });
  
    let soughtUser = await Notification.find({userId: 1});
    if(soughtUser) {
      console.log("Notification already logged!");
      res.json({"message": "Notification already logged!"});
    } else {
      let result = await notif.save();
      console.log(result);
      res.json({"message": "Notification has been logged!"});
    }  
});

// Routes
// app.use("/api", routes);
// app.use("/api/v1/email", emailRoutes);
// app.use("/api/v1/sms", smsRoutes);
// app.post("/webhooks/email", emailWebhooksController.handleEvent);
// app.use("/api/v1/fcm", router);

// Configure Handlebars
app.engine(
  "hbs",
  engine({
    extname: ".hbs",
    partialsDir: path.join(__dirname, "templates/partials"),
  })
);

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "templates"));

// Register template engine
// app.engine(".hbs", hbs.engine);
// app.set("view engine", ".hbs");
app.set("views", path.join(__dirname, "templates/emails"));

// Initialize database when starting the app
initializeDatabase().catch((err) => {
  console.error("Application startup failed:", err);
  process.exit(1);
});

export default app;
