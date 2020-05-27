
const axios = require('axios');
const Web3 = require('web3');
const { encode } = require('./external');

const hex = string => '0x' + Buffer.from(string).toString('hex');

function getContract(name, versionData, web3) {
  const contractData = versionData.mainnet.abis.filter(abi => abi.code === name)[0];
  const contract = new web3.eth.Contract(JSON.parse(contractData.contractAbi), contractData.address);
  console.log(`Loaded contract ${name} at address ${contractData.address}`);
  return contract;
}




async function main() {
  const directWeb3 = new Web3('https://parity.nexusmutual.io/');
  const forkWeb3 = new Web3('http://127.0.0.1:8545');
  const versionDataResponse = await axios.get('https://api.nexusmutual.io/version-data/data.json');
  const versionData = versionDataResponse.data;
  const master = getContract('NXMASTER', versionData, directWeb3);
  const mr = getContract('MR', versionData, directWeb3);
  const pc = getContract('PC', versionData, directWeb3);
  let members = await mr.methods.members('1').call();
  const firstBoardMember = members[1][0];
  console.log(JSON.stringify(members));

  const gv = getContract('GV', versionData, forkWeb3);

  const masterAddressChangeCategoryId = 27;
  const action = 'updateAddressParameters(bytes8,address)';
  const code = hex('MASTADD');
  const proposedValue = newMasterAddress;

  let actionHash = encode(action, code, proposedValue);

  await submitGovernanceProposal( masterAddressChangeCategoryId, actionHash, mr, gv, '1', firstBoardMember);
  console.log(r);
}

// main().catch(e => {
//   console.error(`FATAL: ${e.stack}`)
// })
