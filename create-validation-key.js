const fs = require('fs');
const path = require('path');

// Ta clé de validation Pi Network
const validationKey = '6791473fd1dd922d46bb7bae3a2a53acaf135199e6df055380f6ae879a95fded2ba0920d2e9ead7e6f9ee6baff950a9f508b5df8d9aa90aedcc32ff08dc8f870';

// Crée le fichier avec encodage UTF-8
const filePath = path.join(__dirname, 'public', 'validation-key.txt');
fs.writeFileSync(filePath, validationKey, 'utf8');

console.log('✅ Fichier validation-key.txt créé avec succès');
console.log('Contenu:', fs.readFileSync(filePath, 'utf8'));