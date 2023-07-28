const inquirer = require('inquirer')
const simpleFIN = require('./simpleFIN')
const api = require('@actual-app/api');

let _token
let _accessKey
let _budgetId

console.log('Inquirer, SimpleFIN and API modules loaded.');

const prompts = [
  {
    type: 'input',
    name: 'token',
    message: 'Enter your SimpleFIN Token (https://beta-bridge.simplefin.org/):',
    default: () => getToken(),
    validate: async (i, a) => {
      if (i !== getToken()) {
        try {
          a.accessKey = await simpleFIN.getAccessKey(i)
        } catch (e) {
          return `Invalid Token: ${i}`
        }
      } else {
        a.accessKey = getAccessKey()
      }
      return true
    }
  },
  {
    type: 'input',
    name: 'accessKey',
    message: 'AccessKey from SimpleFIN (This should have been derived from the Token provided)',
    askAwnsered: false
  },
  {
    type: 'input',
    name: 'budgetId',
    message: 'Enter your ActualBudget Budget ID:',
    default: () => getBudgetId(),
    validate: async (i) => {
      console.log('Budget: ', i);
      const budget = await api.loadBudget(i);
      console.log('Calling Budget');
      return await api.getAccounts(budget).length > 0;
      console.log('Calling Accounts');
    }
  }
]

async function loadAccounts() {
  console.log('About to load accounts.');
  const accounts = await api.getAccounts();
  console.log('Accounts loaded: ', accounts);
  return accounts;
}

function getChoices (answers, accounts) {
  const ret = accounts.filter(f => !Object.values(answers).find(a => a === f.id)).map(a => {
    return {
      name: `${a.name} (${a.type})`,
      value: a.id,
      short: a.name
    }
  }).sort((a, b) => {
    const au = a.name.toUpperCase()
    const bu = b.name.toUpperCase()
    if (au > bu) return 1
    else if (au < bu) return -1
    return 0
  })
  ret.push({
    name: 'Skip',
    value: null,
    short: 'Skipped'
  })
  return ret
}

function getToken () {
  return _token
}

function getAccessKey () {
  return _accessKey
}

function getBudgetId () {
  return _budgetId
}

async function initialSetup(token, accessKey, budgetId) {
  console.log('Initiating setup...');
  _token = token;
  _accessKey = accessKey;
  _budgetId = budgetId;
  console.log('Prompting user for input...');
  const initialSetup = await inquirer.prompt(prompts);
  console.log('User input received: ', initialSetup);
  return initialSetup;
}

async function accountSetup (accessKey, budgetId, linkedAccounts, reLinkAccounts) {
  console.log('Starting account setup...');
  const simpleFINAccounts = await simpleFIN.getAccounts(accessKey)
  console.log('SimpleFIN Accounts: ', simpleFINAccounts);
  const accounts = (await api.loadBudget(budgetId).then.api.getAccounts()).filter(f => !!reLinkAccounts || !Object.values(linkedAccounts || {}).find(a => a === f.id))
  console.log('ActualBudget accounts: ', accounts);
  const accountLinkPrompts = simpleFINAccounts.accounts.filter(f => !!reLinkAccounts || !linkedAccounts[f.id]).map(s => {
    return {
      type: 'list',
      name: s.id,
      message: `Link ${s.org.name} - ${s.name} ($${s.balance}) with ActualBudget account:`,
      default: linkedAccounts[s.id],
      choices: (a) => { return getChoices(a, accounts) },
      when: (a) => { return getChoices(a, accounts).length > 1 }
    }
  })
  const accountLinks = await inquirer.prompt(accountLinkPrompts)
  Object.assign(linkedAccounts, accountLinks)
  const nullsRemoved = Object.fromEntries(Object.entries(linkedAccounts).filter(([_, v]) => v != null))
  return nullsRemoved
}

console.log('Setup module loaded.');

module.exports = { initialSetup, accountSetup }
