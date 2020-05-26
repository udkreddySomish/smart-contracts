import "@openzeppelin/contracts/math/SafeMath.sol";
import "./interfaces/ITokenController.sol";
import "./interfaces/ITokenData.sol";

contract TokenFunctionsUtils {
    using SafeMath for uint;

    ITokenController internal tc;
    ITokenData internal td;

    /**
     * @dev to get tokens of staker locked before burning that are allowed to burn
     * @param stakerAdd is the address of the staker
     * @param stakedAdd is the address of staked contract in concern
     * @param stakerIndex is the staker index in concern
     * @return amount of unlockable tokens
     * @return amount of tokens that can burn
     */
    function _unlockableBeforeBurningAndCanBurn(
        address stakerAdd,
        address stakedAdd,
        uint stakerIndex
    )
    internal
    view
    returns
    (uint amount, uint canBurn) {

        uint dateAdd;
        uint initialStake;
        uint totalBurnt;
        uint ub;
        (, , dateAdd, initialStake, , totalBurnt, ub) = td.stakerStakedContracts(stakerAdd, stakerIndex);
        canBurn = _calculateStakedTokens(initialStake, (now.sub(dateAdd)).div(1 days), td.scValidDays());
        // Can't use SafeMaths for int.
        int v = int(initialStake - (canBurn) - (totalBurnt) - (
        td.getStakerUnlockedStakedTokens(stakerAdd, stakerIndex)) - (ub));
        uint currentLockedTokens = _getStakerLockedTokensOnSmartContract(
            stakerAdd, stakedAdd, td.getStakerStakedContractIndex(stakerAdd, stakerIndex));
        if (v < 0) {
            v = 0;
        }
        amount = uint(v);
        if (canBurn > currentLockedTokens.sub(amount).sub(ub)) {
            canBurn = currentLockedTokens.sub(amount).sub(ub);
        }
    }

    /**
     * @dev Internal function to get the amount of locked NXM tokens,
     * staked against smartcontract by index
     * @param _stakerAddress address of user
     * @param _stakedContractAddress staked contract address
     * @param _stakedContractIndex index of staking
     */
    function _getStakerLockedTokensOnSmartContract (
        address _stakerAddress,
        address _stakedContractAddress,
        uint _stakedContractIndex
    )
    internal
    view
    returns
    (uint amount)
    {
        bytes32 reason = keccak256(abi.encodePacked("UW", _stakerAddress,
            _stakedContractAddress, _stakedContractIndex));
        amount = tc.tokensLocked(_stakerAddress, reason);
    }

    /**
     * @dev Internal function to gets remaining amount of staked NXM tokens,
     * against smartcontract by index
     * @param _stakeAmount address of user
     * @param _stakeDays staked contract address
     * @param _validDays index of staking
     */
    function _calculateStakedTokens(
        uint _stakeAmount,
        uint _stakeDays,
        uint _validDays
    )
    internal
    pure
    returns (uint amount)
    {
        if (_validDays > _stakeDays) {
            uint rf = ((_validDays.sub(_stakeDays)).mul(100000)).div(_validDays);
            amount = (rf.mul(_stakeAmount)).div(100000);
        } else {
            amount = 0;
        }
    }
}
