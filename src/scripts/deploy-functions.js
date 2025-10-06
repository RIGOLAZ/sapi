import { exec } from 'child_process';
import { promisify } from 'util';
import { config } from 'dotenv';

// Charger les variables d'environnement
config();

const execAsync = promisify(exec);

async function deployFunctions() {
    const piAppId = process.env.VITE_PI_APP_ID;
    const piAppSecret = process.env.VITE_PI_APP_SECRET;

    if (!piAppId || !piAppSecret) {
        console.error('❌ Variables PI_APP_ID ou PI_APP_SECRET manquantes dans .env');
        process.exit(1);
    }

    try {
        console.log('🚀 Déploiement des fonctions Firebase...');
        
        // Définir les configurations SECRÈTEMENT
        await execAsync(`firebase functions:config:set pi.app_id="${piAppId}" pi.app_secret="${piAppSecret}"`);
        
        // Déployer les fonctions
        await execAsync('firebase deploy --only functions');
        
        console.log('✅ Functions deployed successfully with Pi Network config');
    } catch (error) {
        console.error('❌ Erreur déploiement:', error);
        process.exit(1);
    }
}

// Exécuter le déploiement
deployFunctions();