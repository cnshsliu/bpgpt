#!/bin/bash

# get the current directory of the script
INSTALLER_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
AID_HOME="$(dirname "$INSTALLER_DIR")"

echo $INSTALLER_DIR
mkdir -p $INSTALLER_DIR/../running/static
mkdir -p $INSTALLER_DIR/../running/runtime
mkdir -p $INSTALLER_DIR/../running/attachment
mkdir -p $INSTALLER_DIR/../running/kshare

KEY=`node $INSTALLER_DIR/genCryptoKey.cjs`
echo $KEY

tee  $INSTALLER_DIR/../setenv.sh <<EOF
#!/bin/bash
export HAPI_HOST="0.0.0.0"
export HAPI_PORT=5008
export MONGO_CONNECTION_STRING="mongodb://127.0.0.1:27017/emp?directConnection=true&serverSelectionTimeoutMS=2000"
export REDIS_CONNECTION_STRING="redis://default:foobared@127.0.0.1:6379"
export CRYPTO_PRIVATE_KEY="${KEY}"
export CRYPTO_EXPIRE=60
export SMTP_HOST="smtp.your-domain.com"
export SMTP_PORT=465
export SMTP_USERNAME="smtp_user"
export SMTP_PASSWORD="smtp_password"
export SMTP_FROM="admin_email"
export SITE_ADMIN="site admin email"
export SITE_ADMIN_PASSWORD="site admin password"
export WX_APPID="WX APPID"
export WX_APPSECRET="WX APP Secret"

export AID_HOME="${AID_HOME}";
export AID_FRONTEND_URL=https://localhost:5173
export AID_STATIC_FOLDER=$AID_HOME/running/static
export AID_RUNTIME_FOLDER=$AID_HOME/running/runtime
export AID_ATTACHMENT_FOLDER=$AID_HOME/running/attachment
export AID_KSHARE_FOLDER=$AID_HOME/running/kshare
# export NODE_TLS_REJECT_UNAUTHORIZED=0;
export NODE_ARGS=""

EOF

chmod +x  $INSTALLER_DIR/../setenv.sh
