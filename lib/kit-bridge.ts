import { PublicKey, TransactionInstruction, VersionedTransaction, TransactionMessage } from "@solana/web3.js"

type KitAccount = { address: string | { toString(): string }; role: number }

export function kitInstructionToWeb3(ix: {
  programAddress: string | { toString(): string }
  accounts: KitAccount[]
  data: Uint8Array
}) {
  const programId = new PublicKey(String(ix.programAddress))
  const keys = ix.accounts.map((a) => {
    const role = a.role
    const isSigner = role === 2 || role === 3 // READONLY_SIGNER | WRITABLE_SIGNER
    const isWritable = role === 1 || role === 3 // WRITABLE | WRITABLE_SIGNER
    return { pubkey: new PublicKey(String(a.address)), isSigner, isWritable }
  })
  return new TransactionInstruction({ programId, keys, data: new Uint8Array(ix.data) })
}

export async function sendWeb3Instruction(args: {
  connection: import("@solana/web3.js").Connection
  payer: PublicKey
  instruction: TransactionInstruction
  walletSend: (tx: VersionedTransaction) => Promise<string>
}) {
  const { connection, payer, instruction, walletSend } = args
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
  const messageV0 = new TransactionMessage({ payerKey: payer, recentBlockhash: blockhash, instructions: [instruction] }).compileToV0Message()
  const tx = new VersionedTransaction(messageV0)
  const sig = await walletSend(tx)
  try {
    await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "finalized")
  } catch (e) {
    console.warn("Transaction confirmation failed", e)
  }
  return sig
}
