import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

import '../src/css/bootstrap.css';
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
import React, { FC, ReactNode, useMemo, useEffect } from 'react';

require('./App.css');
require('@solana/wallet-adapter-react-ui/styles.css');

const App: FC = () => {
    return (
        <Context>
            <Content />
        </Context>
    );
};

export default App;

const Context: FC<{ children: ReactNode }> = ({ children }) => {
    const network = WalletAdapterNetwork.Mainnet;
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

import { useWalletModal } from '@solana/wallet-adapter-react-ui';

const Content: FC = () => {
    const { setVisible } = useWalletModal();

    useEffect(() => {
        const connectButton = document.getElementById('connect_button');

        if (connectButton) {
            connectButton.addEventListener('click', openWalletModal);
        }

        function openWalletModal() {
            setVisible(true);
        }

        return () => {
            if (connectButton) {
                connectButton.removeEventListener('click', openWalletModal);
            }
        };
    }, [setVisible]);

    return null; // nothing visible inside React (only the WalletModal will show when button clicked)
};
