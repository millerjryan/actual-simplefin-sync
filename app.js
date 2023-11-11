const setup = require('./setup')
const sync = require('./sync')
const nconf = require('nconf')
const api = require('@actual-app/api');
const {
  initialize,
} = require("./setup.js");

nconf.argv().env().file({ file: './config.json' })

let actualInstance

async function run () {
  let token = nconf.get('simpleFIN:token')
  let accessKey = nconf.get('simpleFIN:accessKey')
  let budgetId = nconf.get('actual:budgetId')
  let serverUrl = nconf.get('actual:serverUrl') || ''
  let serverPassword = nconf.get('actual:serverPassword') || ''
  let linkedAccounts = nconf.get('linkedAccounts') || []

  const setupRequired = !!nconf.get('setup') || !accessKey || !budgetId
  const linkRequired = setupRequired || !!nconf.get('link') || !linkedAccounts

  if (setupRequired) {
    const initialSetup = await setup.initialSetup(token, accessKey, budgetId, serverUrl, serverPassword)

    token = initialSetup.token
    accessKey = initialSetup.accessKey
    budgetId = initialSetup.budgetId
    serverUrl = initialSetup.serverUrl
    serverPassword = initialSetup.serverPassword

    nconf.set('simpleFIN:token', token)
    nconf.set('simpleFIN:accessKey', accessKey)
    nconf.set('actual:budgetId', budgetId)

    actualConfig = {
      budgetId: budgetId,
      serverUrl: serverUrl,
      serverPassword: serverPassword
    }

    if (!actualInstance) {
      actualInstance = await initialize(actualConfig);
    }


    console.log('Budget: ', budgetId);

    await actualInstance.downloadBudget(budgetId);

    accounts = await actualInstance.getAccounts();

    if(accounts.length > 0) {
      nconf.set('actual:serverUrl', serverUrl)
      nconf.set('actual:serverPassword', serverPassword)
      
    } else {
      throw new Error('Actual Budget Error: serverUrl and serverPassword are required');
    }
   
    await nconf.save()
  }

  if (linkRequired) {
    actualConfig = {
      budgetId: budgetId,
      serverUrl: serverUrl,
      serverPassword: serverPassword
    }

    if (!actualInstance) {
      actualInstance = await initialize(actualConfig);
    }

    linkedAccounts = await setup.accountSetup(accessKey, actualInstance, linkedAccounts, linkRequired)
    nconf.set('linkedAccounts', linkedAccounts)
    nconf.save()
  }
  const lastSync = nconf.get('lastSync')
  let startDate
  if (lastSync) {
    // Looking back an additional 5 days, this may not be necessary, just trying to make sure we catch any additional 'older' transactions that may have slipped in after our last check.
    startDate = new Date(lastSync)
    startDate.setDate(startDate.getDate() - 5)
  }
  await sync.run(accessKey, budgetId, linkedAccounts, startDate, serverUrl, serverPassword)
  nconf.set('lastSync', new Date().toDateString())
  nconf.save()
  console.log('Complete')
}

run()
