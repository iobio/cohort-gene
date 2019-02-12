#!/bin/bash

rm -rf deploy
mkdir deploy
mkdir deploy/app
mkdir deploy/dist

# build vue app
if [[ $1 == "prod" ]]; then
  echo "** Building prod **"
  NODE_ENV=production npm run build
else
  echo "** Building dev **"
  npm run build
fi

# link to files needed for static page
ln -s ~/Documents/Code/cohort-gene/server/views/index.html ~/Documents/Code/cohort-gene/deploy/index.html
ln -s ~/Documents/Code/cohort-gene/client/assets ~/Documents/Code/cohort-gene/deploy/assets
ln -s ~/Documents/Code/cohort-gene/client/js ~/Documents/Code/cohort-gene/deploy/js
ln -s ~/Documents/Code/cohort-gene/client/dist/build.js ~/Documents/Code/cohort-gene/deploy/dist/build.js
if [[ $1 == "prod" ]]; then
  ln -s ~/Documents/Code/cohort-gene/client/dist/build.js.map ~/Documents/Code/cohort-gene/deploy/dist/build.js.map
fi

# upload to cloudfront
if [[ $1 == "prod" ]]; then
  echo "** Uploaded to prod s3 bucket **"
  aws s3 cp ./deploy/  s3://static.iobio.io/prod/cohortgene.iobio.io/ --recursive
  echo "** Renew cloudfrount cache **"
  aws cloudfront create-invalidation --distribution-id EOHUETUJGTGS3 --paths /\*


else
  echo "** Syncing to dev s3 bucket **"
  #aws s3 sync ./deploy/  s3://static.iobio.io/dev/cohortgene.iobio.io/
  aws s3 cp ./deploy/  s3://static.iobio.io/dev/cohortgene.iobio.io/ --recursive
  echo "** Renew cloudfrount cache **"
  aws cloudfront create-invalidation --distribution-id E1VF20QZEG0H4X --paths /\*
fi
