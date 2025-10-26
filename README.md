# Controle de Gastos App (Mobile & Web)

Este repositório contém o código-fonte para a aplicação "Controle de Gastos", que inclui um backend Node.js/Express, um banco de dados MySQL e um frontend React Native (Expo) projetado para rodar tanto em dispositivos móveis (Android/iOS) quanto na web.

## Visão Geral da Arquitetura

* **Frontend:** Construído com React Native e Expo, permitindo compilação para Android, iOS e Web (`react-native-web`). Hospedado na [Vercel](https://vercel.com/).
* **Backend:** API RESTful desenvolvida em Node.js com Express, responsável pela lógica de negócios e comunicação com o banco de dados. Hospedado em uma instância [AWS EC2](https://aws.amazon.com/ec2/).
* **Banco de Dados:** MySQL hospedado no [AWS RDS](https://aws.amazon.com/rds/) para armazenamento persistente dos dados.
* **Segurança:** O backend na EC2 utiliza Nginx como proxy reverso e um certificado SSL/TLS gratuito do [Let's Encrypt](https://letsencrypt.org/) (gerenciado via Certbot) para garantir comunicação segura via HTTPS.

## Configuração e Deploy

O processo para colocar a aplicação completamente funcional envolveu as seguintes etapas:

### 1. Configuração do Ambiente AWS

* **Banco de Dados (RDS):**
    * Uma instância MySQL foi criada no AWS RDS.
    * As credenciais de acesso (Host, Usuário, Senha, Nome do Banco, Porta) foram configuradas no arquivo `.env` do backend.
* **Servidor Backend (EC2):**
    * Uma instância EC2 (Ubuntu) foi provisionada.
    * O código do backend (pasta `backend/`) foi transferido para a instância.
    * Node.js e npm foram instalados na instância.
    * As dependências do backend foram instaladas (`npm install` dentro da pasta `backend`).
    * O backend foi iniciado (provavelmente usando um gerenciador de processos como PM2, embora não detalhado aqui).
    * O Security Group da instância foi configurado inicialmente para permitir acesso à porta da aplicação Node.js (ex: 3001).

### 2. Adaptação do Frontend para Web

* O projeto Expo já incluía `react-native-web`, permitindo a execução no navegador via `npm run web`.
* Foram necessários ajustes no arquivo `frontend/App.js` para melhorar a responsividade e corrigir problemas de layout na web:
    * Garantia de que o container principal ocupasse toda a altura (`flex: 1` e `height: '100%'` para web via `Platform.select`).
    * Ajuste no `fontSize` do `tabBarLabelStyle` para evitar que os textos fossem cortados em telas menores.

### 3. Configuração de Domínio e HTTPS para o Backend

* **Problema:** Ao tentar acessar o backend (HTTP) a partir do frontend na Vercel (HTTPS), o navegador bloqueava as requisições devido à política de "Mixed Content".
* **Solução:** Habilitar HTTPS no backend EC2.
    * **Registro de Domínio:** Como Let's Encrypt não emite certificados para domínios `amazonaws.com`, um nome de host gratuito foi registrado no [No-IP](https://www.noip.com) (`app-gastos.ddns.net`) e configurado para apontar para o IP público da instância EC2 (`100.26.141.230`).
    * **Instalação do Nginx:** O servidor web Nginx foi instalado na instância EC2 (`sudo apt install nginx`).
    * **Configuração do Firewall (AWS):** As portas 80 (HTTP) e 443 (HTTPS) foram abertas no Security Group da instância EC2.
    * **Configuração do Nginx:** Um arquivo de configuração foi criado em `/etc/nginx/sites-available/gastos-app` para:
        * Ouvir requisições para `app-gastos.ddns.net`.
        * Atuar como proxy reverso, encaminhando as requisições para a aplicação Node.js rodando em `http://localhost:3001`.
    * **Instalação do Certbot:** A ferramenta Certbot e seu plugin para Nginx foram instalados (`sudo apt install certbot python3-certbot-nginx`).
    * **Obtenção do Certificado:** O Certbot foi executado (`sudo certbot --nginx -d app-gastos.ddns.net`), obtendo um certificado SSL/TLS do Let's Encrypt e configurando automaticamente o Nginx para usar HTTPS e redirecionar todo o tráfego HTTP para HTTPS.

### 4. Deploy do Frontend na Vercel

* O código atualizado do frontend (incluindo as correções de layout e a nova `API_URL`) foi enviado para o repositório GitHub (`https://github.com/pvrezende/controle-de-gastos-app`).
* Um novo projeto foi criado na Vercel, importando o repositório do GitHub.
* **Configurações de Build na Vercel:**
    * **Root Directory:** `frontend`
    * **Framework Preset:** `Other`
    * **Build Command:** `npx expo export --platform web`
    * **Output Directory:** `dist`
    * **Install Command:** `npm install`
    * **Environment Variables:** Nenhuma foi necessária para o frontend.
* Após o deploy, a aplicação web ficou acessível em `https://controle-de-gastos-app.vercel.app/`.

### 5. (Opcional) Geração do APK Android

* O projeto está configurado para gerar um `.apk` usando EAS Build.
* **Comandos:**
    ```bash
    # Instalar EAS CLI (se não tiver)
    npm install -g eas-cli
    # Login na conta Expo
    eas login
    # Navegar para a pasta frontend
    cd frontend
    # Iniciar o build
    eas build --platform android --profile production
    ```
* O `.apk` pode ser baixado do link fornecido pelo EAS Build após a conclusão.

## Como Rodar Localmente

### Backend

1.  Navegue até a pasta `backend`.
2.  Crie um arquivo `.env` baseado no exemplo ou nos dados do seu RDS/configurações.
3.  Instale as dependências: `npm install`.
4.  Inicie o servidor: `node server.js` (ou use `nodemon` para desenvolvimento).

### Frontend (Mobile/Web)

1.  Navegue até a pasta `frontend`.
2.  Instale as dependências: `npm install`.
3.  **Para rodar no Emulador/Dispositivo:**
    * Android: `npm run android` ou `expo run:android`
    * iOS: `npm run ios` ou `expo run:ios`
4.  **Para rodar na Web:** `npm run web` ou `expo start --web`. O app abrirá no seu navegador padrão.

---