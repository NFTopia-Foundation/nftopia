import subprocess
from getpass import getpass

# === CONFIGURATION ===
account_path = "~/.starkli-accounts/nftopia_account2.json"
keystore_path = "~/.starkli-wallets/nftopia_wallet2.json"
network = "sepolia"
fee_token = "strk"
contract_class_path = "/home/seyi/Documents/nftopia/nftopia/on-chain/abi/nftopia_TransactionModule.contract_class.json"

# === Get password securely ===
keystore_password = getpass("Enter keystore password: ")

# === Declare command ===
declare_cmd = [
    "starkli", "declare",
    "--account", account_path,
    "--keystore", keystore_path,
    "--network", network,
    # "--fee-token", fee_token,
    contract_class_path
]

# Run declare and capture output
print("\nDeclaring contract...")
declare_proc = subprocess.run(
    declare_cmd,
    input=keystore_password + "\n",
    text=True,
    capture_output=True
)

if declare_proc.returncode != 0:
    print("❌ Declare failed:\n", declare_proc.stderr)
    exit(1)

print("✅ Declare successful:\n", declare_proc.stdout)

# === Extract class hash from output (optional) ===
# You may need to parse declare_proc.stdout to extract class hash if needed

# === Deploy command ===
class_hash = input("\nPaste the declared class hash to deploy: ").strip()

deploy_cmd = [
    "starkli", "deploy",
    "--account", account_path,
    "--keystore", keystore_path,
    "--network", network,
    # "--fee-token", fee_token,
    class_hash
]

# Run deploy
print("\nDeploying contract...")
deploy_proc = subprocess.run(
    deploy_cmd,
    input=keystore_password + "\n",
    text=True,
    capture_output=True
)

if deploy_proc.returncode != 0:
    print("❌ Deploy failed:\n", deploy_proc.stderr)
    exit(1)

print("✅ Deploy successful:\n", deploy_proc.stdout)


