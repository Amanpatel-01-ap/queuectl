const { getConfig, setConfig } = require('../lib/config');

async function set(key, value) {
  await setConfig(key, value);
  console.log(`✅ Config updated: ${key} = ${value}`);
}

async function show() {
  const retries = await getConfig('max_retries');
  const base = await getConfig('backoff_base');
  console.log(`⚙️ Current Config → max_retries=${retries}, backoff_base=${base}`);
}

module.exports = { set, show };
