const simpleFIN = require('./simpleFIN')
const api = require('@actual-app/api');

let _accessKey
let _linkedAccounts
let _startDate
let _serverUrl
let _serverPassword
let _budgetId
let _budgetEncryption

async function sync () {

  const { mkdir } = require('fs').promises;

  budgetspath = __dirname+'/budgets'

  try {
    await mkdir(budgetspath);
  } catch (e) {}


  await api.init({ 
    dataDir: budgetspath,
    serverURL: _serverUrl,
    password: _serverPassword,
  });

  console.log('Downloading budget')
  try {
    await api.downloadBudget(_budgetId,  {password: _budgetEncryption});
  } catch (e) {
    console.log(e.message)
    throw e
  }
  console.log('Budget downloaded')

  console.log('Getting all accounts and transactions from ActualBudget')
  const allAccounts = await api.getAccounts()
  console.log('Getting all transactions from SimpleFIN')
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
      


      const importedTransactions = await api.importTransactions(accountId, transactions)
      const accountName = allAccounts.find(f => f.id === accountId).name
      console.log(`| ${accountName.padEnd(25, ' ')} | ${importedTransactions.added.length.toString().padStart(9, ' ')} | ${importedTransactions.updated.length.toString().padStart(9, ' ')} |`)
    } catch (ex) {
      console.log(ex)
      throw ex
    }
  }
  console.log('¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯')
  console.log('Re-downloading budget to force sync.')
  try {
    await api.downloadBudget(_budgetId,  {password:_budgetEncryption});
  } catch (e) {
    console.log(e.message)
    throw e
  }
  await api.shutdown()
  
}

async function run (accessKey, budgetId, budgetEncryption, linkedAccounts, startDate, serverUrl, serverPassword) {
  _accessKey = accessKey
  _linkedAccounts = linkedAccounts
  _startDate = startDate
  _serverUrl = serverUrl
  _serverPassword = serverPassword
  _budgetId = budgetId
  _budgetEncryption = budgetEncryption

  if(!_serverUrl || !_serverPassword) {
    throw new Error('Server URL or password not set')
  } else {
    console.log('Server information set')
  }
  console.log(`Budget ID: ${budgetId}`)

  await sync()

}

module.exports = { run }
