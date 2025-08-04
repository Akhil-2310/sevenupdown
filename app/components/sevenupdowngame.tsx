"use client"

import { useState, useEffect, useCallback } from "react"
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Coins, TrendingUp, TrendingDown, Target } from "lucide-react"
import { useSmartAccountClient, useSendUserOperation } from "@account-kit/react"
import { createPlaceBetUserOp, createResolveBetUserOp, getBetData, getTransactionUrl } from "@/lib/gameContract"
import { GameOptions } from "@/lib/constants"

type BetType = "under" | "exact" | "over" | null
type GameState = "betting" | "placing" | "resolving" | "result"

const diceIcons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6]

export default function SevenUpSevenDown() {
  const { client } = useSmartAccountClient({
    policyId: "28703310-c5f4-4bcf-bbf4-8a80c0cbbfe5",
  })
  const [betType, setBetType] = useState<BetType>(null)
  const [dice1, setDice1] = useState(1)
  const [dice2, setDice2] = useState(1)
  const [gameState, setGameState] = useState<GameState>("betting")
  const [isRolling, setIsRolling] = useState(false)
  const [lastResult, setLastResult] = useState<"win" | "lose" | null>(null)
  const [winAmount, setWinAmount] = useState(0)
  const [currentBet, setCurrentBet] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [transactionHash, setTransactionHash] = useState<string | null>(null)
  const [rollInterval, setRollInterval] = useState<NodeJS.Timeout | null>(null)

  // Place bet hook
  const {
    sendUserOperation: sendPlaceBet,
    isSendingUserOperation: isPlacingBet,
  } = useSendUserOperation({
    client,
    waitForTxn: true,
    onSuccess: ({ hash }) => {
      setTransactionHash(hash)
      loadBetData() // Reload bet data after successful bet placement
      setGameState("betting") // Ready for resolve
    },
    onError: (error) => {
      console.error("Place bet error:", error)
      const errorMsg = error.message || "Failed to place bet"
      if (errorMsg.includes("Resolve previous bet first")) {
        setError("You have an active bet. Please resolve it first!")
        // Force reload bet data to show current bet
        loadBetData()
      } else {
        setError(errorMsg)
      }
      setGameState("betting")
    },
  })

  // Resolve bet hook
  const {
    sendUserOperation: sendResolveBet,
    isSendingUserOperation: isResolvingBet,
  } = useSendUserOperation({
    client,
    waitForTxn: true,
    onSuccess: ({ hash }) => {
      console.log("Resolve bet success:", hash)
      setTransactionHash(hash)
      // Stop dice animation
      if (rollInterval) {
        clearInterval(rollInterval)
        setRollInterval(null)
      }
      setIsRolling(false)
      // Wait a bit then reload bet data to get the result
      setTimeout(async () => {
        await loadBetData()
      }, 2000)
    },
    onError: (error) => {
      console.error("Resolve bet error:", error)
      const errorMsg = error.message || "Failed to resolve bet"
      setError(errorMsg)
      // Stop dice animation
      if (rollInterval) {
        clearInterval(rollInterval)
        setRollInterval(null)
      }
      setIsRolling(false)
      setGameState("betting")
    },
  })

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (rollInterval) {
        clearInterval(rollInterval)
      }
    }
  }, [rollInterval])

  const loadBetData = useCallback(async () => {
    if (!client?.account?.address) return
    
    console.log("Loading bet data for:", client.account.address)
    
    try {
      const bet = await getBetData(client, client.account.address)
      console.log("Current bet data:", bet)
      setCurrentBet(bet)
      
      if (bet && bet.resolved && bet.diceSum > 0) {
        console.log("Bet is resolved with dice sum:", bet.diceSum)
        setDice1(Math.floor(Math.random() * 6) + 1)
        setDice2(Math.floor(Math.random() * 6) + 1)
        // Calculate actual dice from sum (simplified)
        const targetSum = bet.diceSum
        const dice1Val = Math.min(6, Math.max(1, Math.floor(targetSum / 2)))
        const dice2Val = targetSum - dice1Val
        setDice1(dice1Val)
        setDice2(dice2Val > 6 ? 6 : dice2Val < 1 ? 1 : dice2Val)
        
        // Check if won
        const won = 
          (bet.diceSum < 7 && bet.option === GameOptions.Down) ||
          (bet.diceSum === 7 && bet.option === GameOptions.Seven) ||
          (bet.diceSum > 7 && bet.option === GameOptions.Up)
        
        console.log("Bet result - won:", won, "dice sum:", bet.diceSum, "option:", bet.option)
        setLastResult(won ? "win" : "lose")
        const multiplier = bet.option === GameOptions.Seven ? 5 : 2
        setWinAmount(won ? multiplier : 0) // Simplified for display
        setGameState("result")
      } else if (bet && !bet.resolved) {
        console.log("Bet exists but not resolved yet")
        setGameState("betting") // Ready to resolve
      } else {
        console.log("No active bet found")
        setGameState("betting") // Ready for new bet
      }
    } catch (err) {
      console.error("Failed to load bet data:", err)
    }
  }, [client])

  // Load current bet from contract
  useEffect(() => {
    if (client?.account?.address) {
      loadBetData()
    }
  }, [client?.account?.address, loadBetData])

  const diceSum = dice1 + dice2

  const handlePlaceBet = async (option: BetType) => {
    if (!client || !option) return
    
    setError(null)
    setGameState("placing")
    setBetType(option)
    
    try {
      const optionKey = option === "under" ? "Down" : option === "exact" ? "Seven" : "Up"
      const userOp = createPlaceBetUserOp(optionKey as keyof typeof GameOptions)
      await sendPlaceBet({ uo: userOp })
    } catch (err) {
      console.error("Failed to create place bet operation:", err)
      setError("Failed to place bet")
      setGameState("betting")
    }
  }

  const handleResolveBet = async () => {
    if (!client) return
    
    setError(null)
    setGameState("resolving")
    setIsRolling(true)
    
    // Stop any existing animation
    if (rollInterval) {
      clearInterval(rollInterval)
    }
    
    // Start dice rolling animation
    const newRollInterval = setInterval(() => {
      setDice1(Math.floor(Math.random() * 6) + 1)
      setDice2(Math.floor(Math.random() * 6) + 1)
    }, 100)
    setRollInterval(newRollInterval)

    try {
      const userOp = createResolveBetUserOp()
      console.log("Sending resolve bet operation:", userOp)
      await sendResolveBet({ uo: userOp })
    } catch (err) {
      console.error("Failed to create resolve bet operation:", err)
      setError("Failed to resolve bet")
      // Stop animation on error
      if (newRollInterval) {
        clearInterval(newRollInterval)
        setRollInterval(null)
      }
      setIsRolling(false)
      setGameState("betting")
    }
  }

  const resetGame = () => {
    setBetType(null)
    setGameState("betting")
    setLastResult(null)
    setDice1(1)
    setDice2(1)
    setCurrentBet(null)
    setError(null)
    setTransactionHash(null)
    setWinAmount(0)
  }

  const DiceIcon1 = diceIcons[dice1 - 1]
  const DiceIcon2 = diceIcons[dice2 - 1]

  return (
    <div className="flex items-center justify-center p-4 w-full">
      {/* Main Game Card */}
      <div className="w-full max-w-md bg-white/90 backdrop-blur-lg border border-gray-200 rounded-xl shadow-2xl text-gray-800">
        {/* Header */}
        <div className="text-center p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-btn-primary to-fg-accent-brand-light bg-clip-text text-transparent mb-3">
            Seven Up Seven Down
          </h1>
          <div className="flex items-center justify-center gap-2">
            <Coins className="w-5 h-5" style={{ color: "#E82594" }} />
            <span className="text-xl font-semibold">
              {client?.account?.address ? "Connected" : "Connect Wallet"}
            </span>
          </div>
        </div>

        {/* Game Content */}
        <div className="p-6 space-y-6">
          {/* Dice Display */}
          <div className="flex justify-center items-center gap-4">
            <div
              className={`p-4 rounded-xl bg-gray-100 border-2 border-gray-200 transition-transform duration-200 ${
                isRolling ? "animate-bounce shadow-lg" : ""
              }`}
              style={{ boxShadow: isRolling ? "0 10px 25px rgba(232, 37, 148, 0.3)" : "" }}
            >
              <DiceIcon1 className="w-12 h-12" style={{ color: "#E82594" }} />
            </div>
            <div className="text-3xl font-bold">+</div>
            <div
              className={`p-4 rounded-xl bg-gray-100 border-2 border-gray-200 transition-transform duration-200 ${
                isRolling ? "animate-bounce shadow-lg" : ""
              }`}
              style={{ boxShadow: isRolling ? "0 10px 25px rgba(232, 37, 148, 0.3)" : "" }}
            >
              <DiceIcon2 className="w-12 h-12" style={{ color: "#E82594" }} />
            </div>
          </div>

          {/* Sum Display */}
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">{diceSum}</div>
            {gameState === "result" && (
              <div
                className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-semibold text-white`}
                style={{ backgroundColor: lastResult === "win" ? "#E82594" : "#ef4444" }}
              >
                {lastResult === "win" ? `You Won!` : `You Lost`}
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="text-center p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Current Bet Status */}
          {currentBet && !currentBet.resolved && (
            <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div></div>
                <p className="text-sm font-bold text-blue-900">🎲 ACTIVE BET</p>
                <button
                  onClick={loadBetData}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                  title="Refresh bet status"
                >
                  ↻
                </button>
              </div>
              <p className="text-lg font-semibold text-blue-800">
                {currentBet.option === GameOptions.Down ? "Under 7" : 
                 currentBet.option === GameOptions.Seven ? "Exactly 7" : "Over 7"}
              </p>
              <p className="text-xs text-blue-600 mt-1">Click &quot;Roll Dice!&quot; to resolve</p>
            </div>
          )}

          {/* Placing Bet Status */}
          {isPlacingBet && (
            <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-800">Placing bet...</p>
            </div>
          )}

          {/* Betting Interface */}
          {(gameState === "betting" || gameState === "placing") && (!currentBet || currentBet.resolved) && !isPlacingBet && (
            <div className="space-y-4">

              {/* Bet Type Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-center">Choose Your Bet</label>
                <div className="grid grid-cols-1 gap-2">
                  {/* Under 7 */}
                  <button
                    onClick={() => handlePlaceBet("under")}
                    disabled={!client || isPlacingBet}
                    className={`flex items-center justify-between p-4 rounded-lg font-medium transition-all duration-200 ${
                      isPlacingBet
                        ? "opacity-50 cursor-not-allowed bg-gray-200"
                        : "bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 hover:shadow-lg"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4" />
                      Under 7
                    </div>
                    <span className="text-xs font-bold">2x</span>
                  </button>

                  {/* Exactly 7 */}
                  <button
                    onClick={() => handlePlaceBet("exact")}
                    disabled={!client || isPlacingBet}
                    className={`flex items-center justify-between p-4 rounded-lg font-medium transition-all duration-200 ${
                      isPlacingBet
                        ? "opacity-50 cursor-not-allowed bg-gray-200"
                        : "bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 hover:shadow-lg"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Exactly 7
                    </div>
                    <span className="text-xs font-bold">5x</span>
                  </button>

                  {/* Over 7 */}
                  <button
                    onClick={() => handlePlaceBet("over")}
                    disabled={!client || isPlacingBet}
                    className={`flex items-center justify-between p-4 rounded-lg font-medium transition-all duration-200 ${
                      isPlacingBet
                        ? "opacity-50 cursor-not-allowed bg-gray-200"
                        : "bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 hover:shadow-lg"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Over 7
                    </div>
                    <span className="text-xs font-bold">2x</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* Resolve Bet Button */}
          {currentBet && !currentBet.resolved && (gameState === "betting" || gameState === "resolving") && (
            <div className="text-center">
              <button
                onClick={handleResolveBet}
                disabled={isResolvingBet}
                className={`w-full py-3 px-6 rounded-lg font-bold text-lg transition-all duration-200 ${
                  isResolvingBet 
                    ? "bg-gray-400 cursor-not-allowed opacity-50 text-white" 
                    : "text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                }`}
                style={isResolvingBet ? {} : { backgroundColor: "#E82594" }}
              >
                {isResolvingBet ? "Rolling..." : "Roll Dice!"}
              </button>
            </div>
          )}

          {/* Transaction Link */}
          {transactionHash && client && (
            <div className="text-center">
              <a
                href={getTransactionUrl(client, transactionHash) || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                View Transaction
              </a>
            </div>
          )}

          {/* Reset Game Button */}
          {gameState === "result" && (
            <div className="text-center space-y-4">
              <button
                onClick={resetGame}
                className="text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                style={{ backgroundColor: "#E82594" }}
              >
                Play Again
              </button>
            </div>
          )}

          {/* Game Rules */}
          <div className="text-xs text-gray-500 text-center space-y-1 border-t border-gray-200 pt-4">
            <div>Under 7 & Over 7: 2x payout</div>
            <div>Exactly 7: 5x payout</div>
          </div>
        </div>
      </div>
    </div>
  )
}

