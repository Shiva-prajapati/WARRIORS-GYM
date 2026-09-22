const fs = require('fs');
const path = require('path');
const readline = require('readline');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const port = Number(process.env.PORT || 4000);
const setupToken = process.env.OWNER_SETUP_TOKEN;
const setupUrl = `http://localhost:${port}/api/auth/setup-owner`;

function ask(question) {
  return new Promise((resolve) => {
    const input = readline.createInterface({ input: process.stdin, output: process.stdout });
    input.question(question, (answer) => {
      input.close();
      resolve(answer.trim());
    });
  });
}

function askHidden(question) {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    let value = '';
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const cleanup = () => {
      stdin.removeListener('data', onData);
      stdin.setRawMode(wasRaw || false);
      stdin.pause();
    };
    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === '\u0003') {
          cleanup();
          process.stdout.write('\n');
          reject(new Error('Setup cancelled'));
          return;
        }
        if (character === '\r' || character === '\n') {
          cleanup();
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (character === '\u0008' || character === '\u007f') {
          if (value.length) {
            value = value.slice(0, -1);
            process.stdout.write('\b \b');
          }
          continue;
        }
        if (character >= ' ') {
          value += character;
          process.stdout.write('*');
        }
      }
    };
    stdin.on('data', onData);
  });
}

async function main() {
  if (!fs.existsSync(path.join(__dirname, '..', '.env'))) {
    throw new Error('server/.env was not found. Create it before running owner setup.');
  }
  if (!setupToken) throw new Error('OWNER_SETUP_TOKEN is missing from server/.env.');

  const name = await ask('Owner name: ');
  const phone = await ask('Owner phone number (10 digits): ');
  const password = await askHidden('Owner password: ');
  const confirmation = await askHidden('Confirm owner password: ');

  if (!name) throw new Error('Owner name is required.');
  if (!/^[6-9][0-9]{9}$/.test(phone)) throw new Error('Enter a valid 10-digit Indian mobile number.');
  if (password.length < 8) throw new Error('Password must be at least 8 characters.');
  if (password !== confirmation) throw new Error('Passwords do not match.');

  let response;
  try {
    response = await fetch(setupUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Owner-Setup-Token': setupToken,
      },
      body: JSON.stringify({ name, phone, password }),
    });
  } catch {
    throw new Error('Could not reach the server. Start the backend with npm run dev in another terminal.');
  }

  let result = {};
  try {
    result = await response.json();
  } catch {
    result = {};
  }

  if (response.status === 409) throw new Error('An owner account already exists. No new owner was created.');
  if (response.status === 403) throw new Error('Owner setup authorization was rejected.');
  if (response.status === 404) throw new Error('Owner setup is unavailable. Check OWNER_SETUP_TOKEN and the running backend.');
  if (!response.ok) throw new Error(result.message || 'Owner setup failed.');

  console.log('Owner account created successfully.');
  console.log('You can now login using the owner phone number and the password you entered.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
