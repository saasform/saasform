import { CountUp } from '../utils/countUp';

export function initPricing() {
  window.pricingUpdate = function(self, price, decimals) {
    const countUp = new CountUp(self.id, price, { startVal: self.innerHTML, decimalPlaces: decimals, duration: 1 });
    if (!countUp.error) {
      countUp.start();
    } else {
      console.error(countUp.error);
    }
  }
}
