import mongoose, { ConnectOptions } from 'mongoose';

const retryOptions = {
  maxRetries: 5,
  initialDelay: 1000,
  maxDelay: 10000,
};

export const connectWithRetry = async (
  uri: string,
  options: {
    retryAttempts?: number;
    retryDelay?: number;
  } & ConnectOptions = {}
) => {

  const { retryAttempts = 5, retryDelay = 5000, ...connectOptions } = options;

  let attempts = 1;

  const connect = async () => {
    try {
      console.log(`\n Attempt ${attempts } to connect to MongoDB \n`);
      await mongoose.connect(uri, options);
    } catch (error: any) {
      const errorType = error.name || '';

      if (errorType === 'MongooseServerSelectionError' && attempts < retryOptions.maxRetries) {
        const delay = Math.min(
          retryOptions.initialDelay * Math.pow(2, attempts),
          retryOptions.maxDelay
        );
        console.warn(
          `MongoDB connection failed (${errorType}). Retrying in ${delay}ms... [Attempt ${attempts + 1}/${retryOptions.maxRetries}]`
        );
        attempts++;
        await new Promise((res) => setTimeout(res, delay));
        return connect();
      } else {
        console.error(`MongoDB connection failed permanently after ${attempts} retries:`, error);
        process.exit(1);
      }
    }
  };

  mongoose.connection.on('connected', () => {
    console.log('MongoDB connection event: connected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection event: error', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB connection event: disconnected');
  });

  await connect();
};

class Database {
  private static instance: Database;
  private readonly uri: string;
  private readonly options: mongoose.ConnectOptions;
  private isConnected: boolean = false;

  private constructor() {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not defined');
    }

    this.uri = process.env.MONGO_URI;
    this.options = {
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 30000,
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
    };
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('MongoDB already connected');
      return;
    }

    try {
      await mongoose.connect(this.uri, this.options);
      this.isConnected = true;
      console.log('MongoDB connected successfully');

      mongoose.connection.on('connected', () => {
        console.log('MongoDB connection re-established');
        this.isConnected = true;
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('error', (error) => {
        console.error('MongoDB connection error:', error);
      });

    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      console.log('MongoDB already disconnected');
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('MongoDB disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public getConnection(): mongoose.Connection {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }
    return mongoose.connection;
  }

  public setupGracefulShutdown(): void {
    process.on('SIGINT', async () => {
      console.log('SIGINT received - closing MongoDB connection');
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('SIGTERM received - closing MongoDB connection');
      await this.disconnect();
      process.exit(0);
    });
  }
}

export const database = Database.getInstance();
 
