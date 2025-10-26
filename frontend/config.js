// frontend/config.js

// Novo domínio configurado com HTTPS via Nginx e Certbot
const API_DOMAIN = 'app-gastos.ddns.net';
// Use a variável API_DOMAIN para construir a URL completa com https://
export const API_URL = `https://${API_DOMAIN}`;


// Use o DNS Público ou o IP Público da sua instância EC2
// O DNS é geralmente preferível pois o IP público pode mudar se a instância for parada/iniciada.
//const API_IP = 'ec2-100-26-141-230.compute-1.amazonaws.com';
//export const API_URL = `//http://${API_IP}:3001`;
// IPs antigos comentados (para referência)
//const API_URL = 'http://199.192.191.139:3000';//delta
//const API_URL = 'http://192.168.1.85:3000';//casa
//const API_URL = 'http://10.60.104.105:3000';//indt
//const API_URL = 'http://10.176.56.192:3000';//celular