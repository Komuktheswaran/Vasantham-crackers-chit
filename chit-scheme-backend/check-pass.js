const bcrypt = require('bcryptjs');
const hash = '$2b$10$wqPwaYQMUJ5DfZMcSSx4t.070cRIUlJugmbqJvhb/mVjwslpUwZru';

['admin123', 'Admin123', 'ADMIN123', 'ADMIN@123'].forEach(guess => {
    console.log(guess.padEnd(20), bcrypt.compareSync(guess, hash));
});