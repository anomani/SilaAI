const { generateToken, verifyToken } = require('../utils/jwtUtils');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config({ path: '../env' });
describe('JWT Utilities', () => {
  const mockUser = { id: 1, username: 'testuser' };

  test('generateToken creates a valid JWT', () => {
    const token = generateToken(mockUser);
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    
    const decoded = jwt.decode(token);
    expect(decoded).toHaveProperty('id', mockUser.id);
    expect(decoded).toHaveProperty('username', mockUser.username);
    expect(decoded).toHaveProperty('iat');
    expect(decoded).toHaveProperty('exp');
  });

  test('verifyToken successfully verifies a valid token', () => {
    const token = generateToken(mockUser);
    const verified = verifyToken(token);
    expect(verified).toHaveProperty('id', mockUser.id);
    expect(verified).toHaveProperty('username', mockUser.username);
  });

  test('verifyToken throws an error for an invalid token', () => {
    const invalidToken = 'invalid.token.here';
    expect(() => verifyToken(invalidToken)).toThrow();
  });

  test('verifyToken throws an error for an expired token', () => {
    const expiredToken = jwt.sign(
      { id: mockUser.id, username: mockUser.username },
      process.env.JWT_SECRET,
      { expiresIn: '0s' }
    );
    
    // Wait a moment to ensure the token is expired
    return new Promise(resolve => setTimeout(resolve, 1000)).then(() => {
      expect(() => verifyToken(expiredToken)).toThrow();
    });
  });

  test('generateToken creates tokens with different jti claims', () => {
    const token1 = generateToken(mockUser);
    const token2 = generateToken(mockUser);
    
    const decoded1 = jwt.decode(token1);
    const decoded2 = jwt.decode(token2);
    
    expect(decoded1.jti).not.toBe(decoded2.jti);
  });
});