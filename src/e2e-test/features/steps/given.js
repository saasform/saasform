const { Given, When } = require("cucumber");
const { createConnection, getManager } = require("typeorm");

const json = JSON;

Given('admin sets settings {string} to {string}', async function (key, v) {
  let val
  if (v === 'true') {
    val = true;
  } else if (v === 'false') {
    val = false;
  } else if (v.indexOf('"') > 0) {
    val = `'${v}'`;
  } else {
    val = `"${v}"`;
  }
  const sql = `UPDATE settings SET json = JSON_SET(json, "$.${key}", ${val}) WHERE category = "website";`;
  const c = await createConnection();
  await getManager().query(sql);
  c.close();
});

When(
  'I set the card information {string} {string} on {string}', async function (number, extra, selector) {
    const page = this.page
    await page.click(selector)
    await page.keyboard.type(number, { delay: 50 })
    // await sleep(2000) // wait for post-credit card number sliding CardElement animation
    await page.keyboard.type(extra, { delay: 50 })
  }
)

