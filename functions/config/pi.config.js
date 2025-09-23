import axios from 'axios';

// Configuration Pi API
export const PI_CONFIG = {
  apiKey: process.env.PI_API_KEY,
  baseURL: process.env.NODE_ENV === 'production' 
    ? 'https://api.minepi.com' 
    : 'https://api.testnet.minepi.com',
  sandbox: process.env.NODE_ENV !== 'production'
};

// Instance Axios pour Pi API
export const piAxios = axios.create({
  baseURL: PI_CONFIG.baseURL,
  timeout: 30000,
  headers: {
    'Authorization': `Key ${PI_CONFIG.apiKey}`,
    'Content-Type': 'application/json'
  }
});