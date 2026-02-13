import mongoose from "mongoose"

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  )
}

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  // eslint-disable-next-line no-var
  var globalMongoose: MongooseCache | undefined
}

const cached: MongooseCache = global.globalMongoose || { conn: null, promise: null }

if (!global.globalMongoose) {
  global.globalMongoose = cached
}

async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    }

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((m) => {
      return m
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    const message = e instanceof Error ? e.message : String(e)
    if (message.includes("MongooseServerSelectionError") || message.includes("Could not connect")) {
      throw new Error(
        "Could not connect to MongoDB Atlas. Please ensure your cluster's Network Access allows connections from all IPs (0.0.0.0/0) and that your MONGODB_URI is correct."
      )
    }
    throw e
  }

  return cached.conn
}

export default dbConnect
