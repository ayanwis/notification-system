const express = require("express");
const globalErrorController = require("./controller/errorController");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const userRoute = require("./routes/userRoute");
const testRoute = require("./routes/testRoute");
const notificationRoute = require("./routes/notificationRoute");
const chatRoute = require("./routes/chatRoute");
const conversationRoute = require("./routes/conversationRoute");

const app = express();

app.use(express.json());
app.use(cookieParser());

const corsOptions = {
  origin: "*",
  credentials: true, // Allow credentials (cookies)
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
};
app.use(cors(corsOptions));

app.use("/api/v1/users", userRoute);
app.use("/api/v1/tests", testRoute);
app.use("/api/v1/notifications/tests", notificationRoute);
app.use("/api/v1/chat", chatRoute);
app.use("/api/v1/conversations", conversationRoute);

//TEST ROUTE
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Working fine go ahead",
  });
});

app.use(globalErrorController);
module.exports = app;
