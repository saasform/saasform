
/**
 * Render a generic liquid page
 * @param req The HTTP request
 * @param res The HTTP response
 * @param page A string representing the name of the template to display
 * @param data An optional object containing the page-specific data to pass to the template
 */
const renderPage = (req, res, page: string, data: any = {}): Response => {
  const siteData = req.websiteData

  const pageData = {
    ...siteData,
    ...data,
    user: {
      ...req.user
    },
    plans: data?.plans?.plans ?? siteData.pricing_plans,
    csrf_token: req.csrfToken !== undefined ? req.csrfToken() : null
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
    ...data,
    // important - we must guarantee that payment_methods is an array
    payment_methods: data?.account?.payments_methods ?? [],
    account: data?.account ?? {},
    account_users: data?.account_users ?? [],
    active_subscription: data?.activeSubscription ?? {},
    plans: data?.plans,
    error: data.error
  }
  return renderPage(req, res, 'user', userPageData)
}

export { renderPage, renderUserPage }
