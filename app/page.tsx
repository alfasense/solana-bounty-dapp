"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { useEffect, useState } from "react";

interface Bounty {
  id: number;
  title: string;
  description: string;
  rewardSol: number;
  author: string;
  claimed: boolean;
}

export default function Home() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");

  // Sample bounties
  const [bounties, setBounties] = useState<Bounty[]>([
    {
      id: 1,
      title: "Fix Next.js Wallet Modal Styling",
      description: "Ensure the Phantom popup modal matches dark mode themes across mobile devices.",
      rewardSol: 0.1,
      author: "7xKX...3b9A",
      claimed: false,
    },
    {
      id: 2,
      title: "Build Solana Devnet Faucet Component",
      description: "Create an in-app button that triggers connection.requestAirdrop for connected wallets.",
      rewardSol: 0.25,
      author: "9pQR...1m4Z",
      claimed: false,
    },
  ]);

  // Fetch balance
  useEffect(() => {
    if (!publicKey) {
      setBalance(null);
      return;
    }

    connection.getBalance(publicKey).then((lamports) => {
      setBalance(lamports / LAMPORTS_PER_SOL);
    });
  }, [publicKey, connection]);

  // Handle adding a bounty
  const handleCreateBounty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !reward || !publicKey) return;

    const newBounty: Bounty = {
      id: Date.now(),
      title,
      description,
      rewardSol: parseFloat(reward),
      author: `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`,
      claimed: false,
    };

    setBounties([newBounty, ...bounties]);
    setTitle("");
    setDescription("");
    setReward("");
  };

  // Handle funding/claiming a bounty on-chain
  const handleFundBounty = async (bountyId: number, amountSol: number) => {
    if (!publicKey) return;

    try {
      // 1. Fetch latest blockhash and valid block height
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

      // 2. Build transaction with recent blockhash and fee payer
      const transaction = new Transaction({
        feePayer: publicKey,
        recentBlockhash: blockhash,
      }).add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey, // Sends back to self for testing
          lamports: amountSol * LAMPORTS_PER_SOL,
        })
      );

      // 3. Send transaction via wallet
      const signature = await sendTransaction(transaction, connection);

      // 4. Confirm transaction using blockhash strategy
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      setBounties(
        bounties.map((b) => (b.id === bountyId ? { ...b, claimed: true } : b))
      );
      
      // Update displayed balance after successful transaction
      const newLamports = await connection.getBalance(publicKey);
      setBalance(newLamports / LAMPORTS_PER_SOL);

      alert(`Transaction successful! Hash: ${signature}`);
    } catch (err) {
      console.error(err);
      alert("Transaction failed or rejected.");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8 bg-slate-900 text-white gap-8">
      <header className="text-center max-w-2xl">
        <h1 className="text-4xl font-extrabold text-purple-400 mb-2">Solana Developer Bounty Portal</h1>
        <p className="text-slate-400">Post tasks, fund rewards, and submit work on Solana Devnet.</p>
      </header>

      {/* Wallet Connection Header */}
      <div className="flex flex-col items-center gap-4 bg-slate-800 p-6 rounded-xl border border-slate-700 w-full max-w-2xl">
        <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
        {publicKey ? (
          <div className="text-center">
            <p className="text-xs text-slate-400">Connected Public Key:</p>
            <p className="font-mono text-sm text-purple-300">{publicKey.toBase58()}</p>
            <p className="text-md mt-1 font-semibold">
              Balance: {balance !== null ? `${balance} SOL` : "Loading..."}
            </p>
          </div>
        ) : (
          <p className="text-slate-400 text-sm">Please connect your Phantom Devnet wallet.</p>
        )}
      </div>

      {publicKey && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          {/* Create Bounty Form */}
          <form onSubmit={handleCreateBounty} className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col gap-4">
            <h2 className="text-xl font-bold text-purple-300">Post a New Bounty</h2>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Integrate Pyth Price Feeds"
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe the deliverables..."
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-purple-500"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Reward (SOL)</label>
              <input
                type="number"
                step="0.05"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                placeholder="0.1"
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-purple-500"
                required
              />
            </div>
            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded transition-colors mt-2"
            >
              Post Bounty
            </button>
          </form>

          {/* Active Bounties List */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-purple-300">Open Bounties</h2>
            {bounties.length === 0 ? (
              <p className="text-slate-500">No bounties posted yet.</p>
            ) : (
              bounties.map((bounty) => (
                <div key={bounty.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-md text-white">{bounty.title}</h3>
                      <span className="bg-purple-900/60 text-purple-300 text-xs px-2 py-1 rounded font-mono border border-purple-700">
                        {bounty.rewardSol} SOL
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{bounty.description}</p>
                    <p className="text-[10px] text-slate-500 mt-2 font-mono">Posted by: {bounty.author}</p>
                  </div>
                  <button
                    onClick={() => handleFundBounty(bounty.id, bounty.rewardSol)}
                    disabled={bounty.claimed}
                    className={`w-full text-xs font-semibold py-2 rounded transition-colors ${
                      bounty.claimed
                        ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                  >
                    {bounty.claimed ? "Completed / Claimed" : "Fund / Claim Task"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </main>
  );
}