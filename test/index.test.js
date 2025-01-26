const request = require('supertest');
const mongoose = require('mongoose');
const assert = require('assert');
const app = require('../index'); // Adjust the path to your app

describe('Application Tests', () => {
    it('hello world!', () => {
        assert.strictEqual(1 + 1, 2);
    });

    describe('GET /api/users/:_id/logs', () => {
        let userId;

        before(async () => {
            try {
                // Connect to the database
                await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
                console.log('Database connected successfully');

                // Create a test user
                const userResponse = await request(app)
                    .post('/api/users')
                    .send({ username: 'testuser' });
                userId = userResponse.body._id;
                console.log('Test user created:', userId);

                // Create test exercises
                await request(app)
                    .post(`/api/users/${userId}/exercises`)
                    .send({ description: 'test exercise 1', duration: 30, date: '2023-01-01' });
                await request(app)
                    .post(`/api/users/${userId}/exercises`)
                    .send({ description: 'test exercise 2', duration: 45, date: '2023-01-02' });
                console.log('Test exercises created');
            } catch (error) {
                console.error('Error in before hook:', error);
                throw error;
            }
        });

        after(async () => {
            try {
                // Clean up the database
                await mongoose.connection.db.dropDatabase();
                await mongoose.disconnect();
                console.log('Database cleaned up and disconnected');
            } catch (error) {
                console.error('Error in after hook:', error);
                throw error;
            }
        });

        it('should fetch exercise logs for a user', async () => {
            const response = await request(app)
                .get(`/api/users/${userId}/logs`);

            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.body._id, userId);
            assert.strictEqual(response.body.username, 'testuser');
            assert.strictEqual(response.body.count, 2);
            assert.strictEqual(response.body.log.length, 2);
            assert.strictEqual(response.body.log[0].description, 'test exercise 1');
            assert.strictEqual(response.body.log[1].description, 'test exercise 2');
        });

        it('should fetch exercise logs with date range and limit', async () => {
            const response = await request(app)
                .get(`/api/users/${userId}/logs`)
                .query({ from: '2023-01-01', to: '2023-01-02', limit: 1 });

            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.body._id, userId);
            assert.strictEqual(response.body.username, 'testuser');
            assert.strictEqual(response.body.count, 1);
            assert.strictEqual(response.body.log.length, 1);
            assert.strictEqual(response.body.log[0].description, 'test exercise 1');
        });
    });
});