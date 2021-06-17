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


// STRIPE

function handlePaymentThatRequiresCustomerAction({
  subscription,
  invoice,
  priceId,
  paymentMethodId,
  isRetry,
}) {
  if (subscription && subscription.status === 'active') {
    // subscription is active, no customer actions required.
    return { subscription, priceId, paymentMethodId };
  }

  // If it's a first payment attempt, the payment intent is on the subscription latest invoice.
  // If it's a retry, the payment intent will be on the invoice itself.
  let paymentIntent = invoice != null
    ? invoice.payment_intent
    : subscription.latest_invoice.payment_intent;

  if (
    paymentIntent.status === 'requires_action' ||
    (isRetry === true && paymentIntent.status === 'requires_payment_method')
  ) {
    return stripe
      .confirmCardPayment(paymentIntent.client_secret, {
        payment_method: paymentMethodId,
      })
      .then((result) => {
        if (result.error) {
          // start code flow to handle updating the payment details
          // Display error message in your UI.
          // The card was declined (i.e. insufficient funds, card has expired, etc)
          throw result;
        } else {
          if (result.paymentIntent.status === 'succeeded') {
            // There's a risk of the customer closing the window before callback
            // execution. To handle this case, set up a webhook endpoint and
            // listen to invoice.paid. This webhook endpoint returns an Invoice.
            return {
              priceId: priceId,
              subscription: subscription,
              invoice: invoice,
              paymentMethodId: paymentMethodId,
            };
          }
        }
      });
  } else {
    // No customer action needed
    return { subscription, priceId, paymentMethodId };
  }
}

function handleRequiresPaymentMethod({
  subscription,
  paymentMethodId,
  priceId,
}) {
  if (subscription.status === 'active') {
    // subscription is active, no customer actions required.
    return { subscription, priceId, paymentMethodId };
  } else if (
    subscription.latest_invoice.payment_intent.status ===
    'requires_payment_method'
  ) {
    // Using localStorage to store the state of the retry here
    // (feel free to replace with what you prefer)
    // Store the latest invoice ID and status
    localStorage.setItem('latestInvoiceId', subscription.latest_invoice.id);
    localStorage.setItem(
      'latestInvoicePaymentIntentStatus',
      subscription.latest_invoice.payment_intent.status
    );
    throw { error: { message: 'Your card was declined.' } };
  } else {
    return { subscription, priceId, paymentMethodId };
  }
}

function onSubscriptionComplete(result, completed_cb) {
  // Payment was successful. Provision access to your service.
  completed_cb(result);
}


// Create a token or display an error when the form is submitted.

function createPaymentToken(_csrf) {
stripe.createToken(card).then(function(result) {
  if (result.error) {
    // Inform the customer that there was an error.
    var errorElement = document.getElementById('card-errors');
    errorElement.textContent = result.error.message;
  } else {
    // Send the token to your server.
    // stripeTokenHandler(result.token);
    fetch('/api/v1/add-payment-token', {
      method: 'post',
      headers: {
        'Content-type': 'application/json',
        'CSRF-Token': _csrf // <-- is the csrf token as a header
      },
      body: JSON.stringify({
          plan, method, monthly
      }),
    })

  }
});
}

function createSubscription({ plan, method, monthly, _csrf }, completed_cb, error_cb) {
  return (
    fetch('/api/v1/create-subscription', {
      method: 'post',
      headers: {
        'Content-type': 'application/json',
        'CSRF-Token': _csrf // <-- is the csrf token as a header
      },
      body: JSON.stringify({
          plan, method, monthly
      }),
    })
      .then((response) => {
        return response.json();
      })
      // If the card is declined, display an error to the user.
      .then((result) => {
        if (result.error) {
          // The card had an error when trying to attach it to a customer
          throw result;
        }
        return result.message;
      })
      // Normalize the result to contain the object returned
      // by Stripe. Add the addional details we need.
      .then((result) => {
        return {
          // Use the Stripe 'object' property on the
          // returned result to understand what object is returned.
          subscription: result,
          paymentMethodId: method,
          priceId: result.items.data[0].price.id,
        };
      })
      // Some payment methods require a customer to do additional
      // authentication with their financial institution.
      // Eg: 2FA for cards.
      .then(handlePaymentThatRequiresCustomerAction)
      // If attaching this card to a Customer object succeeds,
      // but attempts to charge the customer fail. You will
      // get a requires_payment_method error.
      .then(handleRequiresPaymentMethod)
      // No more actions required. Provision your service for the user.
      .then(result => onSubscriptionComplete(result, completed_cb))
      .catch((error) => {
        // An error has happened. Display the failure to the user here.
        // We utilize the HTML element we created.
        console.error(error);
        error_cb(error)
      })
  );
}
