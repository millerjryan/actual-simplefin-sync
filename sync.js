const simpleFIN = require('./simpleFIN')
const api = require('@actual-app/api');


let _accessKey
let _linkedAccounts
let _startDate

async function sync () {
  const allAccounts = await api.getAccounts()
  const allTrans = await simpleFIN.getTransactions(_accessKey, _startDate)
  console.log('_____________________________________________________')
  console.log('|          Account          |   Added   |  Updated  |')
  console.log('+---------------------------+-----------+-----------+')
  for (const simpleFINAccountId in _linkedAccounts) {
    const accountId = _linkedAccounts[simpleFINAccountId]
    const transactions = allTrans.accounts.find(f => f.id === simpleFINAccountId).transactions
      .map(m => {
        return {
          account: accountId,
          date: new Date(m.posted * 1000).toISOString().split('T')[0],
          amount: parseInt(m.amount.replace('.', '')),
          payee_name: m.payee,
          notes: m.description,
          imported_payee: m.payee,
          imported_id: m.id
        }
      })
    try {
      
      await api.init({ 
        serverURL: 'actual budget url',
        password: 'actual budget password',
      });

      const importedTransactions = await api.importTransactions(accountId, transactions)
      const accountName = allAccounts.find(f => f.id === accountId).name
      console.log(`| ${accountName.padEnd(25, ' ')} | ${importedTransactions.added.length.toString().padStart(9, ' ')} | ${importedTransactions.updated.length.toString().padStart(9, ' ')} |`)
    } catch (ex) {
      console.log(ex)
      throw ex
    }
  }
  console.log('¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯')

  process.exit()
  
}

async function run (accessKey, budgetId, linkedAccounts, startDate) {
  _accessKey = accessKey
  _linkedAccounts = linkedAccounts
  _startDate = startDate

  console.log(budgetId)

  await api.init({ 
    serverURL: 'actual budget url',
    password: 'actual budget password',
  });

  await api.downloadBudget(budgetId);

  sync()

}

module.exports = { run }
