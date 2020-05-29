
const axios = require('axios');
const Web3 = require('web3');
const { contract, accounts, defaultSender, web3 } = require('@openzeppelin/test-environment');
const { expectRevert, ether, time, expectEvent } = require('@openzeppelin/test-helpers');
const { assert } = require('chai');
const { encode } = require('./external');

const MemberRoles = contract.fromArtifact('MemberRoles');
const NXMasterNew = contract.fromArtifact('NXMasterMock');
const NXMToken = contract.fromArtifact('NXMToken');
const Governance = contract.fromArtifact('Governance');
const PooledStaking = contract.fromArtifact('PooledStaking');
const ClaimsReward = contract.fromArtifact('ClaimsReward');


const hex = string => '0x' + Buffer.from(string).toString('hex');

function getWeb3Contract(name, versionData, web3) {
  const contractData = versionData.mainnet.abis.filter(abi => abi.code === name)[0];
  const contract = new web3.eth.Contract(JSON.parse(contractData.contractAbi), contractData.address);
  console.log(`Loaded contract ${name} at address ${contractData.address}`);
  return contract;
}

function getContractData(name, versionData) {
  return versionData.mainnet.abis.filter(abi => abi.code === name)[0];
}

function getUpgradeAddressesArray(versions) {
  const codes = ['QD', 'TD', 'CD', 'PD', 'QT', 'TF', 'TC', 'CL', 'CR', 'P1', 'P2', 'MC', 'GV', 'PC', 'MR'];

  const addresses = codes.map(code => versions.mainnet.abis.filter(abi => abi.code === code)[0].address);
  return addresses;
}

async function submitGovernanceProposal(categoryId, actionHash, members, gv, memberType, submitter) {
  let p = await gv.getProposalLength();
  console.log(`Creating proposal ${p}..`);
  await gv.createProposal('proposal', 'proposal', 'proposal', 0, {
    from: submitter
  });
  console.log(`Categorizing proposal ${p}..`);
  await gv.categorizeProposal(p, categoryId, 0, {
    from: submitter
  });

  console.log(`Submitting proposal ${p}..`);
  await gv.submitProposalWithSolution(p, 'proposal', actionHash, {
    from: submitter
  });
  for (let i = 1; i < members.length; i++) {
    console.log(`Voting from ${members[i]} for ${p}..`);
    await gv.submitVote(p, 1, {
      from: members[i]
    });
  }

  const increase = 604800;
  console.log(`Advancing time by ${increase} seconds to allow proposal closing..`);
  await time.increase(increase);

  if (memberType !== 3) {
    console.log(`Closing proposal..`);
    await gv.closeProposal(p, {
      from: submitter
    });
  }
  let proposal = await gv.proposal(p);
  console.log(`Proposal is:`);
  console.log(proposal);
  assert.equal(proposal[2].toNumber(), 3);
}

const directWeb3 = new Web3(process.env.TEST_ENV_FORK);

const masterAddressChangeCategoryId = 27;
const contractAddressUpgradeCategoryId = 29;

describe('migration', function () {
  const [
    owner,
  ] = accounts;

  before(async function () {
    const versionDataResponse = await axios.get('https://api.nexusmutual.io/version-data/data.json');
    const versionData = versionDataResponse.data;
    const mr = await MemberRoles.at(getContractData('MR', versionData).address);
    const tk = await NXMToken.at(getContractData('NXMTOKEN', versionData).address);
    let gv = await Governance.at(getContractData('GV', versionData).address);

    const directMR = getWeb3Contract('MR', versionData, directWeb3);

    let members = await directMR.methods.members('1').call();
    const boardMembers = members.memberArray;
    const firstBoardMember = boardMembers[0];
    console.log('Board members:');
    console.log(boardMembers);

    const topUp = ether('100');
    for (let member of boardMembers) {
      console.log(`Topping up ${member}`);
      await web3.eth.sendTransaction({
        from: owner,
        to: member,
        value: topUp,
      });
    }

    assert.equal(boardMembers.length, 5);

    const newMaster = await NXMasterNew.new(tk.address, {
      from: firstBoardMember
    });
    const masterOwner = await newMaster.owner();
    console.log(`Deployed new master at: ${newMaster.address} with owner: ${masterOwner}`);

    const action = 'updateAddressParameters(bytes8,address)';
    const code = hex('MASTADD');
    const proposedValue = newMaster.address;

    let actionHash = encode(action, code, proposedValue);

    await submitGovernanceProposal( masterAddressChangeCategoryId, actionHash, boardMembers, gv, '1', firstBoardMember);
    console.log(`Successfully submitted proposal and passed.`);

    const newMasterGovernanceAddress = await gv.nxMasterAddress();
    assert.equal(newMaster.address, newMasterGovernanceAddress);

    console.log(`Deploying pooled staking..`);
    const ps = await PooledStaking.new({
      from: firstBoardMember
    });

    console.log(`Injecting the PooledStaking in the new master...`);
    await newMaster.setContractAddress(hex('PS'), ps.address);

    const currentPooledStakingAddress = await newMaster.getLatestAddress(hex('PS'));
    assert.equal(currentPooledStakingAddress, ps.address);
    const pooledStakingIsInternal = await newMaster.isInternal(ps.address);
    assert.equal(pooledStakingIsInternal, true);

    console.log('Setting master address for pooled staking.')
    await ps.changeMasterAddress(newMaster.address);


    console.log(`Deploying new ClaimsReward..`)

    const newCR = await ClaimsReward.new({
      from: firstBoardMember
    });
    actionHash = encode(
      'upgradeContract(bytes2,address)',
      'CR',
      newCR.address
    );

    await submitGovernanceProposal(contractAddressUpgradeCategoryId, actionHash, boardMembers, gv, '1', firstBoardMember);
    const storedCRAddress = await newMaster.getLatestAddress(hex('CR'));
    assert.equal(storedCRAddress, newCR.address);
    console.log(`Successfully submitted proposal for ClaimsReward upgrade and passed.`);

    console.log('Pooled staking is set up correctly. Initializing and migrating..');

    this.master = newMaster;
    this.cr = newCR;
    this.mr = mr;
    this.gv = gv;
    this.tk = tk;
    this.ps = ps;


  });

  it('migrates all data from old pooled staking system to new one', async function () {
    const { ps } = this;

    await ps.changeDependentContractAddress();
  });
})
