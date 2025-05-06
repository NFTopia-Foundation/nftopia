import subprocess
from getpass import getpass

# === CONFIGURATION ===
account_path = "~/.starkli-accounts/my-oz-account.json"
keystore_path = "~/.starkli-wallets/my-keystore.json"
network = "sepolia"
fee_token = "strk"
contract_class_path = "/home/seyi/Documents/deployment_example/target/dev/deployment_example_HelloStarknet.contract_class.json"

# === Get password securely ===
keystore_password = getpass("Enter keystore password: ")

# === Declare command ===
declare_cmd = [
    "starkli", "declare",
    "--account", account_path,
    "--keystore", keystore_path,
    "--network", network,
    "--fee-token", fee_token,
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
    "--fee-token", fee_token,
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

# class hash: 0x020b7bca19d3c12d1e846a2a2e625df14b570056325905eaf06e76dd4e362e84
# deploy address: 0x0399520dc7c9b4d8ea0d54d69a69f33fbe4a5e2d75e26a11fe790065e752e206
