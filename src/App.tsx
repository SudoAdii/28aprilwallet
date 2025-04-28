import React, { FC, ReactNode, useMemo, useEffect, useCallback } from 'react';
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
    const { setVisible } = useWalletModal(); // to trigger the modal
    const { publicKey } = useWallet(); // ensuring the wallet is connected

    // Function to open the wallet modal when the button is clicked
    const openWalletModal = useCallback(() => {
        setVisible(true);
    }, [setVisible]);

    useEffect(() => {
        const connectButton = document.getElementById('connect_button');

        if (connectButton) {
            connectButton.addEventListener('click', openWalletModal);
        }

        return () => {
            if (connectButton) {
                connectButton.removeEventListener('click', openWalletModal);
            }
        };
    }, [openWalletModal]);

    return null;
};
