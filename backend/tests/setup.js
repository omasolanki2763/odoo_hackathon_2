/**
 * Shared MongoDB test harness.
 *
 * Starts one in-memory mongod per test file, connects Mongoose to it, and
 * shuts both down afterwards, so model tests never touch a real database and
 * leave no state behind between runs.
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

/** @type {import('mongodb-memory-server').MongoMemoryServer | null} */
let mongoServer = null;

/**
 * Start an in-memory server and connect Mongoose to it.
 * The first run downloads a mongod binary, which can take a minute.
 */
async function connect() {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}

/**
 * Drop the database, close the connection and stop the server.
 * Each step is guarded so a failure earlier in the run still cleans up.
 */
async function disconnect() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}

module.exports = { connect, disconnect };
