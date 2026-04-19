const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const privateKey = fs.readFileSync(path.join(__dirname, 'AuthKey_25R6ZH5MMF.p8')); // Your .p8 file
const teamId = 'W4GNBUD8T8';      // From Apple Developer Membership
const keyId = '25R6ZH5MMF';        // From Step 3
const clientId = 'com.turtlecreekllc.dinnerplans.auth'; // Your Services ID

const token = jwt.sign({}, privateKey, {
  algorithm: 'ES256',
  expiresIn: '180d',
  audience: 'https://appleid.apple.com',
  issuer: teamId,
  subject: clientId,
  keyid: keyId,
});

console.log(token);