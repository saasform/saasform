/**
 * Base class for all payment processor services in Saasform.
 */
export abstract class BasePaymentProcessorService {
  async createCustomer (customer: any): Promise<any> {
    console.log('Create customer')
  }

  async createFreeSubscription (plan: any, stripeId: any): Promise<any> {
    console.log('Create free subscription')
  }

  async attachPaymentMethod (customer: any, method: any): Promise<any|null> {
    console.log('Create payment method')
  }

  async subscribeToPlan (customer: any, paymentMethod: any, price: any): Promise<any> {
    console.log('Subscribe to plan')
  }

  async getSubscriptions (accountId: any): Promise<any> {
    console.log('Get subscriptions')
  }

  async updatePlan (subscriptionId: any, price: any): Promise<any> {
    console.log('Update plan')
  }
}
