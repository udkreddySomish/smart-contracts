/* Copyright (C) 2020 NexusMutual.io

  This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

  This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
    along with this program.  If not, see http://www.gnu.org/licenses/ */

pragma solidity ^0.5.7;

interface ITokenData {

    function members(uint _memberRoleId) external view returns(uint, address[] memory memberArray);

    function getStakerStakedContractLength(
        address _stakerAddress
    )
    external
    view
    returns (uint length);

    function getStakerStakedContractByIndex(
        address _stakerAddress,
        uint _stakerIndex
    )
    external
    view
    returns (address stakedContractAddress);

    function getStakerStakedContractIndex(
        address _stakerAddress,
        uint _stakerIndex
    )
    external
    view
    returns (uint scIndex);

    function pushBurnedTokens(
        address _stakerAddress,
        uint _stakerIndex,
        uint _amount
    ) external;
}
