'use strict';

const request = require('supertest');
const express = require('express');

jest.mock('../utils/redisTokenManager', () => ({
  setAccessToken: jest.fn().mockResolvedValue(undefined),
  setRefreshToken: jest.fn().mockResolvedValue(undefined),
  isAccessTokenValid: jest.fn().mockResolvedValue(true),
  hasRefreshToken: jest.fn().mockResolvedValue(true),
  deleteRefreshToken: jest.fn().mockResolvedValue(undefined),
}));
const redisTokenManager = require('../utils/redisTokenManager');

const oauth2PasswordGrantRoutes = require('../routes/oauth2_passwordGrantRoute copy');

const app = express();
app.use('/oauth2/password_grant', oauth2PasswordGrantRoutes);

const tokenPayload = {
  grant_type: 'password',
  username: 'user1',
  password: 'password1',
};

const tokenPayloadUrlEncoded =
  'grant_type=password&username=user1&password=password1';

const refreshPayloadUrlEncoded = (refreshToken) =>
  `grant_type=refresh_token&refresh_token=${refreshToken}`;

function refreshPayload(refreshToken) {
  return { grant_type: 'refresh_token', refresh_token: refreshToken };
}

describe('OAuth2 Password Grant – Multi Content-Type Support', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisTokenManager.hasRefreshToken.mockResolvedValue(true);
  });

  describe('Regression – existing content types', () => {
    it('POST /token with application/x-www-form-urlencoded returns 200 and tokens', async () => {
      const res = await request(app)
        .post('/oauth2/password_grant/token')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(tokenPayloadUrlEncoded);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('token_type', 'Bearer');
      expect(res.body).toHaveProperty('refresh_token');
      expect(res.body).toHaveProperty('expires_in', 300);
    });

    it('POST /token with application/json returns 200 and tokens', async () => {
      const res = await request(app)
        .post('/oauth2/password_grant/token')
        .set('Content-Type', 'application/json')
        .send(tokenPayload);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('token_type', 'Bearer');
      expect(res.body).toHaveProperty('refresh_token');
    });
  });

  describe('Token endpoint – all content types', () => {
    const cases = [
      {
        name: 'JSON',
        contentType: 'application/json',
        body: JSON.stringify(tokenPayload),
      },
      {
        name: 'URL Encoded',
        contentType: 'application/x-www-form-urlencoded',
        body: tokenPayloadUrlEncoded,
      },
      {
        name: 'XML',
        contentType: 'application/xml',
        body: '<request><grant_type>password</grant_type><username>user1</username><password>password1</password></request>',
      },
      {
        name: 'RSS (application/rss+xml)',
        contentType: 'application/rss+xml',
        body: '<request><grant_type>password</grant_type><username>user1</username><password>password1</password></request>',
      },
      {
        name: 'CSV',
        contentType: 'text/csv',
        body: 'grant_type,username,password\npassword,user1,password1',
      },
      {
        name: 'Text (key=value)',
        contentType: 'text/plain',
        body: 'grant_type=password\nusername=user1\npassword=password1',
      },
      {
        name: 'Text (JSON line)',
        contentType: 'text/plain',
        body: '{"grant_type":"password","username":"user1","password":"password1"}',
      },
      {
        name: 'Oracle ADF JSON',
        contentType: 'application/vnd.oracle.adf+json',
        body: JSON.stringify({
          tokenRequest: {
            grant_type: 'password',
            username: 'user1',
            password: 'password1',
          },
        }),
      },
    ];

    cases.forEach(({ name, contentType, body }) => {
      it(`${name} returns 200 and tokens`, async () => {
        const res = await request(app)
          .post('/oauth2/password_grant/token')
          .set('Content-Type', contentType)
          .send(body);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('access_token');
        expect(res.body).toHaveProperty('refresh_token');
      });
    });
  });

  describe('Multipart/form-data and multipart/related', () => {
    it('POST /token with multipart/form-data returns 200 and tokens', async () => {
      const res = await request(app)
        .post('/oauth2/password_grant/token')
        .field('grant_type', 'password')
        .field('username', 'user1')
        .field('password', 'password1');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('refresh_token');
    });
  });

  describe('Refresh token – content types', () => {
    it('POST /refresh_token with application/json returns 200 and new tokens', async () => {
      const tokenRes = await request(app)
        .post('/oauth2/password_grant/token')
        .set('Content-Type', 'application/json')
        .send(tokenPayload);

      const refreshToken = tokenRes.body.refresh_token;
      const res = await request(app)
        .post('/oauth2/password_grant/refresh_token')
        .set('Content-Type', 'application/json')
        .send(refreshPayload(refreshToken));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('refresh_token');
    });

    it('POST /refresh_token with application/x-www-form-urlencoded returns 200', async () => {
      const tokenRes = await request(app)
        .post('/oauth2/password_grant/token')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(tokenPayloadUrlEncoded);

      const refreshToken = tokenRes.body.refresh_token;
      const res = await request(app)
        .post('/oauth2/password_grant/refresh_token')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(refreshPayloadUrlEncoded(refreshToken));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('access_token');
    });

    it('POST /refresh_token with application/xml returns 200', async () => {
      const tokenRes = await request(app)
        .post('/oauth2/password_grant/token')
        .set('Content-Type', 'application/json')
        .send(tokenPayload);

      const refreshToken = tokenRes.body.refresh_token;
      const xmlBody = `<request><grant_type>refresh_token</grant_type><refresh_token>${refreshToken}</refresh_token></request>`;
      const res = await request(app)
        .post('/oauth2/password_grant/refresh_token')
        .set('Content-Type', 'application/xml')
        .send(xmlBody);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('access_token');
    });
  });

  describe('Error cases', () => {
    it('malformed JSON returns 400', async () => {
      const res = await request(app)
        .post('/oauth2/password_grant/token')
        .set('Content-Type', 'application/json')
        .send('{ invalid json');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'invalid_request');
    });

    it('invalid grant_type returns 400', async () => {
      const res = await request(app)
        .post('/oauth2/password_grant/token')
        .set('Content-Type', 'application/json')
        .send({ grant_type: 'client_credentials', username: 'user1', password: 'password1' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'unsupported_grant_type');
    });

    it('invalid credentials return 400', async () => {
      const res = await request(app)
        .post('/oauth2/password_grant/token')
        .set('Content-Type', 'application/json')
        .send({ grant_type: 'password', username: 'bad', password: 'bad' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'invalid_grant');
    });
  });
});
