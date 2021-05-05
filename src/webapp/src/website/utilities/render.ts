
/**
 * Render a generic liquid page
 * @param req The HTTP request
 * @param res The HTTP response
 * @param page A string representing the name of the template to display
 * @param data An optional object containing the page-specific data to pass to the template
 */
const renderPage = (req, res, page: string, data = {}): Response => {
  const siteData = req.websiteData

  const pageData = {
    ...siteData,
    ...data,
    user: {
      ...req.user
    },
    csrf_token: req.csrfToken()
  }
  // console.log(pageData)
  return res.render(`${siteData.root_theme as string}/${page}`, pageData)
}

/**
 * Render a subpage of /user
 * @param req The HTTP request
 * @param res The HTTP response
 * @param page A string representing the name of the template to display
 * @param data An optional object containing the page-specific data to pass to the template
 */
const renderUserPage = (req, res, page: string, data = {} as any): Response => {
  const userPageData = {
    user_page: page,
    // important - we must guarantee that payment_methods is an array
    payment_methods: data?.account?.payments_methods ?? [],
    account_users: data?.account_users ?? [],
    stripePublishableKey: data?.stripePublishableKey ?? '',
    plans: data?.plans?.plans ?? [],
    active_subscription: data?.activeSubscription ?? {},
    error: data.error
  }
  return renderPage(req, res, 'user', userPageData)
}

export { renderPage, renderUserPage }
