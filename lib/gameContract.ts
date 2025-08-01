import { encodeFunctionData } from "viem";
import { GAME_ABI_PARSED, GAME_CONTRACT_ADDRESS, GameOptions } from "./constants";

// Helper functions for creating user operations with hooks

export function createPlaceBetUserOp(option: keyof typeof GameOptions) {
  if (!GAME_CONTRACT_ADDRESS) {
    throw new Error("Game contract not deployed");
  }

  return {
    target: GAME_CONTRACT_ADDRESS as `0x${string}`,
    data: encodeFunctionData({
      abi: GAME_ABI_PARSED,
      functionName: "placeBet",
      args: [GameOptions[option]],
    }),
    value: BigInt(0),
  };
}

export function createResolveBetUserOp() {
  if (!GAME_CONTRACT_ADDRESS) {
    throw new Error("Game contract not deployed");
  }

  return {
    target: GAME_CONTRACT_ADDRESS as `0x${string}`,
    data: encodeFunctionData({
      abi: GAME_ABI_PARSED,
      functionName: "resolveBet",
      args: [],
    }),
    value: BigInt(0),
  };
}

export async function getBetData(
  client: any, // SmartAccountClient type from Account Kit
  playerAddress: string
): Promise<{
  option: number;
  resolved: boolean;
  diceSum: number;
} | null> {
  try {
    if (!GAME_CONTRACT_ADDRESS) {
      throw new Error("Game contract not deployed");
    }

    const result = await client.readContract({
      address: GAME_CONTRACT_ADDRESS,
      abi: GAME_ABI_PARSED,
      functionName: "bets",
      args: [playerAddress],
    });

    return {
      option: Number(result[0]),
      resolved: result[1] as boolean,
      diceSum: Number(result[2]),
    };
  } catch (error) {
    console.error("Get bet data error:", error);
    return null;
  }
}

export function getTransactionUrl(client: any, hash: string): string | null {
  if (!client.chain?.blockExplorers || !hash) {
    return null;
  }
  return `${client.chain.blockExplorers.default.url}/tx/${hash}`;
}