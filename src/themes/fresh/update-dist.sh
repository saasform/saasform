#!/bin/bash

rm -rf ../../../data/themes/fresh
rm -rf ../../../data/themes/fresh-sso

cp -r dist ../../../data/themes/fresh
rm ../../../data/themes/fresh/index-sso.liquid

cp -r dist ../../../data/themes/fresh-sso
rm -rf ../../../data/themes/fresh-sso/assets/img
mv ../../../data/themes/fresh-sso/index-sso.liquid ../../../data/themes/fresh-sso/index.liquid
cp ../../../data/themes/fresh-sso/index.liquid ../../../data/themes/fresh-sso/login.liquid
