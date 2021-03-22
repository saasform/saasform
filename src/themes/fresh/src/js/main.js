"use strict";

import './store/store';
import 'alpinejs';
// import { env } from './libs/utils/constants';
// import { initPageLoader } from './libs/components/pageloader';
import { insertBgImages, initModals } from './libs/utils/utils';
import { initNavbar } from './libs/components/navbar';
import { initSidebar } from './libs/components/sidebar';
import { initBackToTop } from './libs/components/backtotop';
import { initPricing } from './libs/components/pricing';
import './libs/auth/google';

window.initNavbar = initNavbar;
window.initSidebar = initSidebar;
window.initBackToTop = initBackToTop;

document.onreadystatechange = function () {
  if (document.readyState === 'complete') {

    //Switch demo images
    // switchDemoImages(env);

    //Switch backgrounds
    insertBgImages();

    // Add modal windows
    initModals();

    initPricing();
  }
}
