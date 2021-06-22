const { Given } = require("cucumber");
const { createConnection, getManager } = require("typeorm");


Given('admin sets settings {string} to {string}', async function (key, v) {
  let val
  if (v === 'true') {
    val = true;
  } else if (v === 'false') {
    val = false;
  } else {
    val = `"${v}"`;
  }
  const sql = `UPDATE settings SET json = JSON_SET(json, "$.${key}", ${val}) WHERE category = "website";`;
  const c = await createConnection();
  await getManager().query(sql);
  c.close();
});
