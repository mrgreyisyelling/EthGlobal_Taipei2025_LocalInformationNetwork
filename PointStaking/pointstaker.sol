// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract PointStaker {
    struct Stake {
        uint256 amount;
        uint256 timestamp;
    }

    // point => staker => amount
    mapping(string => mapping(address => Stake)) public stakes;

    event Staked(address indexed user, string point, uint256 amount);

    function stake(string calldata point) external payable {
        require(msg.value > 0, "Must send MATIC to stake");

        Stake storage s = stakes[point][msg.sender];
        s.amount += msg.value;
        s.timestamp = block.timestamp;

        emit Staked(msg.sender, point, msg.value);
    }

    function getStake(string calldata point, address user) external view returns (uint256 amount, uint256 timestamp) {
        Stake memory s = stakes[point][user];
        return (s.amount, s.timestamp);
    }

    // Admin-only withdraw can be added later if needed.
}
