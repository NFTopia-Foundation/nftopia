<p align="center">
  <img src="nftopia-frontend/public/nftopia-04.svg" alt="NFTopia" width="420" />
</p>

# NFTopia

NFTopia is a revolutionary decentralized platform for NFT storage, management, and trading built on the Stellar blockchain. It empowers creators and collectors to securely mint, store, showcase, and trade unique digital assets directly on-chain, leveraging Stellar's fast, low-cost transactions and Soroban smart contracts for scalability and security. By integrating seamless wallet connections and a user-friendly interface, NFTopia eliminates intermediaries, ensuring transparency, immutability, and global accessibility for NFTs.

Designed for artists, developers, and enthusiasts in the Web3 space, NFTopia simplifies the entire NFT lifecycle—from minting to marketplace auctions—while supporting cross-chain interoperability. Whether you're a creator launching a collection or a collector discovering rare assets, the platform prioritizes ease of use, self-custody, and community-driven features to foster a vibrant digital economy.

## Features

### Core
- **Secure On-Chain Storage**: Store NFTs immutably on Stellar, with metadata and ownership verified via Soroban contracts.
- **Integrated NFT Minting**: One-click minting interface for creating NFTs with custom royalties and attributes.
- **NFT Management**: Full control over your collection, including transfers, burns, and metadata updates.
- **Marketplace Integration**: Browse, list, auction, and sell NFTs in a dynamic, fee-optimized marketplace.

### Advanced
- **Auction & Bidding**: Time-bound auctions with automated settlements using Stellar's sub-second finality.
- **Analytics Dashboard**: Real-time insights into sales, trends, and portfolio performance via integrated event tracking.
- **Mobile Accessibility**: Native apps for iOS and Android to manage NFTs on the go.
- **Notifications & Payments**: Automated alerts and seamless Stellar-based payments for bids and sales.

## Tech Stack
- **Frontend**: Next.js 15, Tailwind CSS, ShadCN (reusable UI components).
- **Backend**: Nest.js (scalable server-side framework), with microservices for marketplace, payments, and notifications.
- **Mobile**: React Native (cross-platform iOS/Android apps).
- **Blockchain**: Stellar SDK (for transactions and queries), Soroban (Rust contracts for NFT logic and escrow).
- **Analytics**: Custom event-tracking with Kafka and BullMQ for job queuing.
- **Database & Storage**: Supabase (user data and metadata), IPFS (decentralized NFT storage).
- **Monorepo**: pnpm workspaces with TurboRepo for efficient builds and dependency management.

## Repository Structure
NFTopia is organized as a monorepo to streamline development across frontend, backend services, mobile, analytics, and blockchain components. This structure supports independent scaling of microservices while sharing common utilities.

```
nftopia/
├── nftopia-frontend/ 
├── nftopia-backend/ 
├── nftopia-marketplace-service/  # Handles NFT listings, auctions, and trades
├── nftopia-mobile-app/           # React Native app for mobile users
├── nftopia-notification-service/ # Push/email notifications for events
├── nftopia-payment-service/      # Stellar-integrated payment processing
├── nftopia-stellar/ # Soroban Rust contracts and Stellar SDK utils
├── nftopia_analytics/                # Event tracking, dashboards, and Kafka integration
├── nftopia-starknet/                 # Legacy contracts (built with Cairo for Starknet)
├── packages/                         # Shared utilities (e.g., UI components, Stellar helpers)
├── .pnpm-workspace.yaml              # Workspace configuration for pnpm
├── turbo.json                        # Build and dev pipelines
├── Dockerfile                        # Containerization for services
└── vercel.json / railway.json        # Deployment configs
```

## Setup Instructions

