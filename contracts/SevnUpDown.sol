// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SevenUpDown {
    address public owner;

    enum Option {
        Down, // 0: sum < 7
        Seven, // 1: sum == 7
        Up // 2: sum > 7
    }

    struct Bet {
        Option option;
        bool resolved;
        uint8 diceSum;
    }

    mapping(address => Bet) public bets;

    event BetPlaced(address indexed player, Option option);
    event BetResolved(address indexed player, uint8 diceSum, uint256 payout);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function placeBet(Option _option) external {
        require(bets[msg.sender].resolved || bets[msg.sender].diceSum == 0, "Resolve previous bet first");

        bets[msg.sender] = Bet({
            option: _option,
            resolved: false,
            diceSum: 0
        });

        emit BetPlaced(msg.sender, _option);
    }

    function resolveBet() external {
        Bet storage bet = bets[msg.sender];
        require(!bet.resolved, "Already resolved");

        // 🔒 Not secure randomness — for demo only
        uint8 diceSum = uint8((uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender))) % 11) + 2);

        uint256 payout = 0;
        if (diceSum < 7 && bet.option == Option.Down) {
            payout = 2 ether;
        } else if (diceSum == 7 && bet.option == Option.Seven) {
            payout = 5 ether;
        } else if (diceSum > 7 && bet.option == Option.Up) {
            payout = 2 ether;
        }

        bet.resolved = true;
        bet.diceSum = diceSum;

        if (payout > 0) {
            payable(msg.sender).transfer(payout);
        }

        emit BetResolved(msg.sender, diceSum, payout);
    }

    // Admin functions
    function deposit() external payable onlyOwner {}

    function withdraw(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient balance");
        payable(owner).transfer(amount);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
