import { parseAbi } from "viem";

// Seven Up Down Game Contract Configuration
export const GAME_CONTRACT_ADDRESS = "0xB6B9918C5880f7a1A4C65c4C4B6297956B4c39AD"; // Will be updated after deployment

// Seven Up Down Game Contract ABI
export const GAME_ABI_PARSED = parseAbi([
  "function placeBet(uint8 _option) external",
  "function resolveBet() external",
  "function bets(address) external view returns (uint8 option, bool resolved, uint8 diceSum)",
  "function getBalance() external view returns (uint256)",
  "function deposit() external payable",
  "function withdraw(uint256 amount) external",
  "function owner() external view returns (address)",
  "event BetPlaced(address indexed player, uint8 option)",
  "event BetResolved(address indexed player, uint8 diceSum, uint256 payout)",
] as const);

// Game options enum
export const GameOptions = {
  Down: 0,    // sum < 7
  Seven: 1,   // sum == 7
  Up: 2,      // sum > 7
} as const;