### Prerequisites
Before diving in, install these essentials:
- Node.js 18+ ([nodejs.org](https://nodejs.org)).
- pnpm (for monorepo; install via `npm install -g pnpm`).
- Rust toolchain (for Soroban contracts; via [rustup.rs](https://rustup.rs)).
- Stellar wallet (e.g., Freighter; [freighter.app](https://freighter.app)).
- Supabase account (free tier; [supabase.com](https://supabase.com)) for database setup.
- Docker (for containerized services; [docker.com](https://docker.com)).
- Git (for cloning).

### Installation
1. Fork and clone the repository:
   ```
   git clone https://github.com/your-username/nftopia.git
   cd nftopia
   ```

2. Install dependencies across the workspace:
   ```
   pnpm install
   ```

### Environment Setup
1. Create a Supabase project and note your `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
2. Copy `.env.example` to `.env` in the root and configure:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   STELLAR_NETWORK=testnet  # Switch to 'mainnet' for production
   FRIENDBOT_URL=https://friendbot.stellar.org  # For testnet funding
   ```
3. For blockchain: Fund your testnet wallet at [laboratory.stellar.org](https://laboratory.stellar.org). Set up Soroban CLI for contract deployment.
4. For services: Add service-specific vars (e.g., Kafka brokers in `apps/nftopia-notification-service/.env`).

### Running Locally
1. Start the monorepo dev environment:
   ```
   pnpm turbo run dev
   ```
   - This launches frontend (`http://localhost:3000`), backend services (`http://localhost:9000`), and prepares mobile/contracts.
2. For individual services:
   - Marketplace: `cd apps/nftopia-marketplace-service && pnpm dev`
   - Mobile: `cd apps/nftopia-mobile-app && npx react-native run-ios` (or `run-android`)
   - Contracts: `cd apps/nftopia-stellar && cargo test` (then deploy via `soroban contract deploy --network testnet`)
3. Access the frontend at [http://localhost:3000](http://localhost:3000) and connect your wallet to test minting.

### Testing
Validate your setup with comprehensive tests:
1. Run linting and type-checks:
   ```
   pnpm turbo run lint
   pnpm turbo run type-check
   ```
2. Execute unit/integration tests:
   ```
   pnpm turbo run test
   ```
   - Includes Jest for JS/TS, Cargo for Rust contracts.
3. End-to-end tests (e.g., Playwright for frontend):
   ```
   pnpm turbo run test:e2e
   ```
   Tests assume a testnet wallet; see service-specific READMEs for mocks.

### Deployment
Deploy components independently for flexibility:

1. **Frontend & Backend Services (Vercel/Railway)**:
   - Link GitHub repo to Vercel (frontend) or Railway (services) dashboards.
   - Add env vars (e.g., Supabase, Stellar network).
   - Pushes to `main` auto-deploy; configure custom domains as needed.

2. **Mobile (Expo)**:
   - `cd apps/nftopia-mobile-app && expo publish` for OTA updates.
   - Build for stores: `expo build:ios` / `expo build:android`.

3. **Contracts (Soroban)**:
   - Use CI/CD (GitHub Actions) in `apps/nftopia-stellar`.
   - Deploy: `soroban contract deploy --network mainnet --wasm target/soroban/nftopia.wasm`.
   - Verify on Stellar's explorer.

For production, set `STELLAR_NETWORK=mainnet`, run security audits on contracts, and monitor via analytics service. Advanced CI/CD pipelines are in `DEPLOYMENT.md`.

## Usage
1. **Mint an NFT**: Connect wallet in the app → upload metadata → confirm Soroban transaction.
2. **List for Sale/Auction**: In marketplace → select NFT → set price/bid rules → publish.
3. **Trade & Collect**: Browse listings → bid/buy → funds settle instantly on Stellar.
4. **Manage Portfolio**: Dashboard for viewing analytics, notifications, and transfers.

Figma designs: [View here](https://www.figma.com/file/YOUR-FIGMA-LINK) for UI guidance.

## Contributing
We love contributions to make NFTopia even better! Here's how to get involved:

- **Report Issues**: Open a GitHub Issue with steps to reproduce, env details, and logs.
- **Propose Features**: Use Discussions to brainstorm—align before coding.
- **Submit PRs**:
  1. Fork and branch: `git checkout -b feature/your-feature`.
  2. Code, test, and lint changes.
  3. Commit conventionally (e.g., "feat: add auction bidding").
  4. Push and PR to `main`; reference issues.
- **Monorepo Tips**:
  - Build affected packages: `pnpm turbo run build --filter=...`.
  - Update shared deps sparingly; use `changeset` for versioning.

Adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). All commits require DCO sign-off.

## License
MIT License. See [LICENSE](LICENSE) for details.

## Support & Community
- Join our Discord: [discord.gg/nftopia](https://discord.gg/nftopia) for chats and support.
- Follow [@nftopia](https://x.com/nftopia) on X for updates.
- Questions? Tag maintainers (@Oluwaseyi89, @Cedarich) in issues.

Built with ❤️ by the NFTopia team. Powered by Stellar. 🚀
