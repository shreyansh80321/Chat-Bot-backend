import express from 'express'
import dotenv from 'dotenv'
import { connectDb } from './config/prisma.js';
dotenv.config();
const app = express();
const PORT = process.env.PORT||5000;

app.use(express.json());
connectDb();
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})