// import { PrismaClient } from "@prisma/geneated/prisma";
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";


const url = new URL(process.env.DATABASE_URL!);

const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port) || 3306,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
});


const prisma = new PrismaClient({
  adapter,
});

export async function connectDb() {
  try {
    await prisma.$connect();
    console.log("Connected to MySQL");
  } catch (error) {
    console.error("Error connecting to DB", error);
    process.exit(1);
  }
}

export default prisma;
