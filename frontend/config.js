// frontend/config.js

// Use o DNS Público ou o IP Público da sua instância EC2
// O DNS é geralmente preferível pois o IP público pode mudar se a instância for parada/iniciada.
const API_IP = 'ec2-100-26-141-230.compute-1.amazonaws.com'; // DNS Público da sua EC2
export const API_URL = `http://${API_IP}:3001`; // Porta definida no backend (server.js)

// IPs antigos comentados (para referência)
//const API_URL = 'http://192.168.0.187:3000';//delta
//const API_URL = 'http://192.168.1.85:3000';//casa
//const API_URL = 'http://10.60.104.105:3000';//indt
//const API_URL = 'http://10.176.56.192:3000';//celular