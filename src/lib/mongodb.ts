import { MongoClient } from 'mongodb';

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient> | undefined;

/**
 * Connessione lazy: l'assenza di MONGODB_URI deve fallire alla prima query,
 * non all'import del modulo, altrimenti `next build` non riesce nemmeno a
 * raccogliere i dati delle route quando le env var non sono disponibili.
 */
export function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    return Promise.reject(new Error('Please define MONGODB_URI in .env.local'));
  }

  if (process.env.NODE_ENV === 'development') {
    // In dev, reuse the connection across hot reloads
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(uri).connect();
    }
    return global._mongoClientPromise;
  }

  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect();
  }

  return clientPromise;
}
