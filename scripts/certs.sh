#!/bin/bash

set -eux

if [ "$#" -ne 1 ]
then
  echo "Usage: Must supply a domain"
  exit 1
fi

DOMAIN=${1//./-}
SUBJ="/C=US/O=STRV/OU=D&E/CN=$1"

cert::ca() {
  pushd ${1?'Missing required positional argument "out_dir"'}

  echo "Generating certificate authority for domain $DOMAIN"

  if [ -f $DOMAIN.key ]; then
    echo "CA key" $DOMAIN.key "already exists, skipping"
  else
    openssl genrsa -out $DOMAIN.key 2048
  fi
  if [ -f $DOMAIN.pem ]; then
    echo "CA pem" $DOMAIN.pem "already exists, skipping"
  else
    openssl req -new -nodes -x509 -sha256 \
      -key $DOMAIN.key \
      -out $DOMAIN.pem \
      -subj "$SUBJ" \
      -days 825
  fi

  popd
}

cert::generate() {
  pushd ${1?'Missing required positional argument "out_dir"'}

  local CA=${CA:-../ca/$DOMAIN.pem}
  local CAKey=${CA_KEY:-../ca/$DOMAIN.key}

  echo "Generating certificate for domain $DOMAIN"

  ln -sf ../$DOMAIN.ext $DOMAIN.ext

  openssl genrsa                    -out $DOMAIN.key 2048
  openssl req -new -key $DOMAIN.key -out $DOMAIN.csr -subj $SUBJ

  openssl x509 -req -sha256 -CAcreateserial \
      -in      $DOMAIN.csr \
      -CA      $CA         \
      -CAkey   $CAKey      \
      -extfile ../$DOMAIN.ext  \
      -out     $DOMAIN.crt     \
      -days 825

  popd
}

# ---

mkdir -p ./certs && cat > ./certs/$DOMAIN.ext << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names
[alt_names]
DNS.1 = $1
DNS.2 = dev.$1
DNS.3 = stg.$1
EOF

mkdir -p ./certs/{ca,server,client}

cert::ca ./certs/ca
CA=../ca/$DOMAIN.pem CAkey=../ca/$DOMAIN.key cert::generate ./certs/server
CA=../ca/$DOMAIN.pem CAkey=../ca/$DOMAIN.key cert::generate ./certs/client
