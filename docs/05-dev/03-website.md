---
layout: default
parent: Developer Guide
nav_order: 3
title: Website & Themes
permalink: /dev/website
---

# Website & Themes

Add a directory to `data/themes/mytheme` and update the `default` link to point to it

```
cd saasform/data/themes
mkdir mytheme
# create your files here
cd ../
unlink default && ln -s mytheme default
```

Keep the file names consistent with the default ones.

The `data/themes/bare` theme is a minimal theme with nothing more than the necessary; you can start from there to understand the file names and the basic structure of the pages.

In the future other themes will be added `data/themes/` directory.
