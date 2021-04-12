# Developer guide

To develop Saasform:
- run docker db `docker-compose -f docker-compose.yml -f docker-compose.dev.yml up saasform-db`
- on another shell in `src/webapp` run `yarn start:dev`
- before commit: `yarn lint && yarn test && yarn test:e2e`

## Suggested VSC extensions

- gitlens (eamodio.gitlens)
- jest (orta.vscode-jest)
- liquid (sissel.shopify-liquid)
- standardsjs (chenxsan.vscode-standardjs)
- markdownlint (davidanson.vscode-markdownlint)
- commitizen (knisterpeter.vscode-commitizen)

## Mapping values from/to .data field in entities

TODO. See `accounts/entities/user.entity.ts` for details.

