import { errorMiddleware } from "./../../../packages/error-handler/error-middleware";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:4200",
      "http://localhost:3000",
      "http://localhost:8080",
      "http://localhost:5173",
      "http://localhost:3001",
    ],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.get("/", (req, res) => {
  res.send({ message: "Hello API" });
});

app.use(errorMiddleware);

const port = process.env.PORT || 6001;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});
server.on("error", (error) => {
  console.log("Error: ", error);
});
