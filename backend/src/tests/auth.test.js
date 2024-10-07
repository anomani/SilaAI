const request = require('supertest');
const app = require('../app');
const dotenv = require('dotenv');
dotenv.config({ path: '../env' });

describe('Authentication', () => {
  let testUser;

  test('User Registration', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({
        username: 'testuser',
        password: 'testpassword',
        email: 'test@example.com',
        phoneNumber: '1234567890'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    testUser = res.body;
  });

  test('User Login', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({
        phoneNumber: '1234567890',
        password: 'testpassword'
      });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
  });

  test('Invalid Login', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({
        phoneNumber: '1234567890',
        password: 'wrongpassword'
      });
    expect(res.statusCode).toBe(401);
  });

  // This test assumes you have a protected route. If not, you'll need to create one.
  test('Protected Route Access', async () => {
    // First, login to get a token
    const loginRes = await request(app)
      .post('/api/users/login')
      .send({
        phoneNumber: '1234567890',
        password: 'testpassword'
      });
    const token = loginRes.body.token;

    // Now try to access a protected route
    const res = await request(app)
      .get('/api/protected-route')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
  });

  test('Protected Route Access without Token', async () => {
    const res = await request(app)
      .get('/api/protected-route');
    expect(res.statusCode).toBe(401);
  });
});