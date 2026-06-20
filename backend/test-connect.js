import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;

console.log('Testing MongoDB connection...');
// Hide password in logs
const maskedUri = uri.replace(/:[^:@]+@/, ':****@');
console.log('URI:', maskedUri);

// Disable SSL verification globally
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Modern connection - no deprecated options
const client = new MongoClient(uri, {
  tls: true,
  tlsAllowInvalidCertificates: true,
  tlsAllowInvalidHostnames: true,
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
});

async function testConnection() {
  try {
    console.log('Connecting...');
    await client.connect();
    console.log(' Connected successfully!');
    
    const db = client.db('ghostnote');
    const result = await db.command({ ping: 1 });
    console.log(' Ping result:', result);
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log(' Collections:', collections.map(c => c.name));
    
    await client.close();
    console.log('Connection closed.');
  } catch (error) {
    console.error(' Connection failed:', error.message);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
  }
}

testConnection();