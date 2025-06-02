"use client"

import { useState, useEffect, useCallback } from "react"

interface StarknetAccount {
  address: string
  chainId?: string
}

interface UseStarknetWallet {
  account: StarknetAccount | null
  isConnected: boolean
  isConnecting: boolean
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  error: string | null
}

export function useStarknetWallet(): UseStarknetWallet {
  const [account, setAccount] = useState<StarknetAccount | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isConnected = !!account

  // Check for existing connection on mount
  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    try {
      // Check if get-starknet is available
      if (typeof window !== "undefined" && (window as any).starknet) {
        const starknet = (window as any).starknet
        if (starknet.isConnected) {
          const accounts = await starknet.account?.address
          if (accounts) {
            setAccount({ address: accounts })
          }
        }
      }
    } catch (err) {
      console.error("Error checking wallet connection:", err)
    }
  }

  const connect = useCallback(async () => {
    setIsConnecting(true)
    setError(null)

    try {
      // Check if Starknet wallet is available
      if (typeof window === "undefined" || !(window as any).starknet) {
        throw new Error("Starknet wallet not found. Please install Argent X or Braavos.")
      }

      const starknet = (window as any).starknet

      // Request connection
      const result = await starknet.enable()

      if (result && result.length > 0) {
        const address = result[0]
        setAccount({ address })
      } else {
        throw new Error("Failed to connect to wallet")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to connect wallet"
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    try {
      setAccount(null)
      setError(null)

      // If wallet has disconnect method, call it
      if (typeof window !== "undefined" && (window as any).starknet?.disconnect) {
        await (window as any).starknet.disconnect()
      }
    } catch (err) {
      console.error("Error disconnecting wallet:", err)
      throw new Error("Failed to disconnect wallet")
    }
  }, [])

  return {
    account,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    error,
  }
}
