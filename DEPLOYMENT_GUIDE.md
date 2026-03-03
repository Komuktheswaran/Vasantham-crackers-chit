# Deployment Guide 🚀

This guide outlines the step-by-step process of deploying the Vasantham Crackers Fund Management application on a production-ready Ubuntu Server.

## 🖥️ Server Requirements

- **OS:** Ubuntu 22.04 LTS (or higher)
- **CPU:** 2 Core (minimum)
- **RAM:** 4GB+ (Recommended for running Node and MSSQL concurrently, or 2GB if connecting to an external cloud database)
- **Storage:** 25GB+ NVMe/SSD

---

## 1. Initial System Setup

\`\`\`bash

# Update local packages

sudo apt update && sudo apt upgrade -y

# Install Node.js (v18.x)

curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-install -y nodejs

# Install Nginx

sudo apt install -y nginx

# Install PM2 (Process Manager globally)

sudo npm install -g pm2
\`\`\`

---

## 2. Deploying the Backend

1. **Clone the code:**
   \`\`\`bash
   cd /var/www/
   sudo git clone <repository_url> chit-app
   sudo chown -R $USER:$USER /var/www/chit-app
   \`\`\`

2. **Install dependencies:**
   \`\`\`bash
   cd /var/www/chit-app/chit-scheme-backend
   npm install --production
   \`\`\`

3. **Configure Environment variables:**
   Create the production `.env` file (`nano .env`):
   \`\`\`env
   PORT=5000
   NODE_ENV=production
   ALLOWED_ORIGINS=https://app.yourdomain.com
   DB_USER=sa
   DB_PASSWORD=YourStrongPasswordHere!
   DB_SERVER=localhost
   DB_NAME=chitschemes
   DB_PORT=1433
   JWT_SECRET=production_secret_key_change_me
   JWT_EXPIRES_IN=12h
   \`\`\`

4. **Start the API server with PM2:**
   \`\`\`bash
   pm2 start server.js --name "chit-api"
   pm2 save
   pm2 startup
   \`\`\`

---

## 3. Deploying the Frontend

1. **Build the React Application:**
   \`\`\`bash
   cd /var/www/chit-app/chit-scheme-frontend

   # Set the production API URL

   echo "VITE_API_BASE_URL=https://api.yourdomain.com/api" > .env.production

   npm install
   npm run build
   \`\`\`

   This will generate a `dist` folder containing the optimized static assets.

---

## 4. Nginx Configuration (Reverse Proxy)

We will configure Nginx to serve the React static files and proxy API requests to the Node server.

1.  **Create an Nginx server block:**
    \`\`\`bash
    sudo nano /etc/nginx/sites-available/chit-app
    \`\`\`

2.  **Add the following configuration:**
    \`\`\`nginx
    server {
    listen 80;
    server_name app.yourdomain.com api.yourdomain.com;

        # Frontend (React)
        location / {
            root /var/www/chit-app/chit-scheme-frontend/dist;
            index index.html;
            try_files $uri $uri/ /index.html;
        }

        # Backend (API)
        location /api/ {
            proxy_pass http://localhost:5000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

    }
    \`\`\`

3.  **Enable the site and restart Nginx:**
    \`\`\`bash
    sudo ln -s /etc/nginx/sites-available/chit-app /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    \`\`\`

---

## 5. SSL Certificate Setup (Let's Encrypt)

Secure your application using HTTPS.

\`\`\`bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d app.yourdomain.com -d api.yourdomain.com
\`\`\`

Follow the prompts and select option 2 (Redirect all HTTP traffic to HTTPS).

---

## 6. Firewall Rules (UFW)

Ensure basic security by closing unnecessary ports.

\`\`\`bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'

# If MSSQL is hosted on this same machine, do NOT open 1433 to the public unless restricted by IP

# sudo ufw allow from <admin_ip> to any port 1433

sudo ufw enable
\`\`\`

---

## 7. Verification & Health Check

1. **Check Backend Status:**
   Visit `https://api.yourdomain.com/api/health`. You should receive a JSON response indicating `"status": "OK"`.
2. **Check Frontend:**
   Visit `https://app.yourdomain.com` and verify the login page loads securely.
