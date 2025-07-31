# NFTopia On-Chain

NFTopia On-Chain is the **smart contract foundation** of the NFTopia platform, built with **Cairo v2.9.2** for the Starknet network. This repository contains all blockchain-level logic for NFT management, minting, and marketplace operations.

---

## 🔗 Contract Documentation  
[View Starknet Book Reference](https://book.starknet.io/) | [Cairo Documentation](https://www.cairo-lang.org/docs/)

---

## ✨ On-Chain Features  
- **NFT Core Contracts**: ERC-721/ERC-1155 compatible implementations  
- **Minting Logic**: Configurable minting workflows with royalties  
- **Marketplace Protocol**: Secure trading with escrow mechanisms  
- **Upgradeability**: Smart contract migration patterns  
- **Gas Optimization**: Starknet-specific efficiency improvements  

---

## 🛠️ Tech Stack  
| Component           | Technology                                                                 |
|---------------------|---------------------------------------------------------------------------|
| Language           | [Cairo v2.9.2](https://www.cairo-lang.org/)                              |
| Development Kit    | [Starknet Foundry](https://foundry-rs.github.io/starknet-foundry/)       |
| Testing            | [Starknet.js](https://www.starknetjs.com/) + [Pytest](https://docs.pytest.org/) |
| Deployment         | [Starknet CLI](https://www.starknet.io/documentation/tools/)             |

---

## 🚀 Quick Start  

### Prerequisites  
- Rust 1.70+  
- Starknet Foundry (`snforge`, `sncast`)  
- Python 3.9+ (for testing)  
- Starknet wallet (ArgentX/Braavos)  

### Installation  
1. **Clone the repo**:  
   ```bash
   git clone https://github.com/NFTopia-Foundation/nftopia.git
   cd on-chain
   ```
2. Setup environment:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies:
   ```bash
   scarb build  # Cairo package manager
   ```
4. Run tests:
   ```bash
   snforge test
   ```
## 🤝 Contributing

1. Fork the repository
2. Create your feature branch:
```bash
git checkout -b feat/your-feature
```
3. Commit changes following Conventional Commits
4. Push to the branch
5. Open a Pull Request
