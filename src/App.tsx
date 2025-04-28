import React, { FC, ReactNode, useMemo, useEffect } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, useWalletModal } from '@solana/wallet-adapter-react-ui';
import {
    GlowWalletAdapter,
    LedgerWalletAdapter,
    PhantomWalletAdapter,
    SlopeWalletAdapter,
    SolflareWalletAdapter,
    SolletExtensionWalletAdapter,
    SolletWalletAdapter,
    TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';

import '../src/css/bootstrap.css';
import './App.css';
import '@solana/wallet-adapter-react-ui/styles.css';

const App: FC = () => {
    return (
        <Context>
            <Content />
        </Context>
    );
};

export default App;

const Context: FC<{ children: ReactNode }> = ({ children }) => {
    const network = WalletAdapterNetwork.Mainnet; // or 'devnet' if you prefer
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    const wallets = useMemo(
        () => [
            new LedgerWalletAdapter(),
            new PhantomWalletAdapter(),
            new GlowWalletAdapter(),
            new SlopeWalletAdapter(),
            new SolletExtensionWalletAdapter(),
            new SolletWalletAdapter(),
            new SolflareWalletAdapter({ network }),
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

const Content: FC = () => {
    const { setVisible } = useWalletModal();
    const { wallets } = useWallet(); // Ensure wallets are loaded

    useEffect(() => {
        const connectButton = document.getElementById('connect_button');

        const openWalletModal = () => {
            if (wallets.length > 0) {
                setVisible(true);
            } else {
                console.error("Wallet adapters not ready yet.");
            }
        };

        connectButton?.addEventListener('click', openWalletModal);

        return () => {
            connectButton?.removeEventListener('click', openWalletModal);
        };
    }, [setVisible, wallets]);

    return null;
};
