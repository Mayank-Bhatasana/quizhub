import express from "express";
import cors from "cors";
import * as fs from "fs";
import path from "path";

const app = express();

app.use(cors());
app.use(express.json());

const filePath = path.join(process.cwd(), "src", "files", "read.txt");
const data = fs.readFileSync(filePath, "utf8");
console.log(data);

app.get("/", (req, res) => {
  res.json({
    message: "Backend working!",
  });
});

app.post("/sendForm", (req, res) => {
  console.log(req.body);
  res.json({
    success: true,
  });
});

app.get("/getGreet", (req, res) => {
  res.json({
    message: "Hello, How are you?",
  });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
