// generate-hash.js
const bcrypt = require('bcrypt');

const passwords = {
  'SuperAdmin@123': 'superadmin@payflow.com',
  'Admin@123': 'admin@payflow.com',
  'Agent@123': 'agent@payflow.com'
};

async function generateHashes() {
  console.log('🔐 Password Hashes:\n');
  console.log('Copy these into your SQL INSERT statements:\n');
  console.log('-' .repeat(60));
  
  for (const [password, email] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(password, 10);
    console.log(`\n-- ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Hash: ${hash}`);
  }
  
  console.log('\n' + '-'.repeat(60));
}

generateHashes();